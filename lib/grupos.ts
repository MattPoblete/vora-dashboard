import "server-only";
import type { Sql } from "postgres";

export type Grupo = {
  vendedores: string; // "Fer y Anto": what lives and users point at
  alias: string | null; // display name
  foto: string | null; // file under uploads/grupos/, served by /api/grupos/<file>
};

export const nombreGrupo = (g: Pick<Grupo, "vendedores" | "alias">) =>
  g.alias ?? g.vendedores;

// groups that can go live. Admin: those with at least one active member (a live belongs to people who can log in);
// a vendedor: RLS leaves only their own
export function gruposParaLive(q: Sql, admin: boolean) {
  return q<Grupo[]>`
    select g.vendedores, g.alias, g.foto from grupos_venta g
    ${
      admin
        ? q`where exists (select 1 from admin_listar_usuarios() u where u.vendedores = g.vendedores and u.activo)`
        : q``
    }
    order by g.vendedores`;
}
