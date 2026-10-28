import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { db, requirePermiso } from "@/lib/session";
import { cargarEmpaque } from "@/lib/empaque";
import { Glass } from "@/components/glass";
import { Buscador } from "@/components/buscador";
import { leerBusqueda } from "@/lib/busqueda";
import { AutoRefresh } from "@/components/auto-refresh";
import { Cola, type ItemCola } from "@/components/cola";
import { COLOR_COURIER, nombreCourier } from "@/lib/empaque";
import { Card } from "./card";

const PLACEHOLDER = "Buscar cliente, teléfono, pedido o número de venta…";
type Params = { abrir?: string; q?: string };

async function Tablero({ params }: { params: Promise<Params> }) {
  await connection();
  const p = await params;
  const { abrir } = p;
  const { q } = leerBusqueda(p);
  await requirePermiso("empaquetado");
  const paquetes = await db((tx) => cargarEmpaque(tx, undefined, q));
  if (!paquetes.length)
    return (
      <>
        {q && <Buscador placeholder={PLACEHOLDER} reiniciar={["abrir"]} />}
        <Glass>
          <p className="py-10 text-center text-xl text-muted">
            {q
              ? "Ningún pedido coincide con la búsqueda."
              : "Nada por empaquetar. Aparecerá acá cuando central lo libere."}
          </p>
        </Glass>
      </>
    );
  const items: ItemCola[] = paquetes.map((p) => ({
    anchor: `pedido-${p.pedido}`,
    titulo: p.cliente,
    etiqueta: nombreCourier(p.courier),
    tono: COLOR_COURIER[p.courier],
    subtitulo: `${p.prendas.length} prenda(s) · pedido #${p.pedido}`,
    lineas: [p.prendas.map((x) => "#" + x.codigo).join("  ")],
    desde: p.cerrado_en.toISOString(),
  }));
  const porCourier = items.reduce<Record<string, number>>(
    (acc, it) => ({ ...acc, [it.etiqueta]: (acc[it.etiqueta] ?? 0) + 1 }),
    {},
  );
  // only the order named in ?abrir= gets its full card rendered (and sent to the browser)
  const abrirId = /^pedido-(\d+)$/.exec(abrir ?? "")?.[1];
  const abierto = abrirId
    ? paquetes.find((p) => p.pedido === Number(abrirId))
    : undefined;
  const detalles = abierto
    ? {
        [`pedido-${abierto.pedido}`]: <Card key={abierto.pedido} p={abierto} />,
      }
    : {};
  return (
    <>
      <Buscador placeholder={PLACEHOLDER} reiniciar={["abrir"]} />
      <div className="mb-5 flex justify-end">
        <Link
          href={`/empaquetar/etiquetas?ids=${paquetes.map((p) => p.pedido).join(",")}`}
          prefetch={false}
          target="_blank"
          className="rounded-full border border-border bg-surface-2 px-5 py-2 text-sm font-medium backdrop-blur-xl hover:bg-border"
        >
          🖨 Imprimir {q ? "estas" : "todas las"} etiquetas ({paquetes.length})
        </Link>
      </div>
      <Glass
        title={`Cola de empaquetado · ${items.length}`}
        className="p-3! sm:p-6!"
      >
        <Cola
          items={items}
          detalles={detalles}
          ayuda="La carta de adelante es el pedido que lleva más tiempo esperando. Haz clic en una para abrir el pedido completo; arrastra la de adelante para ver la siguiente."
          resumen={Object.entries(porCourier).map(([nombre, n]) => ({
            nombre,
            n,
          }))}
        />
      </Glass>
    </>
  );
}

export default function Page(props: PageProps<"/empaquetar">) {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 pb-32 pt-8 text-text sm:px-8">
      <AutoRefresh />
      <div className="relative mx-auto max-w-7xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Empaquetado</h1>
            <p className="text-muted">
              Pedidos por empaquetar · se actualiza solo
            </p>
          </div>
        </header>
        <Suspense
          fallback={<p className="text-center text-muted">Cargando…</p>}
        >
          <Tablero params={props.searchParams as Promise<Params>} />
        </Suspense>
      </div>
    </main>
  );
}
