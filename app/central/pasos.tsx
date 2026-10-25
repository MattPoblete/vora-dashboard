"use client";

import {
  Children,
  isValidElement,
  useState,
  useTransition,
  type ReactElement,
  type ReactNode,
} from "react";
import { pasarAEmpaquetar } from "./actions";

// one step of PasosCentral: only its title is read here, the body is shown when the step is open
export function Step({ children }: { title: string; children: ReactNode }) {
  return <>{children}</>;
}

// Numbered steps with labels (any step can be opened), the open step's body, and Atrás / Siguiente at the bottom.
// The last button is the real "pasar a por empaquetar": the server action re-checks everything, and `completo` just
// keeps the button disabled until nothing is missing.
export function PasosCentral({
  cliente,
  inicial,
  completo,
  children,
}: {
  cliente: number;
  inicial: number;
  completo: boolean;
  children: ReactNode;
}) {
  const pasos = Children.toArray(children).filter(
    isValidElement,
  ) as ReactElement<{ title: string }>[];
  const [paso, setPaso] = useState(inicial);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const ir = (n: number) => {
    setPaso(n);
    setError("");
  };
  const ultimo = paso === pasos.length;

  return (
    <>
      <ol className="mb-6 grid grid-flow-col auto-cols-fr gap-1 rounded-xl bg-surface-2 p-1">
        {pasos.map((s, i) => {
          const n = i + 1;
          const estado = n === paso ? "actual" : n < paso ? "hecho" : "";
          return (
            <li key={n}>
              <button
                type="button"
                onClick={() => ir(n)}
                aria-current={estado === "actual" ? "step" : undefined}
                className={`flex w-full flex-col items-center gap-1 rounded-lg px-2 py-2 text-xs font-medium sm:flex-row sm:justify-center sm:text-sm ${
                  estado === "actual"
                    ? "bg-surface text-text shadow-sm"
                    : "text-muted hover:text-text"
                }`}
              >
                <span
                  className={`grid size-5 place-items-center rounded-full text-[11px] tabular-nums ${
                    estado === "hecho"
                      ? "bg-primary text-on-primary"
                      : estado === "actual"
                        ? "bg-text text-surface"
                        : "border border-border"
                  }`}
                >
                  {estado === "hecho" ? "✓" : n}
                </span>
                {s.props.title}
              </button>
            </li>
          );
        })}
      </ol>

      {pasos[paso - 1]}

      {/* sticky: the modal scrolls, the way forward stays in view */}
      <div className="sticky bottom-0 -mx-6 -mb-6 mt-6 flex items-center justify-between gap-3 border-t border-border bg-surface px-6 py-4">
        {paso > 1 ? (
          <button
            type="button"
            onClick={() => ir(paso - 1)}
            className="h-10 rounded-lg px-4 text-sm font-medium text-muted hover:bg-surface-2 hover:text-text"
          >
            Atrás
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          disabled={pending || (ultimo && !completo)}
          title={ultimo && !completo ? "Faltan datos del pedido" : undefined}
          onClick={() =>
            ultimo
              ? start(async () => {
                  const fd = new FormData();
                  fd.set("cliente", String(cliente));
                  const r = await pasarAEmpaquetar({}, fd);
                  if (r.error) setError(r.error);
                })
              : ir(paso + 1)
          }
          className="h-10 rounded-lg bg-primary px-5 text-sm font-medium text-on-primary hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {ultimo
            ? pending
              ? "Pasando…"
              : "Pasar a por empaquetar"
            : "Siguiente"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-danger-fg">{error}</p>}
    </>
  );
}
