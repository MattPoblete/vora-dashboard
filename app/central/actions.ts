"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import type { Sql } from "postgres";
import { db, dbq } from "@/lib/session";
import { cargar, COURIERS, type Courier } from "@/lib/central";
import { COMPROBANTES, TIPOS } from "@/lib/uploads";
import type { Estado } from "../vender/actions";

type Tx = Sql;
const MAX = 10 * 1024 * 1024;
const done = (ok: string): Estado => {
  revalidatePath("/central");
  return { ok };
};
const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim() || null;
const id = (f: FormData, k: string) => {
  const n = Number(f.get(k));
  return Number.isInteger(n) && n > 0 ? n : null;
};

function telefono(v: string | null) {
  if (!v) return { ok: true as const, v: null };
  let d = v.replace(/\D/g, "");
  if (d.length === 9 && d[0] === "9") d = "56" + d;
  return d.length === 11 && d.startsWith("569")
    ? { ok: true as const, v: d }
    : { ok: false as const, v: null };
}

// one open pedido per client; every pending sale of the client hangs from it
async function pedidoAbierto(tx: Tx, cid: number) {
  let [p] =
    await tx`select id from pedidos where cliente_id = ${cid} and cerrado_en is null`;
  if (!p) {
    const [d] =
      await tx`select id from direcciones_envio where cliente_id = ${cid} order by id desc limit 1`;
    [p] =
      await tx`insert into pedidos (cliente_id, direccion_envio_id) values (${cid}, ${d?.id ?? null}) returning id`;
  }
  await tx`update ventas set pedido_id = ${p.id}
           where cliente_id = ${cid} and pedido_id is null and estado::text in ('reservada','esperando_pago','pagada')
             and live_id in (select id from lives where inicio is not null)`;
  return p.id as number;
}

export async function contactado(_: Estado, f: FormData): Promise<Estado> {
  const cid = id(f, "cliente");
  if (!cid) return { error: "Cliente inválido" };
  await db(async (tx) => {
    const p = await pedidoAbierto(tx, cid);
    await tx`update ventas set estado = 'esperando_pago' where pedido_id = ${p} and estado = 'reservada'`;
  });
  return done("Esperando comprobante");
}

export async function subirComprobante(
  _: Estado,
  f: FormData,
): Promise<Estado> {
  const cid = id(f, "cliente");
  const monto = Number(f.get("monto"));
  const file = f.get("archivo");
  if (!cid) return { error: "Cliente inválido" };
  if (!Number.isInteger(monto) || monto <= 0)
    return { error: "Monto inválido" };
  if (!(file instanceof File) || file.size === 0)
    return { error: "Adjunta el comprobante" };
  const ext = TIPOS[file.type];
  if (!ext) return { error: "Formato no permitido (JPG, PNG, WEBP o PDF)" };
  if (file.size > MAX) return { error: "El archivo supera 10 MB" };

  return db(async (tx) => {
    const p = await pedidoAbierto(tx, cid);
    const name = `${p}-${Date.now()}.${ext}`;
    await mkdir(COMPROBANTES, { recursive: true });
    await writeFile(
      path.join(COMPROBANTES, name),
      Buffer.from(await file.arrayBuffer()),
    );
    await tx`insert into pagos (pedido_id, monto, comprobante) values (${p}, ${monto}, ${name})`;
    await tx`update ventas set estado = 'esperando_pago' where pedido_id = ${p} and estado = 'reservada'`;
    return done("Comprobante subido");
  });
}

export async function validarPago(_: Estado, f: FormData): Promise<Estado> {
  const pid = id(f, "pago");
  if (!pid) return { error: "Pago inválido" };
  return db(async (tx) => {
    const [p] =
      await tx`update pagos set validado_en = now(), validado_por = current_setting('app.usuario', true)
               where id = ${pid} and validado_en is null returning pedido_id`;
    if (!p) return { error: "El pago ya estaba validado" };
    await tx`update ventas set estado = 'pagada' where pedido_id = ${p.pedido_id} and estado in ('reservada','esperando_pago')`;
    return done("Pago validado");
  });
}

export async function quitarPago(_: Estado, f: FormData): Promise<Estado> {
  const pid = id(f, "pago");
  if (!pid) return { error: "Pago inválido" };
  // file stays on disk on purpose: cheap audit trail
  const r =
    await dbq`delete from pagos where id = ${pid} and validado_en is null returning id`;
  return r.length
    ? done("Comprobante quitado")
    : { error: "No se puede quitar un pago validado" };
}

export async function guardarEnvio(_: Estado, f: FormData): Promise<Estado> {
  const cid = id(f, "cliente");
  const courier = text(f, "courier") as Courier | null;
  if (!cid) return { error: "Cliente inválido" };
  if (!courier || !COURIERS.some((c) => c.id === courier))
    return { error: "Elige un courier" };
  const tel = telefono(text(f, "telefono"));
  const telEnvio = telefono(text(f, "telefono_envio"));
  if (!tel.ok || !telEnvio.ok)
    return { error: "Teléfono inválido (ej: +56 9 1234 5678)" };

  try {
    return await db(async (tx) => {
      const p = await pedidoAbierto(tx, cid);
      await tx`update clientes set nombre_completo = ${text(f, "nombre_completo")}, telefono = ${tel.v} where id = ${cid}`;
      let did: number | null = null;
      if (courier !== "retiro_tienda") {
        const vals = {
          rut: text(f, "rut"),
          email: text(f, "email"),
          direccion: text(f, "direccion"),
          ciudad: text(f, "ciudad"),
        };
        const [ex] =
          await tx`select direccion_envio_id id from pedidos where id = ${p}`;
        if (ex?.id) {
          await tx`update direcciones_envio set rut = ${vals.rut}, email = ${vals.email}, telefono = ${telEnvio.v},
                   direccion = ${vals.direccion}, ciudad = ${vals.ciudad} where id = ${ex.id}`;
          did = ex.id;
        } else {
          [{ id: did }] =
            await tx`insert into direcciones_envio (cliente_id, rut, email, telefono, direccion, ciudad)
            values (${cid}, ${vals.rut}, ${vals.email}, ${telEnvio.v}, ${vals.direccion}, ${vals.ciudad}) returning id`;
        }
      }
      await tx`update pedidos set courier = ${courier}, direccion_envio_id = coalesce(${did}, direccion_envio_id) where id = ${p}`;
      return done("Datos de envío guardados");
    });
  } catch (e) {
    if ((e as { code?: string }).code === "23505")
      return { error: "Ese teléfono ya pertenece a otro cliente" };
    throw e;
  }
}

export async function liberarVenta(_: Estado, f: FormData): Promise<Estado> {
  const vid = id(f, "venta");
  if (!vid) return { error: "Venta inválida" };
  const r = await dbq`update ventas set estado = 'liberada', pedido_id = null
                      where id = ${vid} and estado in ('reservada','esperando_pago') returning id`;
  return r.length
    ? done("Prenda liberada")
    : { error: "Ya no se puede liberar (pago validado)" };
}

export async function pasarAEmpaquetar(
  _: Estado,
  f: FormData,
): Promise<Estado> {
  const cid = id(f, "cliente");
  if (!cid) return { error: "Cliente inválido" };
  return db(async (tx) => {
    const [t] = await cargar(tx, cid);
    if (!t?.pedido) return { error: "No hay pedido abierto" };
    // recomputed server side: the disabled button is only a hint
    if (t.faltantes.length)
      return { error: `Faltan datos: ${t.faltantes.join(", ")}` };
    await tx`update ventas set estado = 'por_empaquetar' where pedido_id = ${t.pedido.id}`;
    await tx`update pedidos set cerrado_en = now() where id = ${t.pedido.id}`;
    return done("Pasó a por empaquetar");
  });
}
