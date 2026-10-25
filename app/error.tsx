"use client";

import { Panel } from "@/components/panel";

// unexpected errors in any screen; the details stay in the server log, matched by the digest
export default function Error({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  const digest =
    error instanceof Error && "digest" in error ? String(error.digest) : null;
  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 text-text">
      <div className="relative w-full max-w-md">
        <Panel title="Algo salió mal">
          <p className="mb-6 text-lg">
            No se pudo completar la acción. Intenta de nuevo; si sigue pasando,
            avísale a un administrador
            {digest && (
              <>
                {" "}
                con este código: <code className="font-mono">{digest}</code>
              </>
            )}
            .
          </p>
          <button onClick={() => retry()} className="btn btn-primario w-full">
            Reintentar
          </button>
        </Panel>
      </div>
    </main>
  );
}
