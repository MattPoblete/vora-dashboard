"use client";

import { useState, useTransition } from "react";
import { finalizarLive } from "./actions";

export function Finalizar({ id }: { id: number }) {
  const [confirmar, setConfirmar] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center gap-3">
      {error && <span className="text-sm text-danger-fg">{error}</span>}
      <button
        onClick={() =>
          confirmar
            ? start(async () => {
                const r = await finalizarLive(id);
                if (r.error) setError(r.error);
              })
            : setConfirmar(true)
        }
        onBlur={() => setConfirmar(false)}
        disabled={pending}
        className={`btn btn-chico border ${confirmar ? "border-danger bg-danger/10 text-danger-fg" : "btn-secundario"}`}
      >
        {pending
          ? "Finalizando…"
          : confirmar
            ? "¿Finalizar ahora?"
            : "Finalizar live"}
      </button>
    </div>
  );
}
