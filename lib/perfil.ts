import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { sql } from "./db";
import { COOKIE, hashToken } from "./session";

export type Perfil = {
  nombre: string | null;
  telefono: string | null;
  avatar: string | null; // file under uploads/avatares/, served by /api/avatares/<file>
};

// the signed-in user's own profile (the db function finds the user from the session token)
export const getPerfil = cache(async (): Promise<Perfil> => {
  const token = (await cookies()).get(COOKIE)?.value;
  const [p] = token
    ? await sql`select * from auth_perfil(${hashToken(token)})`
    : [];
  return (
    (p as Perfil | undefined) ?? { nombre: null, telefono: null, avatar: null }
  );
});
