"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { borrarVenta, editarVenta, type Estado } from "./actions";

export type Venta = {
  id: number;
  codigo: number;
  nick: string | null;
  talla: string | null;
  material: string | null;
  detalle: string | null;
  monto: number | null;
  respaldo: number;
};

const field =
  "h-12 w-full rounded-xl border border-border bg-surface-2 px-3 text-lg text-text outline-none focus:border-primary";

function Editar({ v, onDone }: { v: Venta; onDone: () => void }) {
  const [state, action, pending] = useActionState<Estado, FormData>(
    editarVenta,
    {},
  );
  useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="space-y-2 py-3">
      <input type="hidden" name="id" value={v.id} />
      <div className="grid grid-cols-2 gap-2">
        <input
          name="nick"
          defaultValue={v.nick ?? ""}
          placeholder="Nick"
          autoComplete="off"
          className={field}
        />
        <input
          name="codigo"
          defaultValue={v.codigo}
          inputMode="numeric"
          pattern="\d{1,4}"
          maxLength={4}
          placeholder="Código"
          className={field}
        />
        <input
          name="precio"
          defaultValue={v.monto ?? ""}
          inputMode="numeric"
          placeholder="Precio"
          className={field}
        />
        <input
          name="talla"
          defaultValue={v.talla ?? ""}
          placeholder="Talla"
          className={field}
        />
        <input
          name="material"
          defaultValue={v.material ?? ""}
          placeholder="Material"
          list="materiales"
          className={`${field} col-span-2`}
        />
        <input
          name="observaciones"
          defaultValue={v.detalle ?? ""}
          placeholder="Observaciones (opcional)"
          className={`${field} col-span-2`}
        />
      </div>
      <div className="flex items-center gap-2">
        <button
          disabled={pending}
          className="h-11 flex-1 rounded-xl bg-primary text-on-primary hover:bg-primary-hover font-medium disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="h-11 rounded-xl border border-border bg-surface-2 px-4"
        >
          Cancelar
        </button>
      </div>
      {state.error && <p className="text-sm text-danger-fg">{state.error}</p>}
    </form>
  );
}

function Fila({ v }: { v: Venta }) {
  const [editando, setEditando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  if (editando)
    return (
      <li>
        <Editar v={v} onDone={() => setEditando(false)} />
      </li>
    );

  const borrar = () =>
    start(async () => {
      const r = await borrarVenta(v.id);
      if (r.error) setError(r.error);
    });

  return (
    <li className="py-3">
      <div className="flex items-center gap-3">
        <span className="w-14 text-xl font-semibold tabular-nums text-primary">
          #{v.codigo}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate">
            {v.nick}
            {v.respaldo > 0 && (
              <span className="ml-2 text-xs text-muted">
                +{v.respaldo} en fila
              </span>
            )}
          </span>
          {/* second line, always: even on desktop this column is only about as wide as a phone */}
          <span className="block truncate text-xs text-muted">
            {[v.talla, v.material].filter(Boolean).join(" · ")}
          </span>
        </span>
        <span className="w-20 text-right tabular-nums">
          ${Number(v.monto).toLocaleString("es-CL")}
        </span>
        <button
          onClick={() => {
            setError("");
            setEditando(true);
          }}
          aria-label={`Editar #${v.codigo}`}
          className="h-10 w-10 rounded-xl border border-border bg-surface-2 hover:bg-border"
        >
          ✎
        </button>
        <button
          onClick={() => (confirmar ? borrar() : setConfirmar(true))}
          onBlur={() => setConfirmar(false)}
          disabled={pending}
          aria-label={`Borrar #${v.codigo}`}
          className={`h-10 rounded-xl border px-3 ${confirmar ? "border-danger bg-danger/40 text-sm" : "w-10 border-border bg-surface-2 hover:bg-border"}`}
        >
          {confirmar ? "¿Borrar?" : "✕"}
        </button>
      </div>
      {v.detalle && (
        <p className="mt-1 text-sm text-warning-fg">⚠ {v.detalle}</p>
      )}
      {error && <p className="mt-1 text-sm text-danger-fg">{error}</p>}
    </li>
  );
}

export function Lista({ ventas }: { ventas: Venta[] }) {
  return (
    <ul className="divide-y divide-border">
      {ventas.map((v) => (
        <Fila key={v.id} v={v} />
      ))}
    </ul>
  );
}
