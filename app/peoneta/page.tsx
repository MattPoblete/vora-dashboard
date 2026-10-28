import { Suspense } from "react";
import { connection } from "next/server";
import { db, requirePermiso } from "@/lib/session";
import { COURIERS } from "@/lib/central";
import { cargarDespacho } from "@/lib/despacho";
import { COLOR_COURIER } from "@/lib/empaque";
import { Glass } from "@/components/glass";
import { Buscador } from "@/components/buscador";
import { leerBusqueda } from "@/lib/busqueda";
import { AutoRefresh } from "@/components/auto-refresh";
import { Seccion } from "./seccion";

const PLACEHOLDER = "Buscar cliente, ciudad, paquete o número de venta…";

async function Tablero({ params }: { params: Promise<{ q?: string }> }) {
  await connection();
  const { q } = leerBusqueda(await params);
  await requirePermiso("despacho");
  const paquetes = await db((tx) => cargarDespacho(tx, q));
  if (!paquetes.length)
    return (
      <>
        {q && <Buscador placeholder={PLACEHOLDER} />}
        <Glass>
          <p className="py-10 text-center text-xl text-muted">
            {q
              ? "Ningún paquete coincide con la búsqueda."
              : "No hay paquetes por despachar."}
          </p>
        </Glass>
      </>
    );
  // same shape as the empty branch above, so the search box keeps its focus while you type
  return (
    <>
      <Buscador placeholder={PLACEHOLDER} />
      <div className="space-y-5">
        {COURIERS.map((c) => {
          const ps = paquetes.filter((p) => p.courier === c.id);
          if (!ps.length) return null;
          return c.id === "retiro_tienda" ? (
            <Seccion
              key={c.id}
              titulo="Retiro en tienda"
              accion="Entregado al cliente"
              paquetes={ps}
              tono={COLOR_COURIER[c.id]}
            />
          ) : (
            <Seccion
              key={c.id}
              titulo={c.label}
              accion={`Entregar a ${c.label}`}
              paquetes={ps}
              tono={COLOR_COURIER[c.id]}
            />
          );
        })}
      </div>
    </>
  );
}

export default function Page(props: PageProps<"/peoneta">) {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 pb-32 pt-6 text-text sm:px-8">
      <AutoRefresh />
      <div className="relative mx-auto max-w-3xl">
        <header className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Despacho</h1>
            <p className="text-muted">
              Paquetes por enviar · se actualiza solo
            </p>
          </div>
        </header>
        <Suspense
          fallback={<p className="text-center text-muted">Cargando…</p>}
        >
          <Tablero params={props.searchParams as Promise<{ q?: string }>} />
        </Suspense>
      </div>
    </main>
  );
}
