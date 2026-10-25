"use client";

import { useRef, useState } from "react";
import { copiarTexto } from "@/lib/portapapeles";

export function Mensaje({ texto }: { texto: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [ok, setOk] = useState(false);
  const pendiente = texto.includes("[");

  return (
    <div>
      {/* key: re-seed the editable copy only when the sales change, not on every poll */}
      <textarea
        key={texto}
        ref={ref}
        defaultValue={texto}
        rows={12}
        className="w-full resize-y rounded-xl border border-border bg-surface-2 p-3 text-sm leading-relaxed text-text outline-none focus:border-primary"
      />
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={async () => {
            if (await copiarTexto(ref.current?.value ?? texto)) setOk(true);
            setTimeout(() => setOk(false), 2000);
          }}
          className="rounded-xl bg-primary text-on-primary hover:bg-primary-hover px-4 py-2 font-medium"
        >
          {ok ? "¡Copiado! ✓" : "Copiar mensaje"}
        </button>
        {pendiente && (
          <span className="text-sm text-warning-fg">
            ⚠ Aún tiene datos de transferencia de ejemplo [entre corchetes]
          </span>
        )}
      </div>
    </div>
  );
}

// the second copy is generated on demand, so the section stays quiet until central needs it
export function Generador({ boton, texto }: { boton: string; texto: string }) {
  const [abierto, setAbierto] = useState(false);
  if (!abierto)
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-xl border border-border bg-surface-2 px-4 py-2 font-medium hover:bg-border"
      >
        {boton}
      </button>
    );
  return <Mensaje texto={texto} />;
}
