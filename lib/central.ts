import type postgres from "postgres";

export type Courier = "starken" | "bluex" | "retiro_tienda";
export const COURIERS: { id: Courier; label: string }[] = [
  { id: "starken", label: "Starken" },
  { id: "bluex", label: "BlueExpress" },
  { id: "retiro_tienda", label: "Retiro en tienda" },
];

export type Campo =
  | "nombre_completo"
  | "rut"
  | "email"
  | "telefono_envio"
  | "direccion"
  | "ciudad";
export const ETIQUETA: Record<Campo, string> = {
  nombre_completo: "Nombre completo",
  rut: "RUT",
  email: "Email",
  telefono_envio: "Teléfono de envío",
  direccion: "Dirección",
  ciudad: "Ciudad",
};
// what each courier's label needs
export const REQUERIDOS: Record<Courier, Campo[]> = {
  starken: ["nombre_completo", "rut", "direccion", "email", "ciudad"],
  bluex: ["nombre_completo", "direccion", "telefono_envio", "ciudad"],
  retiro_tienda: [],
};

export type VentaB = {
  id: number;
  codigo: number;
  monto: number;
  talla: string | null;
  material: string | null;
  detalle: string | null;
  estado: string;
  creado_en: Date;
  live: string | null;
};
export type Pago = {
  id: number;
  monto: number;
  comprobante: string | null;
  validado: boolean;
  validado_por: string | null; // NULL on payments validated before it was recorded
};
export type Dir = {
  id: number;
  rut: string | null;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  ciudad: string | null;
};
export type Tarjeta = {
  cliente: {
    id: number;
    nombre: string;
    telefono: string | null;
    nombre_completo: string | null;
  };
  ventas: VentaB[];
  total: number;
  pedido: { id: number; courier: Courier | null } | null;
  pagos: Pago[];
  dir: Dir | null;
  pagado: number; // validated money
  faltantes: string[];
};

export function calcFaltantes(
  t: Pick<Tarjeta, "cliente" | "pagos" | "total" | "pagado" | "dir"> & {
    courier: Courier | null;
  },
) {
  const f: string[] = [];
  if (!t.pagos.length) f.push("Comprobante de transferencia");
  else if (!t.pagos.some((p) => p.validado)) f.push("Validar el comprobante");
  else if (t.pagado < t.total)
    f.push(`Falta pago de $${(t.total - t.pagado).toLocaleString("es-CL")}`);
  if (!t.courier) f.push("Elegir courier");
  else {
    const datos: Record<Campo, string | null | undefined> = {
      nombre_completo: t.cliente.nombre_completo,
      rut: t.dir?.rut,
      email: t.dir?.email,
      telefono_envio: t.dir?.telefono,
      direccion: t.dir?.direccion,
      ciudad: t.dir?.ciudad,
    };
    for (const c of REQUERIDOS[t.courier])
      if (!datos[c]?.trim()) f.push(ETIQUETA[c]);
  }
  return f;
}

const PENDIENTE = ["reservada", "esperando_pago", "pagada"];

// ponytail: only sales from lives started in the app (inicio not null); the imported Excel history is not central work
export async function cargar(
  q: postgres.Sql,
  soloCliente?: number,
): Promise<Tarjeta[]> {
  const ventas = await q<(VentaB & { cliente_id: number })[]>`
    select v.id, v.codigo, coalesce(v.monto,0)::int monto, v.talla, v.material, v.detalle, v.estado::text,
           v.creado_en, v.cliente_id, coalesce(l.vendedores, l.nombre) live
    from ventas v join lives l on l.id = v.live_id
    where v.estado::text in ${q(PENDIENTE)} and v.cliente_id is not null and l.inicio is not null
      ${soloCliente ? q`and v.cliente_id = ${soloCliente}` : q``}
    order by v.creado_en`;
  const ids = [...new Set(ventas.map((v) => v.cliente_id))];
  if (!ids.length) return [];

  const [clientes, pedidos, dirs] = await Promise.all([
    q`select id, nombre, telefono, nombre_completo from clientes where id in ${q(ids)}`,
    q`select id, cliente_id, courier::text courier, direccion_envio_id from pedidos where cerrado_en is null and cliente_id in ${q(ids)}`,
    q`select distinct on (cliente_id) id, cliente_id, rut, email, telefono, direccion, ciudad
      from direcciones_envio where cliente_id in ${q(ids)} order by cliente_id, id desc`,
  ]);
  const pagos = pedidos.length
    ? await q`select id, pedido_id, monto, comprobante, validado_en is not null validado, validado_por
              from pagos where pedido_id in ${q(pedidos.map((p) => p.id))} order by id`
    : [];

  const out: Tarjeta[] = ids.map((cid) => {
    const vs = ventas.filter((v) => v.cliente_id === cid);
    const ped = pedidos.find((p) => p.cliente_id === cid);
    // the pedido's own address wins, otherwise prefill with the client's latest one
    const dir = (dirs.find((d) => d.id === ped?.direccion_envio_id) ??
      dirs.find((d) => d.cliente_id === cid) ??
      null) as Dir | null;
    const ps = pagos.filter(
      (p) => p.pedido_id === ped?.id,
    ) as unknown as Pago[];
    const cliente = clientes.find(
      (c) => c.id === cid,
    ) as unknown as Tarjeta["cliente"];
    const total = vs.reduce((s, v) => s + v.monto, 0);
    const pagado = ps
      .filter((p) => p.validado)
      .reduce((s, p) => s + p.monto, 0);
    const courier = (ped?.courier ?? null) as Courier | null;
    return {
      cliente,
      ventas: vs,
      total,
      pagado,
      pagos: ps,
      dir,
      pedido: ped ? { id: ped.id, courier } : null,
      faltantes: calcFaltantes({
        cliente,
        pagos: ps,
        total,
        pagado,
        dir,
        courier,
      }),
    };
  });
  return out.sort((a, b) => +a.ventas[0].creado_en - +b.ventas[0].creado_en);
}
