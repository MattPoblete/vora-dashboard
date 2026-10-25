import type { ReactNode } from "react";
import type { ItemBento } from "@/components/bento";
import { COURIERS } from "@/lib/central";
import { duracion, num } from "@/lib/formato";
import type { Dia, Fila } from "@/lib/estadisticas";

export { clp, num } from "@/lib/formato";
export const courier = (id: string) =>
  COURIERS.find((c) => c.id === id)?.label ?? id.replaceAll("_", " ");

// how long the oldest one has waited; "—" when nothing is waiting
export function hace(desde: Date | null) {
  if (!desde) return "—";
  return duracion(
    Math.max(0, Math.round((Date.now() - desde.getTime()) / 60000)),
  );
}

function Tarjeta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
      {children}
    </>
  );
}

// one big number with a line of context under it
export function kpi(label: string, valor: string, nota?: string): ItemBento {
  return {
    id: label,
    content: (
      <Tarjeta label={label}>
        <p className="mt-3 truncate font-display text-3xl tabular-nums leading-none sm:text-5xl">
          {valor}
        </p>
        {nota && <p className="mt-1.5 truncate text-sm text-muted">{nota}</p>}
      </Tarjeta>
    ),
  };
}

// last 7 days as bars, the day under each one; the peak day is the solid one, empty days draw nothing
export function serie(label: string, dias: Dia[], total: string): ItemBento {
  const max = Math.max(...dias.map((d) => d.n), 1);
  const pico = Math.max(...dias.map((d) => d.n));
  return {
    id: label,
    colSpan: 2,
    content: (
      <Tarjeta label={label}>
        <p className="mt-3 text-sm text-muted">
          <span className="font-display text-2xl tabular-nums text-text">
            {total}
          </span>{" "}
          últimos 7 días
        </p>
        <div className="mt-4 flex h-20 items-end gap-2">
          {dias.map((d) => (
            <div
              key={d.dia}
              title={`${d.dia}: ${d.n}`}
              className={`flex-1 rounded-t-sm ${d.n === pico && pico > 0 ? "bg-primary" : "bg-primary-soft"}`}
              style={{ height: `${(d.n / max) * 100}%` }}
            />
          ))}
        </div>
        <div className="mt-1.5 flex gap-2 border-t border-border pt-1.5 text-[11px] text-muted">
          {dias.map((d) => (
            <span key={d.dia} className="flex-1 text-center tabular-nums">
              {d.dia}
            </span>
          ))}
        </div>
      </Tarjeta>
    ),
  };
}

// ranked rows with a thin bar; `nombre` rewrites the raw key (enum values, courier ids)
export function lista(
  label: string,
  filas: Fila[],
  opts: {
    nombre?: (k: string) => string;
    color?: (k: string) => string; // bar class per row (semantic states); brand color otherwise
    vacio?: string;
    arroba?: boolean;
  } = {},
): ItemBento {
  const max = Math.max(...filas.map((f) => f.v), 1);
  return {
    id: label,
    colSpan: 2,
    content: (
      <Tarjeta label={label}>
        {filas.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            {opts.vacio ?? "Sin datos todavía."}
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {filas.map((f) => (
              <li key={f.k}>
                <div className="flex justify-between text-sm">
                  <span
                    className={`truncate ${opts.arroba ? "" : "first-letter:uppercase"}`}
                  >
                    {opts.arroba ? "@" : ""}
                    {opts.nombre ? opts.nombre(f.k) : f.k}
                  </span>
                  <span className="tabular-nums text-muted">{num(f.v)}</span>
                </div>
                <div className="mt-1.5 h-1 bg-surface-2">
                  <div
                    className={`h-1 ${opts.color?.(f.k) ?? "bg-primary"}`}
                    style={{ width: `${(f.v / max) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>
    ),
  };
}

// the screen this tab summarizes: shown as the button in the header, not as a card
export function ir(href: string, label: string): ItemBento {
  return { id: href, href, content: label };
}
