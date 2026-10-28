"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import CardSwap, { Card } from "./CardSwap";
import { Vidrio } from "./vidrio";
import { Tiempo } from "./tiempo";

export type ItemCola = {
  anchor: string; // key into `detalles`: the full card this queue card expands into
  titulo: string;
  etiqueta: string;
  tono: string; // tailwind classes for the badge
  subtitulo: string;
  lineas: string[];
  desde?: string; // ISO date: shows how long it has been waiting
};

const MAX = 12; // cards in the stack; the list below always shows every order

// The panel is URL driven (?abrir=<anchor>): the server renders the full card of ONLY that order. Rendering the 40
// pending orders on every 3s refresh cost ~480 KB of payload each time. `abierto` is also kept locally so the panel
// opens instantly while the server answers.
// Visual queue. The oldest order is the front card. Click a card (or its row in the list) and it grows into a big
// panel holding the full order card. `detalles` is server-rendered, so the forms inside keep working and stay live
// while the board polls. autoplay is off on purpose: a work queue must not reshuffle itself while someone reads it.
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
  ayuda,
}: {
  items: ItemCola[];
  detalles: Record<string, ReactNode>;
  resumen?: { nombre: string; n: number }[]; // counts per stage/courier, drawn here (plain data is lighter than server-built JSX)
  ayuda?: string;
}) {
  const enCliente = useEnCliente();
  const router = useRouter();
  const pathname = usePathname();
  const [abierto, setAbierto] = useState<string | null>(
    () => Object.keys(detalles)[0] ?? null,
  );
  // the card stack is sized from the width it gets, so on a phone the cards fill the screen (they are the page's main thing)
  const escenario = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(360);
  useLayoutEffect(() => {
    const el = escenario.current;
    if (!el) return;
    const medir = () => setAncho(Math.round(el.clientWidth));
    medir();
    const o = new ResizeObserver(medir);
    o.observe(el);
    return () => o.disconnect();
  }, []);
  // perspective makes the front card look ~15% smaller than its real width, so ask for a bit more than the box
  const anchoCarta = Math.max(260, Math.min(Math.round(ancho * 1.1), 480));
  const altoCarta = Math.round(anchoCarta * 0.75);
  const paso = Math.round(altoCarta * 0.25); // how far each card behind peeks out
  const origen = useRef<DOMRect | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const cierre = useRef<HTMLButtonElement>(null);
  const lista = items.slice(0, MAX);

  // ?abrir= goes in and out without touching the rest of the url (the search box lives there too)
  const irA = useCallback(
    (anchor: string | null) => {
      // the live url, not a hook value: a changing dependency would re-run the panel effect when ?abrir= lands
      const next = new URLSearchParams(window.location.search);
      if (anchor) next.set("abrir", anchor);
      else next.delete("abrir");
      const s = next.toString();
      router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
    },
    [router, pathname],
  );
  const abrir = (anchor: string, desde?: Element | null) => {
    origen.current = desde?.getBoundingClientRect() ?? null;
    setAbierto(anchor);
    irA(anchor);
  };
  const cerrar = useCallback(() => {
    setAbierto(null);
    irA(null);
  }, [irA]);

  useEffect(() => {
    if (!abierto) return;
    const el = panel.current;
    const from = origen.current;
    if (
      el &&
      from &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      // grow from the card that was clicked to the final panel (centres and sizes line up, no layout jump)
      const to = el.getBoundingClientRect();
      const dx = from.left + from.width / 2 - (to.left + to.width / 2);
      const dy = from.top + from.height / 2 - (to.top + to.height / 2);
      el.animate(
        [
          {
            transform: `translate(${dx}px, ${dy}px) scale(${from.width / to.width}, ${from.height / to.height})`,
            opacity: 0.2,
          },
          { transform: "none", opacity: 1 },
        ],
        { duration: 380, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
      );
    }
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
      <div className="flex flex-wrap items-start gap-8">
        <div ref={escenario} className="w-full shrink-0 md:w-[460px]">
          {/* explicit width: CardSwap centers its stack on the box it is given, so a 0-width flex item would push it off-screen */}
          <div
            // negative margins: the stack is centered in its box with empty bands above and below it
            className="cola-swap -my-10 w-full"
            style={{ height: Math.round(altoCarta + paso * 2.6) }}
          >
            <CardSwap
              width={anchoCarta}
              height={altoCarta}
              cardDistance={0}
              verticalDistance={paso}
              depth={100}
              skewAmount={0}
              visibleCards={4}
              autoplay={false}
              onCardClick={(i) => {
                const it = lista[i];
                if (it)
                  abrir(
                    it.anchor,
                    document.querySelector(`[data-swap-index="${i}"]`),
                  );
              }}
            >
              {lista.map((it) => (
                <Card key={it.anchor}>
                  <div className="flex h-full flex-col justify-between p-5 sm:p-6">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="truncate text-3xl font-semibold">
                          {it.titulo}
                        </h3>
                        <span
                          className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm ${it.tono}`}
                        >
                          {it.etiqueta}
                        </span>
                      </div>
                      <p className="mt-2 text-base opacity-70">
                        {it.subtitulo}
                      </p>
                    </div>
                    <div>
                      {it.lineas.map((l) => (
                        <p key={l} className="truncate text-base opacity-90">
                          {l}
                        </p>
                      ))}
                      {it.desde && (
                        <div className="mt-2">
                          <Tiempo desde={it.desde} />
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </CardSwap>
          </div>
        </div>

        <div className="min-w-64 flex-1 space-y-3">
          {resumen && (
            <div className="space-y-2">
              {resumen.map((r) => (
                <div
                  key={r.nombre}
                  className="flex items-center justify-between rounded-xl bg-surface-2/50 px-4 py-2"
                >
                  <span>{r.nombre}</span>
                  <span className="text-xl font-semibold tabular-nums">
                    {r.n}
                  </span>
                </div>
              ))}
            </div>
          )}
          {ayuda && <p className="text-sm text-muted">{ayuda}</p>}
          {/* every order, also reachable with the keyboard */}
          <ul className="max-h-56 space-y-1 overflow-y-auto pr-1">
            {items.map((it) => (
              <li key={it.anchor}>
                <button
                  onClick={(e) => abrir(it.anchor, e.currentTarget)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left hover:bg-surface-2 focus-visible:bg-surface-2"
                >
                  <span className="truncate font-medium">{it.titulo}</span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs ${it.tono}`}
                  >
                    {it.etiqueta}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* portal: an ancestor with backdrop-filter becomes the containing block of `fixed`, which would pin the panel to the card */}
      {enCliente &&
        contenido &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-3 text-text backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && cerrar()}
          >
            <div
              ref={panel}
              role="dialog"
              aria-modal="true"
              aria-label={actual ? `Pedido de ${actual.titulo}` : "Pedido"}
              className="relative h-[70vh] min-h-80 w-[70vw] min-w-[min(94vw,38rem)] max-w-[94vw]"
            >
              <button
                ref={cierre}
                onClick={cerrar}
                aria-label="Cerrar"
                className="absolute -right-2 -top-2 z-10 grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-lg hover:bg-danger/40"
              >
                ✕
              </button>
              <div className="relative isolate h-full rounded-3xl">
                <Vidrio />
                <div className="h-full overflow-y-auto rounded-3xl">
                  {contenido}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
      {items.length > MAX && (
        <p className="mt-2 text-sm text-muted">
          +{items.length - MAX} más: están en la lista
        </p>
      )}
    </>
  );
}
