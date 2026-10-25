"use client";

import { useActionState, useState } from "react";
import { restablecerPassword, type CrearEstado } from "./actions";
import { copiarTexto } from "@/lib/portapapeles";

export function Restablecer({ id, usuario }: { id: number; usuario: string }) {
  const [state, action, pending] = useActionState<CrearEstado, FormData>(
    restablecerPassword,
    {},
  );
  const [confirmar, setConfirmar] = useState(false);
  const [copiado, setCopiado] = useState(false);

  if (state.clave)
    return (
      <div
        className="mt-4 rounded-xl border border-warning/40 bg-warning/10 p-3"
        aria-live="polite"
      >
        <p className="text-sm text-warning-fg">
          Nueva contraseña temporal de <b>{usuario}</b> (se muestra una sola
          vez; deberá cambiarla al entrar):
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <code className="select-all rounded-lg bg-surface-2 px-3 py-2 text-lg tracking-wide">
            {state.clave}
          </code>
          <button
            type="button"
            onClick={async () => {
              if (await copiarTexto(state.clave!)) setCopiado(true);
              setTimeout(() => setCopiado(false), 2000);
            }}
            className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm hover:bg-border"
          >
            {copiado ? "¡Copiado! ✓" : "Copiar"}
          </button>
        </div>
      </div>
    );

  return (
    <form action={action} className="mt-4 border-t border-border pt-4">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="usuario" value={usuario} />
      <button
        // first click only asks for confirmation; the second one submits
        onClick={(e) => {
          if (!confirmar) {
            e.preventDefault();
            setConfirmar(true);
          }
        }}
        onBlur={() => setConfirmar(false)}
        disabled={pending}
        className={`rounded-xl border px-4 py-2 text-sm font-medium ${confirmar ? "border-danger bg-danger/40" : "border-border bg-surface-2 hover:bg-border"}`}
      >
        {pending
          ? "…"
          : confirmar
            ? "¿Seguro? Se cerrarán sus sesiones"
            : "🔑 Restablecer contraseña"}
      </button>
      {state.error && (
        <p className="mt-2 text-sm text-danger-fg">{state.error}</p>
      )}
    </form>
  );
}
