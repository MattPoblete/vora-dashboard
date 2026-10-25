import "server-only";
import { createHash } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Row, Sql } from "postgres";
import { sql } from "./db";
import { esPermiso, homeDe, rolDeDb, type Permiso } from "./permisos";

export type Sesion = {
  usuarioId: number;
  usuario: string;
  permisos: Permiso[];
  vendedores: string | null;
  debeCambiar: boolean; // temporary password: nothing works until it is changed
};

export const COOKIE = "vora_session";
export const HORAS_SESION = 12;
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export const getSession = cache(async (): Promise<Sesion | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [s] = await sql`select * from auth_sesion(${hashToken(token)})`;
  return s
    ? {
        usuarioId: s.usuario_id,
        usuario: s.usuario,
        permisos: (s.permisos as string[]).filter(esPermiso),
        vendedores: s.vendedores,
        debeCambiar: s.debe_cambiar,
      }
    : null;
}) as () => Promise<Sesion | null>;

export const esAdmin = (s: Sesion) => s.permisos.includes("admin");
// admin always passes; everyone else needs at least one of `permisos`
export const tiene = (s: Sesion, ...permisos: Permiso[]) =>
  !s.debeCambiar &&
  (esAdmin(s) || permisos.some((p) => s.permisos.includes(p)));

// page guard
export async function requirePermiso(...permisos: Permiso[]): Promise<Sesion> {
  const s = await getSession();
  if (!s) redirect("/login");
  if (s.debeCambiar) redirect("/cuenta");
  if (!tiene(s, ...permisos)) redirect(homeDe(s.permisos));
  return s;
}

// every query runs in a transaction as the user's postgres role, so RLS decides what rows it can touch
export async function db<T>(fn: (q: Sql) => Promise<T>): Promise<T> {
  const s = await getSession();
  if (!s) throw new Error("No autenticado");
  if (s.debeCambiar) throw new Error("Debes cambiar tu contraseña");
  const rol = rolDeDb(s.permisos); // whitelisted names only: it is interpolated into SET ROLE
  if (!rol) throw new Error("Sin permisos");
  return sql.begin(async (tx) => {
    await tx.unsafe(`set local role ${rol}`);
    await tx`select set_config('app.vendedores', ${s.vendedores ?? ""}, true)`;
    await tx`select set_config('app.usuario', ${s.usuario}, true)`; // read by the audit trigger (db/init/006_registro.sql)
    return fn(tx as unknown as Sql);
  }) as Promise<T>;
}

// same shape as the `sql` tag: dbq`select ...`
export function dbq<T extends readonly (object | undefined)[] = Row[]>(
  strings: TemplateStringsArray,
  ...values: unknown[]
) {
  return db((q) => q<T>(strings, ...(values as never[])));
}
