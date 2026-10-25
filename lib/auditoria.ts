import type { Fragment, Sql } from "postgres";
import { COURIERS, fono } from "./central.ts";

// Auditoría tab (admin summary): one row per order with everything that happened to it, read from `registro`.
// A registro row reaches an order through its own table: the order itself, its sales and payments (also the ones
// that left it or were deleted: the log kept their pedido_id), and its client / shipping address while it was open.

// ---------- search box: free text plus pedido: cliente: usuario: estado: ----------
export const CLAVES = ["pedido", "cliente", "usuario", "estado"] as const;
type Clave = (typeof CLAVES)[number];
export type Busqueda = { texto: string[] } & Partial<Record<Clave, string[]>>;

// `cliente:"cami rojas" maria estado:pagada` -> { cliente: ["cami rojas"], texto: ["maria"], estado: ["pagada"] }
export function parseBusqueda(q: string): Busqueda {
  const b: Busqueda = { texto: [] };
  for (const m of q.matchAll(/(?:(\w+):)?(?:"([^"]*)"|(\S+))/g)) {
    const valor = (m[2] ?? m[3] ?? "").trim();
    if (!valor) continue;
    const clave = m[1]?.toLowerCase() as Clave | undefined;
    if (clave && CLAVES.includes(clave)) (b[clave] ??= []).push(valor);
    else b.texto.push(m[1] ? `${m[1]}:${valor}` : valor); // unknown key: plain text
  }
  return b;
}

export const ORDENES = ["cambio", "pedido", "cliente", "total"] as const;
export type Orden = (typeof ORDENES)[number];
export const POR_PAGINA = 50;

const like = (s: string) => "%" + s.replace(/[%_\\]/g, "\\$&") + "%";

// every registro row tied to the order(s) it belongs to: (registro columns..., pedido_id, codigo)
// ponytail: rebuilt from the whole log on every query; fine for years of a boutique's volume,
// write pedido_id into registro from the trigger if it ever gets slow
const eventos = (q: Sql) => q`
  venta_pedido as (
    select id, pedido_id from ventas where pedido_id is not null
    union select fila_id, (cambios->'pedido_id'->>'antes')::int from registro
      where tabla = 'ventas' and accion = 'update' and cambios->'pedido_id'->>'antes' is not null
    union select fila_id, (cambios->'pedido_id'->>'despues')::int from registro
      where tabla = 'ventas' and accion = 'update' and cambios->'pedido_id'->>'despues' is not null
  ),
  pago_pedido as (
    select id, pedido_id from pagos
    union select fila_id, (cambios->>'pedido_id')::int from registro where tabla = 'pagos' and accion <> 'update'
  ),
  eventos as (
    select r.*, p.id pedido_id from registro r join pedidos p on r.tabla = 'pedidos' and r.fila_id = p.id
    union all
    select r.*, vp.pedido_id from registro r join venta_pedido vp on r.tabla = 'ventas' and r.fila_id = vp.id
    union all
    select r.*, pp.pedido_id from registro r join pago_pedido pp on r.tabla = 'pagos' and r.fila_id = pp.id
    union all
    select r.*, p.id from registro r join pedidos p
      on r.tabla = 'clientes' and r.fila_id = p.cliente_id and r.en between p.creado_en and coalesce(p.cerrado_en, 'infinity')
    union all
    select r.*, p.id from registro r join pedidos p
      on r.tabla = 'direcciones_envio' and r.fila_id = p.direccion_envio_id and r.en between p.creado_en and coalesce(p.cerrado_en, 'infinity')
  )`;

export type FilaPedido = {
  id: number;
  nick: string;
  nombre_completo: string | null;
  telefono: string | null;
  estado: string | null; // the least advanced live sale; null: no sales left
  total: number;
  usuarios: string[];
  ultimo_usuario: string | null;
  ultimo_en: Date;
};

export async function listarPedidos(
  q: Sql,
  b: Busqueda,
  orden: Orden,
  asc: boolean,
  pagina: number,
): Promise<{ filas: FilaPedido[]; hayMas: boolean }> {
  const conds: Fragment[] = [];
  for (const t of b.texto) {
    const digitos = t.replace(/\D/g, "");
    conds.push(q`(x.nick ilike ${like(t)} or x.nombre_completo ilike ${like(t)}
      or x.id::text = ${t.replace(/^#/, "")}
      or exists (select from unnest(x.usuarios) u where u ilike ${like(t)})
      ${digitos.length >= 3 ? q`or x.telefono like ${like(digitos)}` : q``})`);
  }
  for (const p of b.pedido ?? []) {
    const n = Number(p.replace(/^#/, ""));
    conds.push(Number.isInteger(n) ? q`x.id = ${n}` : q`false`);
  }
  for (const c of b.cliente ?? []) {
    const digitos = c.replace(/\D/g, "");
    conds.push(q`(x.nick ilike ${like(c)} or x.nombre_completo ilike ${like(c)}
      ${digitos.length >= 3 ? q`or x.telefono like ${like(digitos)}` : q``})`);
  }
  for (const u of b.usuario ?? [])
    conds.push(
      q`exists (select from unnest(x.usuarios) u where u ilike ${like(u)})`,
    );
  for (const e of b.estado ?? [])
    conds.push(q`x.estado ilike ${like(e.toLowerCase().replace(/\s+/g, "_"))}`);

  const col = {
    cambio: q`x.ultimo_en`,
    pedido: q`x.id`,
    cliente: q`lower(x.nick)`,
    total: q`x.total`,
  }[orden];
  const filas = await q<FilaPedido[]>`
    with ${eventos(q)},
    resumen as (
      select pedido_id, array_agg(distinct usuario order by usuario) filter (where usuario is not null) usuarios,
             max(en) en
      from eventos group by pedido_id
    ),
    ultimo as (
      select distinct on (pedido_id) pedido_id, usuario from eventos order by pedido_id, en desc, id desc
    )
    select * from (
      select p.id, c.nombre nick, c.nombre_completo, c.telefono,
             (select coalesce(min(v.estado) filter (where v.estado <> 'liberada'), max(v.estado))::text
                from ventas v where v.pedido_id = p.id) estado,
             (select coalesce(sum(v.monto) filter (where v.estado <> 'liberada'), 0)::int
                from ventas v where v.pedido_id = p.id) total,
             coalesce(r.usuarios, '{}') usuarios, u.usuario ultimo_usuario, coalesce(r.en, p.creado_en) ultimo_en
      from pedidos p
      join clientes c on c.id = p.cliente_id
      left join resumen r on r.pedido_id = p.id
      left join ultimo u on u.pedido_id = p.id
    ) x
    ${conds.length ? q`where ${conds.reduce((a, c) => q`${a} and ${c}`)}` : q``}
    order by ${col} ${asc ? q`asc` : q`desc`}, x.id desc
    limit ${POR_PAGINA + 1} offset ${(pagina - 1) * POR_PAGINA}`;
  return {
    filas: filas.slice(0, POR_PAGINA),
    hayMas: filas.length > POR_PAGINA,
  };
}

export type Evento = {
  id: number;
  en: Date;
  tabla: string;
  accion: "insert" | "update" | "delete";
  usuario: string | null;
  cambios: Record<string, unknown>;
  codigo: number | null; // sales: the garment code, also for updates that did not touch it
  monto_pago: number | null; // payments: the amount, also for updates that did not touch it
};

export async function historia(q: Sql, pedido: number): Promise<Evento[]> {
  return q<Evento[]>`
    with ${eventos(q)}
    select e.id, e.en, e.tabla, e.accion, e.usuario, e.cambios,
           case when e.tabla = 'ventas' then coalesce(v.codigo, (e.cambios->>'codigo')::int) end codigo,
           case when e.tabla = 'pagos' then coalesce(pg.monto, (e.cambios->>'monto')::int) end monto_pago
    from eventos e
    left join ventas v on e.tabla = 'ventas' and v.id = e.fila_id
    left join pagos pg on e.tabla = 'pagos' and pg.id = e.fila_id
    where e.pedido_id = ${pedido}
    order by e.en desc, e.id desc`;
}

// ---------- plain words for each event ----------
const clp = (n: unknown) => "$" + Number(n).toLocaleString("es-CL");
const ESTADO_VENTA: Record<string, string> = {
  reservada: "reservada",
  esperando_pago: "esperando pago",
  pagada: "pagada",
  por_empaquetar: "pasó a empaquetar",
  empaquetada: "empaquetada",
  por_enviar: "empaquetada, por enviar",
  enviada: "entregada al courier",
  liberada: "liberada",
  no_habla: "no habla",
  no_se_encuentra: "no se encuentra",
};
export const estadoTexto = (e: string | null) =>
  e ? (ESTADO_VENTA[e] ?? e.replaceAll("_", " ")) : "sin ventas";
const CAMPO: Record<string, string> = {
  nombre: "nick",
  nombre_completo: "nombre",
  telefono: "teléfono",
  direccion: "dirección",
  ciudad: "ciudad",
  rut: "RUT",
  email: "email",
  courier: "courier",
  monto: "precio",
  talla: "talla",
  material: "material",
  detalle: "detalle",
  codigo: "código",
  comprador_texto: "comprador",
};
// bookkeeping columns that the sentence already covers (or nobody needs to read)
const OCULTOS = new Set([
  "id",
  "creado_en",
  "cliente_id",
  "live_id",
  "pedido_id",
  "paquete_id",
  "direccion_envio_id",
  "cerrado_en",
  "estado",
  "validado_en",
  "validado_por",
  "comprobante",
]);
const valor = (k: string, v: unknown) =>
  v === null || v === undefined || v === ""
    ? "—"
    : k === "monto"
      ? clp(v)
      : k === "telefono"
        ? fono(String(v))
        : k === "courier"
          ? (COURIERS.find((c) => c.id === v)?.label ?? String(v))
          : String(v);
type Cambio = { antes: unknown; despues: unknown };
const diff = (c: Record<string, unknown>) =>
  Object.entries(c)
    .filter(([k]) => !OCULTOS.has(k))
    .map(([k, v]) => {
      const { antes, despues } = v as Cambio;
      return `${CAMPO[k] ?? k}: ${valor(k, antes)} → ${valor(k, despues)}`;
    });
const datos = (c: Record<string, unknown>, campos: string[]) =>
  campos
    .filter((k) => c[k] !== null && c[k] !== undefined && c[k] !== "")
    .map((k) => valor(k, c[k]))
    .join(" · ");
const despues = (c: Record<string, unknown>, k: string) =>
  (c[k] as Cambio | undefined)?.despues;

// what happened, without the who/when; `ventas` lists the garment codes when several sales changed together
export function describir(
  e: Evento,
  pedido: number,
  ventas = `#${e.codigo}`,
): string {
  const c = e.cambios;
  const plural = ventas.includes(",") ? "ventas" : "venta";
  switch (e.tabla) {
    case "ventas": {
      if (e.accion === "insert")
        return `registró ${plural} ${ventas} en el live: ${datos(c, ["talla", "material", "monto"])}`;
      if (e.accion === "delete") return `eliminó ${plural} ${ventas}`;
      const partes: string[] = [];
      const ped = c.pedido_id as Cambio | undefined;
      const est = despues(c, "estado") as string | undefined;
      if (est === "liberada") partes.push("liberó la prenda");
      else if (est) partes.push(estadoTexto(est));
      if (ped && Number(ped.despues) === pedido) partes.push("entró al pedido");
      if (ped && Number(ped.antes) === pedido && est !== "liberada")
        partes.push("salió del pedido");
      partes.push(...diff(c));
      return `${plural} ${ventas}: ${partes.join(", ") || "editada"}`;
    }
    case "pagos": {
      const monto = clp(e.monto_pago);
      if (e.accion === "insert") return `subió comprobante por ${monto}`;
      if (e.accion === "delete") return `eliminó comprobante por ${monto}`;
      return despues(c, "validado_en")
        ? `validó pago por ${monto}`
        : `editó pago por ${monto}`;
    }
    case "pedidos": {
      if (e.accion === "insert") return "abrió el pedido";
      const partes: string[] = [];
      if (despues(c, "cerrado_en")) partes.push("pasó el pedido a empaquetar");
      if (c.courier)
        partes.push(`courier: ${valor("courier", despues(c, "courier"))}`);
      if (c.direccion_envio_id) partes.push("asignó la dirección de envío");
      return partes.join(", ") || "editó el pedido";
    }
    case "direcciones_envio":
      return e.accion === "insert"
        ? `datos de envío: ${datos(c, ["direccion", "ciudad", "rut", "email", "telefono"])}`
        : `cambió datos de envío: ${diff(c).join(", ")}`;
    case "clientes":
      return e.accion === "insert"
        ? `creó el cliente ${valor("nombre", c.nombre)}`
        : `cliente: ${diff(c).join(", ")}`;
  }
  return `${e.tabla} ${e.accion}`;
}

// one line per thing that happened: the sales one statement changed together (same transaction time, user and new
// values) become a single line listing their codes
export type Linea = {
  id: number;
  en: Date;
  usuario: string | null;
  texto: string;
};
export function lineas(evs: Evento[], pedido: number): Linea[] {
  const grupos: { e: Evento; clave?: string; codigos: number[] }[] = [];
  for (const e of evs) {
    const clave =
      e.tabla === "ventas" && e.accion === "update"
        ? JSON.stringify([
            +e.en,
            e.usuario,
            Object.entries(e.cambios).map(([k, v]) => [
              k,
              (v as Cambio).despues,
            ]),
          ])
        : undefined;
    const prev = grupos.at(-1);
    if (clave && prev?.clave === clave) prev.codigos.push(e.codigo ?? 0);
    else grupos.push({ e, clave, codigos: [e.codigo ?? 0] });
  }
  return grupos.map(({ e, codigos }) => ({
    id: e.id,
    en: e.en,
    usuario: e.usuario,
    texto: describir(
      e,
      pedido,
      [...new Set(codigos)]
        .sort((a, b) => a - b)
        .map((n) => `#${n}`)
        .join(", "),
    ),
  }));
}
