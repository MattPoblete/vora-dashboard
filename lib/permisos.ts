// Shared by server and client code (no server-only imports).
export const PANTALLAS = [
  {
    id: "ventas",
    label: "Ventas",
    href: "/vender",
    letra: "v",
    rolDb: "vora_vendedor",
    detalle: "Registrar las ventas durante el live",
  },
  {
    id: "central",
    label: "Central",
    href: "/central",
    letra: "c",
    rolDb: "vora_central",
    detalle: "Pagos, comprobantes y datos de envío",
  },
  {
    id: "empaquetado",
    label: "Empaquetado",
    href: "/empaquetar",
    letra: "e",
    rolDb: "vora_empaquetador",
    detalle: "Buscar prendas, etiquetas y empaquetar",
  },
  {
    id: "despacho",
    label: "Despacho",
    href: "/peoneta",
    letra: "d",
    rolDb: "vora_peoneta",
    detalle: "Entregar los paquetes al courier",
  },
] as const;

export type Pantalla = (typeof PANTALLAS)[number]["id"];
export type Permiso = Pantalla | "admin";
export const PERMISOS: Permiso[] = [...PANTALLAS.map((p) => p.id), "admin"];

export const esPermiso = (x: string): x is Permiso =>
  (PERMISOS as string[]).includes(x);

// where a user lands after login, and when it opens a screen it has no access to
export function homeDe(permisos: Permiso[]) {
  if (permisos.includes("admin")) return "/";
  return PANTALLAS.find((p) => permisos.includes(p.id))?.href ?? "/sin-acceso";
}

// postgres role the user runs as: one permission -> its base role; several -> the combined role that
// inherits them (created by db/init/002_auth_rls.sql); none -> null
export function rolDeDb(permisos: Permiso[]): string | null {
  if (permisos.includes("admin")) return "vora_admin";
  const tiene = PANTALLAS.filter((p) => permisos.includes(p.id));
  if (!tiene.length) return null;
  return tiene.length === 1
    ? tiene[0].rolDb
    : "vora_c_" + tiene.map((p) => p.letra).join("");
}
