"use client";

import {
  createContext,
  startTransition,
  useActionState,
  useContext,
  useRef,
} from "react";
import type { Estado } from "../vender/actions";

const Pendiente = createContext(false);

// React 19 clears an uncontrolled <form action> after EVERY submit, errors included, which wipes what the
// user typed. Submitting through onSubmit keeps the fields; `resetOnOk` clears them only when it worked.
export function Form({
  action,
  children,
  className = "",
  mostrarOk = false,
  resetOnOk = false,
}: {
  action: (prev: Estado, fd: FormData) => Promise<Estado>;
  children: React.ReactNode;
  className?: string;
  mostrarOk?: boolean;
  resetOnOk?: boolean;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, run, pending] = useActionState<Estado, FormData>(
    async (prev, fd) => {
      const r = await action(prev, fd);
      if (resetOnOk && r.ok) ref.current?.reset();
      return r;
    },
    {},
  );
  return (
    <form
      ref={ref}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => run(fd));
      }}
    >
      <Pendiente.Provider value={pending}>{children}</Pendiente.Provider>
      {state.error && (
        <p className="mt-2 text-sm text-danger-fg">{state.error}</p>
      )}
      {mostrarOk && state.ok && (
        <p className="mt-2 text-sm text-success-fg">✓ {state.ok}</p>
      )}
    </form>
  );
}

export function Boton({
  children,
  className = "",
  disabled = false,
}: {
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const pending = useContext(Pendiente);
  return (
    <button
      disabled={pending || disabled}
      className={`rounded-xl px-4 py-2 font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {pending ? "…" : children}
    </button>
  );
}
