"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const CAMPO =
  "h-11 rounded-xl border border-border bg-surface-2 text-text outline-none focus:border-primary";
// own chevron instead of the native one, which sits flush against the right edge
const FLECHA =
  "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23999%22 stroke-width=%222.5%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pl-3 pr-10";

// Search box (+ optional sort selector) for any list. It only owns the URL: `?q=` and `?orden=` (see lib/busqueda.ts for
// the server side). Every other param is kept, so it works under `?tab=` and next to `?abrir=`. Needs a <Suspense> above it.
export function Buscador({
  placeholder,
  ordenes,
  reiniciar = [],
}: {
  placeholder: string;
  ordenes?: Record<string, string>; // key -> label, the first one is the default; omit for no selector
  reiniciar?: string[]; // params dropped whenever the search changes (page number, open panel…)
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, start] = useTransition();
  const q = params.get("q") ?? "";
  const [texto, setTexto] = useState(q);
  const enviado = useRef(q); // last text we pushed to the URL: tells our own echo apart from an outside change

  const ir = (cambios: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const k of reiniciar) next.delete(k);
    for (const [k, v] of Object.entries(cambios)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const s = next.toString();
    start(() =>
      router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false }),
    );
  };

  // typing waits 300 ms so it doesn't fire a query per key
  useEffect(() => {
    const limpio = texto.trim();
    if (limpio === enviado.current) return;
    const t = setTimeout(() => {
      enviado.current = limpio;
      ir({ q: limpio });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  // the URL changed from outside (a link, back/forward): follow it
  useEffect(() => {
    if (q !== enviado.current) {
      enviado.current = q;
      setTexto(q);
    }
  }, [q]);

  const claves = ordenes ? Object.keys(ordenes) : [];
  return (
    <div className="mb-3 flex gap-2">
      <input
        type="search"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        aria-label="Buscar"
        className={`${CAMPO} min-w-0 flex-1 px-3`}
      />
      {ordenes && (
        <select
          value={claves.find((k) => k === params.get("orden")) ?? claves[0]}
          onChange={(e) =>
            ir({ orden: e.target.value === claves[0] ? "" : e.target.value })
          }
          aria-label="Ordenar por"
          className={`${CAMPO} ${FLECHA}`}
        >
          {Object.entries(ordenes).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
