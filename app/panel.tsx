import type { ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  ChartLineData01Icon,
  Clock01Icon,
  DeliveryTruck01Icon,
  Money01Icon,
  Package01Icon,
  ShoppingBag01Icon,
  Wallet01Icon,
} from "@hugeicons/core-free-icons";
import type { MagicBentoItem } from "@/components/MagicBento";
import { COURIERS } from "@/lib/central";
import type { Dia, Fila } from "@/lib/estadisticas";

const ICONOS = {
  ventas: ShoppingBag01Icon,
  central: Wallet01Icon,
  empaquetado: Package01Icon,
  despacho: DeliveryTruck01Icon,
  monto: Money01Icon,
  reloj: Clock01Icon,
  serie: ChartLineData01Icon,
  ir: ArrowRight01Icon,
};
type Icono = keyof typeof ICONOS;

export const clp = (n: number) => "$" + Number(n).toLocaleString("es-CL");
export const num = (n: number) => Number(n).toLocaleString("es-CL");
export const courier = (id: string) =>
  COURIERS.find((c) => c.id === id)?.label ?? id.replaceAll("_", " ");

// "2 h 15 min" / "35 min" / "3 d"; "—" when nothing is waiting
export function hace(desde: Date | null) {
  if (!desde) return "—";
  const min = Math.max(0, Math.round((Date.now() - desde.getTime()) / 60000));
  if (min < 60) return `${min} min`;
  if (min < 60 * 24)
    return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, " ")} min`.replace(
      "  ",
      " ",
    );
  return `${Math.floor(min / 1440)} d`;
}

function Tarjeta({
  icono,
  label,
  children,
}: {
  icono: Icono;
  label: string;
  children: ReactNode;
}) {
  return (
    <>
      <div className="magic-bento__header">
        <span className="magic-bento__icon">
          <HugeiconsIcon icon={ICONOS[icono]} size={16} strokeWidth={1.8} />
        </span>
        <span className="magic-bento__label">{label}</span>
      </div>
      {children}
    </>
  );
}

// one big number with a line of context under it
export function kpi(
  icono: Icono,
  label: string,
  valor: string,
  nota?: string,
): MagicBentoItem {
  return {
    id: label,
    content: (
      <Tarjeta icono={icono} label={label}>
        <div className="mt-auto">
          <p className="text-3xl font-semibold tabular-nums leading-none">
            {valor}
          </p>
          {nota && (
            <p className="magic-bento__description mt-2 truncate">{nota}</p>
          )}
        </div>
      </Tarjeta>
    ),
  };
}

// last 7 days as bars; the peak day is the solid one
export function serie(
  label: string,
  dias: Dia[],
  total: string,
): MagicBentoItem {
  const max = Math.max(...dias.map((d) => d.n), 1);
  const pico = Math.max(...dias.map((d) => d.n));
  return {
    id: label,
    colSpan: 2,
    content: (
      <Tarjeta icono="serie" label={label}>
        <div className="magic-bento__visual">
          <div className="magic-bento__bars">
            <div className="magic-bento__figure">
              <span className="magic-bento__figure-value">{total}</span>
              <span className="magic-bento__figure-note">últimos 7 días</span>
            </div>
            <div className="magic-bento__bars-plot">
              {dias.map((d, i) => (
                <span
                  key={d.dia}
                  title={`${d.dia}: ${d.n}`}
                  className="magic-bento__bar"
                  data-peak={d.n === pico && pico > 0 ? "" : undefined}
                  style={{ "--h": d.n / max, "--i": i } as React.CSSProperties}
                />
              ))}
            </div>
            <div className="mt-1 flex gap-[5px] text-[10px] text-[var(--mb-muted)]">
              {dias.map((d) => (
                <span key={d.dia} className="flex-1 text-center tabular-nums">
                  {d.n}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Tarjeta>
    ),
  };
}

// ranked rows with a thin bar; `nombre` rewrites the raw key (enum values, courier ids)
export function lista(
  icono: Icono,
  label: string,
  filas: Fila[],
  opts: { nombre?: (k: string) => string; vacio?: string; span?: number } = {},
): MagicBentoItem {
  const max = Math.max(...filas.map((f) => f.v), 1);
  return {
    id: label,
    colSpan: opts.span ?? 2,
    rowSpan: filas.length > 3 ? 2 : 1, // four or more rows do not fit one 150px row
    content: (
      <Tarjeta icono={icono} label={label}>
        {filas.length === 0 ? (
          <p className="magic-bento__description my-auto">
            {opts.vacio ?? "Sin datos todavía."}
          </p>
        ) : (
          <ul className="mt-auto space-y-2">
            {filas.map((f) => (
              <li key={f.k}>
                <div className="flex justify-between text-[13px] leading-4">
                  <span className="truncate first-letter:uppercase">
                    {opts.nombre ? opts.nombre(f.k) : f.k}
                  </span>
                  <span className="tabular-nums text-[var(--mb-muted)]">
                    {num(f.v)}
                  </span>
                </div>
                <div className="mt-1 h-1 rounded-full bg-[var(--mb-line)]">
                  <div
                    className="h-1 rounded-full bg-[rgb(var(--mb-accent-rgb))]"
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

// a card that is a link to the work screen
export function ir(href: string, label: string): MagicBentoItem {
  return {
    id: href,
    href,
    // fills the whole card (the negative margin cancels MagicBento's padding) in the accent color, so it reads as the action
    content: (
      <div className="-m-[var(--mb-pad)] flex flex-1 flex-col justify-between bg-primary p-[var(--mb-pad)] text-on-primary transition-colors hover:bg-primary-hover">
        <HugeiconsIcon icon={ICONOS.ir} size={20} strokeWidth={2} />
        <p className="text-lg font-semibold leading-tight">{label}</p>
      </div>
    ),
  };
}
