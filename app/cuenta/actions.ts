"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { hashPassword, verificarPassword } from "@/lib/password";
import { homeDe } from "@/lib/permisos";
import { COOKIE, getSession, hashToken } from "@/lib/session";
import type { Estado } from "../vender/actions";

export async function cambiarPassword(_: Estado, f: FormData): Promise<Estado> {
  const s = await getSession();
  if (!s) redirect("/login");
  const actual = String(f.get("actual") ?? "");
  const nueva = String(f.get("nueva") ?? "");
  const repetir = String(f.get("repetir") ?? "");

  if (nueva.length < 8)
    return { error: "La nueva contraseña debe tener al menos 8 caracteres" };
  if (nueva.length > 100)
    return { error: "La nueva contraseña es demasiado larga" };
  if (nueva !== repetir)
    return { error: "Las contraseñas nuevas no coinciden" };
  if (nueva === actual)
    return { error: "La nueva contraseña debe ser distinta de la actual" };

  // the current password is re-checked even with a valid session: a stolen session must not be enough
  const [u] = await sql`select * from auth_intento(${s.usuario})`;
  if (u?.bloqueado)
    return {
      error:
        "Cuenta bloqueada por intentos fallidos. Prueba de nuevo en 15 minutos.",
    };
  if (!u || !(await verificarPassword(actual, u.password_hash))) {
    if (u) await sql`select auth_fallo(${u.id})`; // wrong guesses here count towards the lockout too
    return { error: "La contraseña actual no es correcta" };
  }

  const token = (await cookies()).get(COOKIE)?.value ?? "";
  const [r] =
    await sql`select auth_cambiar_password(${hashToken(token)}, ${await hashPassword(nueva)}) ok`;
  if (!r?.ok) redirect("/login");
  redirect(homeDe(s.permisos));
}
