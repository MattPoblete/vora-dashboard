"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { agregarVenta, type Estado } from "./actions";

type Sug = { nombre: string; telefono: string | null; compras: number };
const TALLAS = ["XS", "S", "M", "L", "XL", "XXL"];
const PRECIOS = [5000, 8000, 10000, 15000, 20000];
const input = "campo px-4!";

export function VentaForm({
  live,
  materiales,
}: {
  live: number;
  materiales: string[];
}) {
  const nickRef = useRef<HTMLInputElement>(null);
  const [nick, setNick] = useState("");
  const [precio, setPrecio] = useState("");
  const [conDetalle, setConDetalle] = useState(false);
  const [state, action, pending] = useActionState<Estado, FormData>(
    // after a successful add: clear and jump back to the nick field for the next comment
    async (prev, fd) => {
      const r = await agregarVenta(prev, fd);
      if (r.ok) {
        // state updates after an await must be re-wrapped or React drops them
        startTransition(() => {
          setNick("");
          setPrecio("");
          setConDetalle(false);
        });
        nickRef.current?.focus();
      }
      return r;
    },
    {},
  );
  const [sugs, setSugs] = useState<Sug[]>([]);

  useEffect(() => {
    const q = nick.replace(/^@/, "").trim();
    if (!q) return;
    const ac = new AbortController();
    fetch(`/api/clientes?q=${encodeURIComponent(q)}`, { signal: ac.signal })
      .then((r) => r.json())
      .then(setSugs)
      .catch(() => {});
    return () => ac.abort();
  }, [nick]);

  const clean = nick.replace(/^@/, "").trim().toLowerCase();
  const visibles = clean ? sugs : [];
  const match = visibles.find((s) => s.nombre.toLowerCase() === clean);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="live" value={live} />

      <div>
        <label className="mb-2 block text-sm font-medium">Nick / @</label>
        <input
          ref={nickRef}
          name="nick"
          value={nick}
          onChange={(e) => setNick(e.target.value)}
          list="sugs"
          autoFocus
          autoComplete="off"
          autoCapitalize="none"
          placeholder="@usuario"
          className={`${input} h-14! text-2xl`}
        />
        <datalist id="sugs">
          {visibles.map((s) => (
            <option
              key={s.nombre + s.telefono}
              value={s.nombre}
              label={`${s.compras} compras${s.telefono ? " · +" + s.telefono : ""}`}
            />
          ))}
        </datalist>
        <p className="mt-2 h-6 text-sm">
          {match ? (
            <span className="text-success-fg">
              ✓ Cliente registrado · {match.compras} compras
              {match.telefono ? ` · +${match.telefono}` : ""}
            </span>
          ) : clean ? (
            <span className="text-warning-fg">Cliente nuevo</span>
          ) : null}
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Precio</label>
        <input
          name="precio"
          value={precio}
          onChange={(e) => setPrecio(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          placeholder="10000"
          className={`${input} h-14! text-2xl tabular-nums`}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {PRECIOS.map((p) => (
            <button
              key={p}
              type="button"
              tabIndex={-1}
              onClick={() => setPrecio(String(p))}
              className="btn btn-secundario btn-chico tabular-nums"
            >
              ${p.toLocaleString("es-CL")}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="mb-2 block text-sm font-medium">Talla</span>
        <div className="flex flex-wrap gap-3">
          {TALLAS.map((t) => (
            <label key={t}>
              <input
                type="radio"
                name="talla"
                value={t}
                required
                className="peer sr-only"
              />
              <span className="flex h-12 min-w-14 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface px-4 text-lg font-medium peer-checked:border-primary peer-checked:bg-primary-soft peer-focus-visible:ring-4 peer-focus-visible:ring-primary/25">
                {t}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Material</label>
        <input
          name="material"
          list="materiales"
          autoComplete="off"
          placeholder="softshell, cortavientos…"
          className={`${input} h-14! text-2xl`}
        />
        <datalist id="materiales">
          {materiales.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Código</label>
        <input
          name="codigo"
          inputMode="numeric"
          pattern="\d{1,4}"
          maxLength={4}
          required
          placeholder="123"
          className={`${input} h-14! text-2xl font-semibold tabular-nums`}
        />
      </div>

      <div>
        <label className="flex cursor-pointer items-center gap-3 text-lg">
          <input
            type="checkbox"
            checked={conDetalle}
            onChange={(e) => setConDetalle(e.target.checked)}
            className="size-5"
          />
          Prenda con detalles
        </label>
        {conDetalle && (
          <textarea
            name="observaciones"
            autoFocus
            rows={2}
            placeholder="Observaciones: mancha, descosido, falta botón…"
            className={`${input} mt-3 h-12! text-lg`}
          />
        )}
      </div>

      <button
        disabled={pending}
        className="btn btn-primario h-14! w-full text-lg! font-semibold"
      >
        {pending ? "Agregando…" : "Agregar"}
      </button>

      <p className="h-6 text-center" aria-live="polite">
        {state.ok && <span className="text-success-fg">{state.ok}</span>}
        {state.error && <span className="text-danger-fg">{state.error}</span>}
      </p>
    </form>
  );
}
