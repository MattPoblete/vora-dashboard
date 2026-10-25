"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Sql } from "postgres";
import { db, dbq, esAdmin, getSession } from "@/lib/session";
import { gruposParaLive } from "@/lib/grupos";

export type Estado = { ok?: string; error?: string };

export async function iniciarLive(f: FormData) {
  const s = await getSession();
  if (!s) return;
  // a vendedor can only go live as its own pair (RLS enforces it again in the db)
  const vendedores =
    !esAdmin(s) && s.vendedores
      ? s.vendedores
      : String(f.get("vendedores") ?? "");
  // the group must exist and (for the admin) have an active member; a vendedor only ever sees their own
  const grupos = await db((q) => gruposParaLive(q, esAdmin(s)));
  if (!grupos.some((g) => g.vendedores === vendedores)) return;
  const now = new Date();
  const tz = { timeZone: "America/Santiago" } as const;
  const [y, m, d] = now.toLocaleDateString("en-CA", tz).split("-");
  const hh = now.toLocaleTimeString("es-CL", {
    ...tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const turno =
    +hh.slice(0, 2) < 12 ? "mañana" : +hh.slice(0, 2) < 19 ? "tarde" : "noche";
  const nombre = `${vendedores} ${d}-${m} ${hh}`;
  const [live] = await dbq`
    insert into lives (nombre, fecha, turno, vendedores, inicio)
    values (${nombre}, ${`${y}-${m}-${d}`}, ${turno}, ${vendedores}, now())
    on conflict (nombre) do nothing returning id`;
  revalidatePath("/vender");
  redirect(live ? `/vender?live=${live.id}` : "/vender");
}

export async function finalizarLive(id: number): Promise<Estado> {
  if (!Number.isInteger(id)) return { error: "Live inválido" };
  const r =
    await dbq`update lives set fin = now() where id = ${id} and inicio is not null and fin is null returning id`;
  revalidatePath("/vender");
  return r.length
    ? { ok: "Live finalizado" }
    : { error: "El live ya estaba finalizado" };
}

// trust boundary: the form is client-controlled
function parse(f: FormData) {
  const nick = String(f.get("nick") ?? "")
    .replace(/^@/, "")
    .trim();
  const talla = String(f.get("talla") ?? "").trim();
  const material = String(f.get("material") ?? "").trim() || null;
  // only sent when the "con detalles" checkbox is on
  const observaciones = String(f.get("observaciones") ?? "").trim() || null;
  const monto = Number(f.get("precio"));
  const codigo = Number(f.get("codigo"));
  if (!nick) return { error: "Falta el nick" };
  if (!Number.isInteger(monto) || monto <= 0)
    return { error: "Precio inválido" };
  if (!talla) return { error: "Falta la talla" };
  if (!Number.isInteger(codigo) || codigo < 0 || codigo > 9999)
    return { error: "Código inválido (1 a 4 dígitos)" };
  return { nick, talla, material, observaciones, monto, codigo };
}

type Tx = Sql;

// two sellers typing the same code at once: the second waits here and then sees the first one's sale
// (no unique index: the Excel import has historic duplicates). Key space (live, codigo); central uses (-1, cliente).
const codigoLock = (tx: Tx, live: number, codigo: number) =>
  tx`select pg_advisory_xact_lock(${live}::int, ${codigo}::int)`;

async function clienteId(tx: Tx, nick: string) {
  // ponytail: same nick -> same client (most purchases wins); no unique nick in schema yet
  const [found] = await tx`
    select c.id from clientes c where lower(c.nombre) = lower(${nick})
    order by (select count(*) from ventas v where v.cliente_id = c.id) desc limit 1`;
  if (found) return found.id as number;
  const [c] =
    await tx`insert into clientes (nombre) values (${nick}) returning id`;
  return c.id as number;
}

// a sale that already has payment / shipping progress is no longer a live-screen matter
async function bloqueada(tx: Tx, id: number) {
  const [v] =
    await tx`select live_id, estado, pedido_id, paquete_id from ventas where id = ${id} for update`;
  if (!v) return { error: "La venta ya no existe" } as const;
  if (
    v.pedido_id ||
    v.paquete_id ||
    ["pagada", "por_empaquetar", "empaquetada", "enviada"].includes(v.estado)
  )
    return {
      error: `No se puede modificar: está ${v.estado.replaceAll("_", " ")}`,
    } as const;
  return { live: v.live_id as number } as const;
}

export async function agregarVenta(_: Estado, f: FormData): Promise<Estado> {
  const p = parse(f);
  if ("error" in p) return p;
  const live = Number(f.get("live"));

  return db(async (tx) => {
    const [l] = await tx`select fin from lives where id = ${live}`;
    if (!l || l.fin) return { error: "El live ya finalizó" };
    await codigoLock(tx, live, p.codigo);
    const cid = await clienteId(tx, p.nick);
    const [dup] =
      await tx`select id from ventas where live_id = ${live} and codigo = ${p.codigo} and estado <> 'liberada' order by id limit 1`;
    if (dup) {
      // code already taken in this live: queue as 2nd / 3rd buyer
      const [{ n }] =
        await tx`select count(*)::int n from reservas_respaldo where venta_id = ${dup.id}`;
      if (n >= 2)
        return { error: `El código ${p.codigo} ya tiene 3 compradores` };
      await tx`insert into reservas_respaldo values (${dup.id}, ${n + 2}, ${p.nick}, ${cid})`;
      revalidatePath("/vender");
      return { ok: `#${p.codigo}: ${p.nick} quedó de ${n + 2}° comprador` };
    }
    await tx`insert into ventas (live_id, codigo, monto, talla, material, detalle, cliente_id, comprador_texto)
             values (${live}, ${p.codigo}, ${p.monto}, ${p.talla}, ${p.material}, ${p.observaciones}, ${cid}, ${p.nick})`;
    revalidatePath("/vender");
    return { ok: `#${p.codigo} → ${p.nick} agregado` };
  });
}

export async function editarVenta(_: Estado, f: FormData): Promise<Estado> {
  const p = parse(f);
  if ("error" in p) return p;
  const id = Number(f.get("id"));

  return db(async (tx) => {
    const b = await bloqueada(tx, id);
    if ("error" in b) return b;
    await codigoLock(tx, b.live, p.codigo);
    const [dup] =
      await tx`select 1 from ventas where live_id = ${b.live} and codigo = ${p.codigo} and id <> ${id} and estado <> 'liberada'`;
    if (dup) return { error: `El código ${p.codigo} ya está en este live` };
    const cid = await clienteId(tx, p.nick);
    await tx`update ventas set codigo = ${p.codigo}, monto = ${p.monto}, talla = ${p.talla}, material = ${p.material}, detalle = ${p.observaciones},
             cliente_id = ${cid}, comprador_texto = ${p.nick} where id = ${id}`;
    revalidatePath("/vender");
    return { ok: "Venta actualizada" };
  });
}

export async function borrarVenta(id: number): Promise<Estado> {
  if (!Number.isInteger(id)) return { error: "Venta inválida" };
  return db(async (tx) => {
    const b = await bloqueada(tx, id);
    if ("error" in b) return b;
    await tx`delete from ventas where id = ${id}`; // reservas_respaldo cascades
    revalidatePath("/vender");
    return { ok: "Venta eliminada" };
  });
}
