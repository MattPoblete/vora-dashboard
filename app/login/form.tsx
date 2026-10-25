"use client";

import { useActionState } from "react";
import { login, type LoginEstado } from "./actions";

const campo =
  "h-14 w-full rounded-2xl border border-border bg-surface-2 px-5 text-lg text-text outline-none placeholder:text-muted/70 focus:border-primary focus:ring-4 focus:ring-primary/25";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginEstado, FormData>(
    login,
    {},
  );
  return (
    <form action={action} className="space-y-4">
      <input
        name="usuario"
        placeholder="Usuario"
        autoComplete="username"
        autoCapitalize="none"
        autoFocus
        required
        className={campo}
      />
      <input
        name="clave"
        type="password"
        placeholder="Contraseña"
        autoComplete="current-password"
        required
        className={campo}
      />
      <button
        disabled={pending}
        className="h-14 w-full rounded-2xl bg-primary text-on-primary hover:bg-primary-hover text-lg font-semibold disabled:opacity-60"
      >
        {pending ? "Entrando…" : "Entrar"}
      </button>
      <p
        className="min-h-6 text-center text-sm text-danger-fg"
        aria-live="polite"
      >
        {state.error}
      </p>
    </form>
  );
}
