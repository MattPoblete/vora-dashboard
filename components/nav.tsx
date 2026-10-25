import { Suspense } from "react";
import { esAdmin, getSession, tiene } from "@/lib/session";
import { PANTALLAS } from "@/lib/permisos";
import { getPerfil } from "@/lib/perfil";
import { cerrarSesion } from "@/app/login/actions";
import { Dock, type ItemDock } from "./dock";

async function NavInner() {
  const s = await getSession();
  if (!s) return null;
  const admin = esAdmin(s);
  const principal: ItemDock[] = PANTALLAS.filter((p) => tiene(s, p.id)).map(
    (p) => ({ id: p.id, href: p.href, label: p.label }),
  );
  // the summary sits in the middle of the section buttons
  if (admin || principal.length)
    principal.splice(Math.floor(principal.length / 2), 0, {
      id: "resumen",
      href: "/",
      label: "Inicio",
    });
  const perfil = await getPerfil();
  return (
    <Dock
      principal={principal}
      usuario={{ nombre: perfil.nombre || s.usuario, avatar: perfil.avatar }}
      admin={admin}
      salir={cerrarSesion}
    />
  );
}

// the session read is request-time, so it streams in behind its own boundary
export function Nav() {
  return (
    <Suspense fallback={null}>
      <NavInner />
    </Suspense>
  );
}
