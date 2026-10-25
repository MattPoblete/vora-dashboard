import { Suspense } from "react";
import { connection } from "next/server";
import { db, requirePermiso } from "@/lib/session";
import { COURIERS } from "@/lib/central";
import { cargarDespacho } from "@/lib/despacho";
import { COLOR_COURIER } from "@/lib/empaque";
import { Glass } from "@/components/glass";
import { Nav } from "@/components/nav";
import { AutoRefresh } from "@/components/auto-refresh";
import { Seccion } from "./seccion";

async function Tablero() {
  await connection();
  await requirePermiso("despacho");
  const paquetes = await db((q) => cargarDespacho(q));
  if (!paquetes.length)
    return (
      <Glass>
        <p className="py-10 text-center text-xl text-muted">
          No hay paquetes por despachar.
        </p>
      </Glass>
    );
  return (
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
  );
}

export default function Page() {
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
          <Nav />
        </header>
        <Suspense
          fallback={<p className="text-center text-muted">Cargando…</p>}
        >
          <Tablero />
        </Suspense>
      </div>
    </main>
  );
}
