"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/session";
import type { Estado } from "../vender/actions";

export async function marcarEnviado(_: Estado, f: FormData): Promise<Estado> {
  const ids = f.getAll("paquete").map(Number);
  if (!ids.length) return { error: "Marca al menos un paquete" };
  if (ids.some((n) => !Number.isInteger(n) || n <= 0))
    return { error: "Paquete inválido" };

  return db(async (tx) => {
    const hechos =
      await tx`update paquetes set recolectado_en = now() where id in ${tx(ids)} and recolectado_en is null returning id`;
    if (!hechos.length) return { error: "Esos paquetes ya fueron entregados" };
    await tx`update ventas set estado = 'enviada' where paquete_id in ${tx(hechos.map((h) => h.id))} and estado = 'por_enviar'`;
    revalidatePath("/peoneta");
    return { ok: `${hechos.length} paquete(s) entregados` };
  });
}
