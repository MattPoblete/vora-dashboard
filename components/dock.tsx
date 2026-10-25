"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DashboardSquare01Icon,
  DeliveryTruck01Icon,
  Logout01Icon,
  Package01Icon,
  Settings01Icon,
  ShoppingBag01Icon,
  User02Icon,
  UserSettings01Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";

// one icon per destination, so each button reads at a glance
const ICONOS = {
  resumen: DashboardSquare01Icon,
  ventas: ShoppingBag01Icon,
  central: Wallet01Icon,
  empaquetado: Package01Icon,
  despacho: DeliveryTruck01Icon,
} as const;

export type ItemDock = { id: keyof typeof ICONOS; href: string; label: string };

// compact on phones so the nine buttons fit a 390px screen
const tam = "size-10 sm:size-[50px]";

// the tooltip lives next to the button (not inside it) so it does not grow with the hover zoom
function Con({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="group/dock relative">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 mb-4 -translate-x-1/2 whitespace-nowrap rounded-lg bg-surface-2 px-3 py-1.5 text-xs font-medium text-text opacity-0 shadow-lg ring-1 ring-border transition-opacity duration-150 group-hover/dock:opacity-100 group-focus-within/dock:opacity-100"
      >
        {label}
      </span>
    </div>
  );
}

// layout + motion shared by every dock button; colors live in the three states below (never both in one string,
// otherwise hover:bg-* and bg-* would compete and the winner would depend on CSS order)
const boton = `relative grid ${tam} place-items-center rounded-xl transition-colors focus-visible:outline-2 focus-visible:outline-primary`;
const botonRedondo = boton.replace(`rounded-xl`, `rounded-full`);
const reposo =
  "text-text/80 hover:bg-surface-2 hover:text-text focus-visible:bg-surface-2 focus-visible:text-text";
const actual_ =
  "bg-primary text-on-primary hover:bg-primary-hover focus-visible:bg-primary-hover";
const esActivo = (item: ItemDock, actual: string) =>
  item.href === "/" ? actual === "/" : actual.startsWith(item.href);

function Enlace({ item, activo }: { item: ItemDock; activo: boolean }) {
  return (
    <Con label={item.label}>
      <Link
        href={item.href}
        aria-label={item.label}
        aria-current={activo ? "page" : undefined}
        className={`${boton} ${activo ? actual_ : reposo}`}
      >
        <HugeiconsIcon icon={ICONOS[item.id]} size={22} strokeWidth={1.7} />
      </Link>
    </Con>
  );
}

// ---------- account menu: opens above the user button ----------
export type UsuarioDock = { nombre: string; avatar: string | null };

function MenuUsuario({
  usuario,
  admin,
  salir,
}: {
  usuario: UsuarioDock;
  admin: boolean;
  salir: () => void | Promise<void>;
}) {
  const router = useRouter();
  const actual = usePathname();
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const formSalir = useRef<HTMLFormElement>(null);

  // close on Escape or a press outside
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) =>
      !caja.current?.contains(e.target as Node) && setAbierto(false);
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  const glifo = (icono: typeof User02Icon) => (
    <HugeiconsIcon icon={icono} size={18} strokeWidth={1.8} />
  );
  const items = [
    {
      id: "perfil",
      icon: glifo(UserSettings01Icon),
      title: "Ajustes del perfil",
      description: "Nombre, foto, teléfono y contraseña",
    },
    ...(admin
      ? [
          {
            id: "admin",
            icon: glifo(Settings01Icon),
            title: "Ajustes de administrador",
            description: "Usuarios, grupos y transferencia",
          },
        ]
      : []),
    {
      id: "salir",
      icon: glifo(Logout01Icon),
      title: "Cerrar sesión",
      description: usuario.nombre,
    },
  ];

  const enMenu =
    actual.startsWith("/cuenta") || actual.startsWith("/configuracion");
  return (
    <div ref={caja} className="group/dock relative">
      <button
        type="button"
        aria-label={`Menú de ${usuario.nombre}`}
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
        className={`${botonRedondo} ${abierto || enMenu ? actual_ : reposo}`}
      >
        {usuario.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/avatares/${usuario.avatar}`}
            alt=""
            className="size-full rounded-full object-cover"
          />
        ) : (
          <HugeiconsIcon icon={User02Icon} size={16} strokeWidth={1.8} />
        )}
      </button>
      {!abierto && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 mb-4 -translate-x-1/2 whitespace-nowrap rounded-lg bg-surface-2 px-3 py-1.5 text-xs font-medium text-text opacity-0 shadow-lg ring-1 ring-border transition-opacity duration-150 group-hover/dock:opacity-100"
        >
          {usuario.nombre}
        </span>
      )}
      {abierto && (
        <ul
          role="menu"
          className="absolute bottom-full right-0 z-10 mb-3 w-64 rounded-xl border border-border bg-surface p-1.5 shadow-lg"
        >
          {items.map((it) => (
            <li key={it.id} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setAbierto(false);
                  if (it.id === "perfil") router.push("/cuenta");
                  else if (it.id === "admin") router.push("/configuracion");
                  else formSalir.current?.requestSubmit();
                }}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none"
              >
                <span className="text-muted">{it.icon}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{it.title}</span>
                  <span className="block truncate text-xs text-muted">
                    {it.description}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <form ref={formSalir} action={salir} hidden />
    </div>
  );
}

// Floating dock at the bottom (sections, summary in the middle) with the profile circle at its end.
// Labels show on hover/focus.
export function Dock({
  principal,
  usuario,
  admin,
  salir,
}: {
  principal: ItemDock[];
  usuario: UsuarioDock;
  admin: boolean;
  salir: () => void | Promise<void>;
}) {
  const actual = usePathname();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-2">
      <nav
        aria-label="Navegación"
        className="pointer-events-auto flex items-center gap-0.5 rounded-2xl border border-border bg-surface p-1.5 shadow-lg sm:gap-1"
      >
        {principal.map((it) => (
          <Enlace key={it.id} item={it} activo={esActivo(it, actual)} />
        ))}
        <span aria-hidden className="mx-1 h-6 w-px bg-border" />
        <MenuUsuario usuario={usuario} admin={admin} salir={salir} />
      </nav>
    </div>
  );
}
