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
import AnimatedList from "./AnimatedList";
import GlassSurface from "./GlassSurface";
import { useEscritorio } from "./tema";

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
const boton = `relative grid ${tam} place-items-center rounded-2xl transition duration-200 hover:-translate-y-1 hover:scale-125 focus-visible:-translate-y-1 focus-visible:scale-125 focus-visible:outline-none`;
// the profile circle: same motion as the dock buttons, but round and a fixed 32px (half the old size)
const botonRedondo = boton
  .replace(`rounded-2xl`, `rounded-full`)
  .replace(tam, `size-8`);
const reposo =
  "text-text/80 hover:bg-surface-2 hover:text-text focus-visible:bg-surface-2 focus-visible:text-text";
const actual_ =
  "bg-primary text-on-primary hover:bg-primary-hover focus-visible:bg-primary-hover";
function Enlace({ item, actual }: { item: ItemDock; actual: string }) {
  const activo =
    item.href === "/" ? actual === "/" : actual.startsWith(item.href);
  return (
    <Con label={item.label}>
      <Link
        href={item.href}
        aria-label={item.label}
        aria-current={activo ? "page" : undefined}
        className={`${boton} ${activo ? actual_ : reposo}`}
      >
        <HugeiconsIcon icon={ICONOS[item.id]} size={23} strokeWidth={1.7} />
        {activo && (
          <span className="absolute -bottom-1.5 h-1 w-1 rounded-full bg-primary" />
        )}
      </Link>
    </Con>
  );
}

// ---------- account menu: an AnimatedList that opens above the user button ----------
export type UsuarioDock = { nombre: string; avatar: string | null };

// MagicBento/AnimatedList ship their own palettes; point every color at the app tokens (the `style` prop wins)
const TEMA_LISTA = {
  "--al-frame": "var(--surface)",
  "--al-frame-edge": "var(--border)",
  "--al-frame-highlight": "transparent",
  "--al-frame-shadow":
    "0 22px 44px -20px color-mix(in srgb, var(--text) 55%, transparent)",
  "--al-tile": "var(--surface-2)",
  "--al-tile-edge": "var(--border)",
  "--al-tile-highlight": "transparent",
  "--al-tile-shadow": "none",
  "--al-well": "var(--surface-2)",
  "--al-ink": "var(--text)",
  "--al-muted": "var(--text-muted)",
  "--al-thumb": "var(--border)",
  "--al-ring-fill": "color-mix(in srgb, var(--primary) 12%, transparent)",
  "--al-hover": "brightness(1.08)",
  "--al-press": "brightness(0.92)",
  "--al-active": "none",
} as React.CSSProperties;

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
        <div className="absolute bottom-full right-0 z-10 mb-4 w-[min(17rem,calc(100vw-1.5rem))]">
          <AnimatedList
            items={items}
            width="100%"
            theme="dark"
            accentColor="var(--primary)"
            radius={14}
            gap={6}
            animation="pop"
            selectOnHover
            showGradients={false}
            displayScrollbar={false}
            style={TEMA_LISTA}
            onItemSelect={(it: { id: string }) => {
              setAbierto(false);
              if (it.id === "perfil") router.push("/cuenta");
              else if (it.id === "admin") router.push("/configuracion");
              else formSalir.current?.requestSubmit();
            }}
          />
        </div>
      )}
      <form ref={formSalir} action={salir} hidden />
    </div>
  );
}

// Floating glass dock at the bottom (sections, summary in the middle) and, apart from it, the profile circle on the right.
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
  const refraccion = useEscritorio();
  // both glasses share the look; `visible` lets tooltips and the account menu stick out above them
  const vidrio = {
    renderer: "svg",
    refraction: refraccion,
    distortionScale: -70,
    displace: 3,
    backgroundOpacity: 0.224, // frost: 20% lighter than 0.28
    saturation: 1.3,
    className: "pointer-events-auto",
  } as const;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex items-center justify-center gap-3 px-2 sm:gap-8">
      {/* same width as the profile circle, so the dock itself stays centered */}
      <span aria-hidden className="w-8 shrink-0" />
      <GlassSurface
        {...vidrio}
        height={68}
        borderRadius={34}
        width="fit-content"
        style={{ overflow: "visible", maxWidth: "100%" }}
      >
        <nav
          aria-label="Navegación"
          className="flex items-center gap-0.5 px-1.5 sm:gap-2 sm:px-3"
        >
          {principal.map((it) => (
            <Enlace key={it.id} item={it} actual={actual} />
          ))}
        </nav>
      </GlassSurface>
      <GlassSurface
        {...vidrio}
        width={32}
        height={32}
        borderRadius={16}
        style={{ overflow: "visible" }}
      >
        <MenuUsuario usuario={usuario} admin={admin} salir={salir} />
      </GlassSurface>
    </div>
  );
}
