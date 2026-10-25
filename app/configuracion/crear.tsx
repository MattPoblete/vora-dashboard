"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import { PANTALLAS } from "@/lib/permisos";
import { Glass } from "@/components/glass";
import { crearUsuario, type CrearEstado } from "./actions";
import { copiarTexto } from "@/lib/portapapeles";

const campo =
  "h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-text outline-none placeholder:text-muted/70 focus:border-primary";
const caja =
  "flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface-2/50 p-3 has-[:checked]:border-primary has-[:checked]:bg-primary-soft";

export function CrearUsuario() {
  const form = useRef<HTMLFormElement>(null);
  // clear the fields only when the user was created; on an error keep what was typed
  const [state, action, pending] = useActionState<CrearEstado, FormData>(
    async (prev, fd) => {
      const r = await crearUsuario(prev, fd);
      if (r.clave) form.current?.reset();
      return r;
    },
    {},
  );
  const [copiado, setCopiado] = useState(false);

  return (
    <details className="mb-6 group">
      <summary className="inline-block cursor-pointer list-none rounded-full bg-primary text-on-primary hover:bg-primary-hover px-5 py-2 font-medium">
        + Nuevo usuario
      </summary>
      <div className="mt-4 max-w-2xl">
        <Glass title="Nuevo usuario">
          <form
            ref={form}
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              startTransition(() => action(fd));
            }}
          >
            <input
              name="usuario"
              placeholder="Usuario (ej: ana)"
              autoComplete="off"
              autoCapitalize="none"
              required
              className={campo}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              {PANTALLAS.map((p) => (
                <label key={p.id} className={caja}>
                  <input
                    type="checkbox"
                    name="permisos"
                    value={p.id}
                    className="mt-1 h-5 w-5 accent-primary"
                  />
                  <span>
                    <span className="block font-medium">{p.label}</span>
                    <span className="block text-xs text-muted">
                      {p.detalle}
                    </span>
                  </span>
                </label>
              ))}
              <label className={`${caja} sm:col-span-2`}>
                <input
                  type="checkbox"
                  name="permisos"
                  value="admin"
                  className="mt-1 h-5 w-5 accent-primary"
                />
                <span>
                  <span className="block font-medium">Administrador</span>
                  <span className="block text-xs text-muted">
                    Entra a todo, ve el resumen y esta configuración
                  </span>
                </span>
              </label>
            </div>
            <button
              disabled={pending}
              className="rounded-xl bg-success text-on-primary hover:brightness-110 px-5 py-2 font-medium disabled:opacity-60"
            >
              {pending ? "Creando…" : "Crear usuario"}
            </button>
            {state.error && (
              <p className="text-sm text-danger-fg">{state.error}</p>
            )}
          </form>

          {state.clave && (
            <div
              className="mt-4 rounded-xl border border-success/40 bg-success/10 p-4"
              aria-live="polite"
            >
              <p className="text-success-fg">
                ✓ Usuario <b>{state.usuario}</b> creado. Contraseña temporal (se
                muestra una sola vez); deberá cambiarla al entrar:
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
          )}
        </Glass>
      </div>
    </details>
  );
}
