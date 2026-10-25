"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Tiempo } from "./tiempo";

export type ItemCola = {
  anchor: string; // key into `detalles`: the full card this row opens
  titulo: string;
  etiqueta: string;
  tono: string; // tailwind classes for the badge
  subtitulo: string;
  lineas: string[];
  desde?: string; // ISO date: shows how long it has been waiting
};

// The panel is URL driven (?abrir=<anchor>): the server renders the full card of ONLY that order. Rendering the 40
// pending orders on every 3s refresh cost ~480 KB of payload each time. `abierto` is also kept locally so the panel
// opens instantly while the server answers. `detalles` is server-rendered, so the forms inside keep working and stay
// live while the board polls.
const sinSuscripcion = () => () => {};
// false on the server and during hydration, true afterwards: the portal needs `document`
const useEnCliente = () =>
  useSyncExternalStore(
    sinSuscripcion,
    () => true,
    () => false,
  );

export function Cola({
  items,
  detalles,
  resumen,
}: {
  items: ItemCola[];
  detalles: Record<string, ReactNode>;
  resumen?: { nombre: string; n: number }[]; // counts per stage/courier
}) {
  const enCliente = useEnCliente();
  const router = useRouter();
  const pathname = usePathname();
  const [abierto, setAbierto] = useState<string | null>(
    () => Object.keys(detalles)[0] ?? null,
  );
  const cierre = useRef<HTMLButtonElement>(null);

  const abrir = (anchor: string) => {
    setAbierto(anchor);
    router.replace(`${pathname}?abrir=${encodeURIComponent(anchor)}`, {
      scroll: false,
    });
  };
  const cerrar = useCallback(() => {
    setAbierto(null);
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  useEffect(() => {
    if (!abierto) return;
    const previo = document.activeElement as HTMLElement | null;
    cierre.current?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previo?.focus?.();
    };
  }, [abierto, cerrar]);

  const actual = items.find((i) => i.anchor === abierto);
  // an order that left the queue meanwhile renders nothing; while the server answers, a placeholder
  const contenido =
    abierto && actual
      ? (detalles[abierto] ?? (
          <p className="p-8 text-center text-muted">Cargando pedido…</p>
        ))
      : null;

  return (
    <>
      {resumen && resumen.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {resumen.map((r) => (
            <span
              key={r.nombre}
              className="rounded-lg bg-surface-2 px-3 py-1.5 text-sm"
            >
              {r.nombre}{" "}
              <span className="font-semibold tabular-nums">{r.n}</span>
            </span>
          ))}
        </div>
      )}
      {/* oldest first: the order that has waited longest is on top */}
      <ul className="-mx-2 divide-y divide-border">
        {items.map((it) => (
          <li key={it.anchor}>
            <button
              onClick={() => abrir(it.anchor)}
              className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 rounded-lg px-2 py-3 text-left hover:bg-surface-2 focus-visible:bg-surface-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{it.titulo}</p>
                <p className="truncate text-sm text-muted">
                  {[it.subtitulo, ...it.lineas].join(" · ")}
                </p>
              </div>
              {it.desde && <Tiempo desde={it.desde} />}
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${it.tono}`}
              >
                {it.etiqueta}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {/* portal: keeps `fixed` relative to the viewport whatever the ancestors do */}
      {enCliente &&
        contenido &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 text-text sm:items-center sm:p-6"
            onClick={(e) => e.target === e.currentTarget && cerrar()}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={actual ? `Pedido de ${actual.titulo}` : "Pedido"}
              className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-border bg-surface shadow-xl sm:max-w-3xl sm:rounded-2xl"
            >
              <button
                ref={cierre}
                onClick={cerrar}
                aria-label="Cerrar"
                className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"
              >
                ✕
              </button>
              {contenido}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
