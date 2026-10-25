"use client";

import { useActionState } from "react";
import { login, type LoginEstado } from "./actions";

const campo = "campo";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginEstado, FormData>(
    login,
    {},
  );
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Usuario</span>
        <input
          name="usuario"
          autoComplete="username"
          autoCapitalize="none"
          autoFocus
          required
          className={campo}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Contraseña</span>
        <input
          name="clave"
          type="password"
          autoComplete="current-password"
          required
          className={campo}
        />
      </label>
      <button disabled={pending} className="btn btn-primario h-11! w-full">
        {pending ? "Entrando…" : "Entrar"}
      </button>
      <p
        // empty: out of the layout but still announced when the error appears
        className="text-center text-sm text-danger-fg empty:sr-only"
        aria-live="polite"
      >
        {state.error}
      </p>
    </form>
  );
}
