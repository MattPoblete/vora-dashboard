import { Suspense, type ReactNode } from "react";
import { AutoRefresh } from "./auto-refresh";

// Every screen: same gutter, same 6xl column and left edge, the title row, and the streamed content.
// `angosto` caps forms and short lists at a readable width without moving the left edge.
export function Pagina({
  titulo,
  subtitulo,
  accion,
  angosto = false,
  vivo = false,
  children,
}: {
  titulo?: string; // omitted when the content renders its own header (it depends on the request)
  subtitulo?: string;
  accion?: ReactNode;
  angosto?: boolean;
  vivo?: boolean; // polls the server every few seconds
  children: ReactNode;
}) {
  return (
    // room for the fixed navigation (components/dock.tsx): the bottom dock below lg (pb-32), the 53px top bar from lg
    <main className="min-h-screen px-4 pb-32 pt-8 text-text sm:px-8 sm:pt-10 lg:pb-16 lg:pt-24">
      {vivo && <AutoRefresh />}
      <div className="mx-auto max-w-6xl">
        {titulo && (
          <Encabezado titulo={titulo} subtitulo={subtitulo} accion={accion} />
        )}
        <div className={angosto ? "max-w-2xl" : ""}>
          <Suspense
            fallback={<p className="py-12 text-center text-muted">Cargando…</p>}
          >
            {children}
          </Suspense>
        </div>
      </div>
    </main>
  );
}

export function Encabezado({
  titulo,
  subtitulo,
  accion,
}: {
  titulo: string;
  subtitulo?: string;
  accion?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-medium tracking-tight sm:text-4xl">
          {titulo}
        </h1>
        {subtitulo && <p className="mt-1 text-muted">{subtitulo}</p>}
      </div>
      {accion}
    </header>
  );
}
