"use server";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getPerfil } from "@/lib/perfil";
import { COOKIE, getSession, hashToken } from "@/lib/session";
import { AVATARES, leerImagen } from "@/lib/uploads";
import type { Estado } from "../vender/actions";

export async function guardarPerfil(_: Estado, f: FormData): Promise<Estado> {
  const s = await getSession();
  if (!s) redirect("/login");
  // trust boundary: the form is client-controlled
  const nombre = String(f.get("nombre") ?? "").trim();
  if (nombre.length > 60)
    return { error: "El nombre es demasiado largo (máx. 60)" };
  const telefono = String(f.get("telefono") ?? "").trim();
  const digitos = telefono.replace(/\D/g, "").length;
  if (
    telefono &&
    (!/^\+?[\d\s-]+$/.test(telefono) || digitos < 8 || digitos > 15)
  )
    return { error: "Teléfono inválido (ej: +56 9 1234 5678)" };
  const foto = await leerImagen(f, "avatar", 2);
  if (foto && "error" in foto) return foto;

  const actual = (await getPerfil()).avatar;
  const nuevo = foto
    ? `${randomUUID()}.${foto.ext}`
    : f.get("quitar_avatar") === "on"
      ? null
      : actual;
  if (foto && nuevo) {
    await mkdir(AVATARES, { recursive: true });
    await writeFile(path.join(AVATARES, nuevo), foto.buf);
  }
  const token = (await cookies()).get(COOKIE)?.value ?? "";
  const [r] =
    await sql`select * from auth_guardar_perfil(${hashToken(token)}, ${nombre}, ${telefono}, ${nuevo})`;
  if (!r?.ok) redirect("/login");
  if (r.avatar_anterior)
    await unlink(path.join(AVATARES, r.avatar_anterior)).catch(() => {});
  revalidatePath("/cuenta");
  return { ok: "Perfil guardado" };
}
