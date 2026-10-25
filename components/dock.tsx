"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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

// icon over its label; narrow enough on a phone for five sections plus the account button in 390px
const boton =
  "flex h-12 w-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary sm:w-16";
// colors live in the two states (never both in one string, otherwise hover:bg-* and bg-* would compete)
const reposo = "text-muted hover:bg-surface-2 hover:text-text";
const actual_ = "bg-primary-soft text-primary";
const esActivo = (item: ItemDock, actual: string) =>
  item.href === "/" ? actual === "/" : actual.startsWith(item.href);

function Enlace({ item, activo }: { item: ItemDock; activo: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={activo ? "page" : undefined}
      className={`${boton} ${activo ? actual_ : reposo}`}
    >
      <HugeiconsIcon icon={ICONOS[item.id]} size={20} strokeWidth={1.8} />
      {item.label}
    </Link>
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
    <div ref={caja} className="relative">
      <button
        type="button"
        aria-label={`Menú de ${usuario.nombre}`}
        aria-haspopup="menu"
        aria-expanded={abierto}
        onClick={() => setAbierto((v) => !v)}
        className={`${boton} ${abierto || enMenu ? actual_ : reposo}`}
      >
        {usuario.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/avatares/${usuario.avatar}`}
            alt=""
            className="size-5 rounded-full object-cover"
          />
        ) : (
          <HugeiconsIcon icon={User02Icon} size={20} strokeWidth={1.8} />
        )}
        Cuenta
      </button>
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

// Floating dock at the bottom (sections, summary in the middle) with the account button at its end.
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
  // the print view of the labels is a sheet, not an app screen
  if (actual.startsWith("/empaquetar/etiquetas")) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-2">
      <nav
        aria-label="Navegación"
        className="pointer-events-auto flex max-w-full items-center gap-0.5 rounded-2xl border border-border bg-surface p-1 shadow-lg sm:gap-1"
      >
        {principal.map((it) => (
          <Enlace key={it.id} item={it} activo={esActivo(it, actual)} />
        ))}
        <span aria-hidden className="mx-0.5 h-8 w-px shrink-0 bg-border" />
        <MenuUsuario usuario={usuario} admin={admin} salir={salir} />
      </nav>
    </div>
  );
}
