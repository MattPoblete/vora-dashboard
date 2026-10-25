"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { esPermiso } from "@/lib/permisos";
import { hashPassword } from "@/lib/password";
import { db, requirePermiso } from "@/lib/session";
import type { Estado } from "../vender/actions";

export async function guardarUsuario(_: Estado, f: FormData): Promise<Estado> {
  const yo = await requirePermiso(); // admin only
  const id = Number(f.get("id"));
  if (!Number.isInteger(id) || id <= 0) return { error: "Usuario inválido" };
  // you can't edit your own access here: it is the easy way to lock yourself out
  if (id === yo.usuarioId)
    return { error: "No puedes cambiar tu propio acceso" };

  const permisos = [
    ...new Set(f.getAll("permisos").map(String).filter(esPermiso)),
  ];
  const activo = f.get("activo") === "on";

  try {
    await db(
      (q) =>
        q`select admin_guardar_usuario(${id}, ${q.array(permisos)}::text[], ${null}, ${activo})`,
    );
  } catch (e) {
    // P0001 = errors we raise on purpose in admin_guardar_usuario; anything else stays generic
    if ((e as { code?: string }).code === "P0001")
      return { error: (e as Error).message };
    throw e;
  }
  revalidatePath("/configuracion");
  return { ok: "Guardado" };
}

export type CrearEstado = { error?: string; usuario?: string; clave?: string };

export async function crearUsuario(
  _: CrearEstado,
  f: FormData,
): Promise<CrearEstado> {
  await requirePermiso(); // admin only
  const usuario = String(f.get("usuario") ?? "")
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/.test(usuario))
    return {
      error:
        "Usuario de 3 a 30 caracteres: letras, números, punto, guion o guion bajo",
    };

  const permisos = [
    ...new Set(f.getAll("permisos").map(String).filter(esPermiso)),
  ];
  if (!permisos.length) return { error: "Marca al menos un acceso" };

  // temporary password, shown once; the admin hands it over
  const clave = randomBytes(9).toString("base64url");
  const hash = await hashPassword(clave);
  try {
    await db(
      (q) =>
        q`select admin_crear_usuario(${usuario}, ${hash}, ${q.array(permisos)}::text[], ${null})`,
    );
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "23505") return { error: "Ese usuario ya existe" };
    if (code === "P0001") return { error: (e as Error).message };
    throw e;
  }
  revalidatePath("/configuracion");
  return { usuario, clave };
}

export async function restablecerPassword(
  _: CrearEstado,
  f: FormData,
): Promise<CrearEstado> {
  const yo = await requirePermiso(); // admin only
  const id = Number(f.get("id"));
  if (!Number.isInteger(id) || id <= 0) return { error: "Usuario inválido" };
  // your own password is changed from "Mi contraseña", which asks for the current one
  if (id === yo.usuarioId)
    return { error: "Cambia tu propia contraseña desde 'Mi contraseña'" };

  const clave = randomBytes(9).toString("base64url");
  const hash = await hashPassword(clave);
  try {
    await db((q) => q`select admin_resetear_password(${id}, ${hash})`);
  } catch (e) {
    if ((e as { code?: string }).code === "P0001")
      return { error: (e as Error).message };
    throw e;
  }
  revalidatePath("/configuracion");
  return { usuario: String(f.get("usuario") ?? ""), clave };
}
