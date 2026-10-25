"use server";

import { revalidatePath } from "next/cache";
import type { Sql } from "postgres";
import { db } from "@/lib/session";
import { cargarEmpaque, lineasEtiqueta, nombreCourier } from "@/lib/empaque";
import type { Estado } from "../vender/actions";

export async function marcarEmpaquetado(
  _: Estado,
  f: FormData,
): Promise<Estado> {
  const pedido = Number(f.get("pedido"));
  if (!Number.isInteger(pedido) || pedido <= 0)
    return { error: "Pedido inválido" };

  return db(async (tx) => {
    // re-read inside the transaction: someone else may have packed it already
    const [p] = await cargarEmpaque(tx as unknown as Sql, [pedido]);
    if (!p) return { error: "Este pedido ya fue empaquetado" };
    const [ped] =
      await tx`select cliente_id, direccion_envio_id from pedidos where id = ${pedido}`;
    // label text is snapshotted so a later address edit can't rewrite what was printed
    const etiqueta = [
      nombreCourier(p.courier),
      ...lineasEtiqueta(p).map(([k, v]) => `${k}: ${v}`),
    ].join("\n");
    const [paq] = await tx`
      insert into paquetes (cliente_id, direccion_envio_id, courier, etiqueta, empaquetado_en)
      values (${ped.cliente_id}, ${ped.direccion_envio_id}, ${p.courier}, ${etiqueta}, now()) returning id`;
    await tx`update ventas set estado = 'por_enviar', paquete_id = ${paq.id} where pedido_id = ${pedido} and estado = 'por_empaquetar'`;
    revalidatePath("/empaquetar");
    return { ok: "Empaquetado: pasó a por enviar" };
  });
}
