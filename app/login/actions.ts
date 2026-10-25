"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { HASH_FALSO, verificarPassword } from "@/lib/password";
import { homeDe, esPermiso } from "@/lib/permisos";
import { COOKIE, HORAS_SESION, hashToken } from "@/lib/session";

export type LoginEstado = { error?: string };

export async function login(_: LoginEstado, f: FormData): Promise<LoginEstado> {
  const usuario = String(f.get("usuario") ?? "")
    .trim()
    .toLowerCase();
  const clave = String(f.get("clave") ?? "");
  if (!usuario || !clave) return { error: "Ingresa usuario y contraseña" };

  const [u] = await sql`select * from auth_intento(${usuario})`;
  const ok = await verificarPassword(
    clave,
    u?.password_hash ?? (await HASH_FALSO),
  );
  if (u?.bloqueado)
    return {
      error:
        "Cuenta bloqueada por intentos fallidos. Prueba de nuevo en 15 minutos.",
    };
  if (!u || !ok) {
    if (u) await sql`select auth_fallo(${u.id})`;
    return { error: "Usuario o contraseña incorrectos" };
  }

  const token = randomBytes(32).toString("base64url");
  const expira = new Date(Date.now() + HORAS_SESION * 3600_000);
  await sql`select auth_ok(${u.id}, ${hashToken(token)}, ${expira})`;
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expira,
  });
  redirect(homeDe((u.permisos as string[]).filter(esPermiso)));
}

export async function cerrarSesion() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await sql`select auth_logout(${hashToken(token)})`;
  jar.delete(COOKIE);
  redirect("/login");
}
