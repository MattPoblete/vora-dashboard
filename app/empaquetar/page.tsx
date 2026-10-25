import Link from "next/link";
import { connection } from "next/server";
import { db, requirePermiso } from "@/lib/session";
import { cargarEmpaque } from "@/lib/empaque";
import { Panel } from "@/components/panel";
import { Pagina } from "@/components/pagina";
import { Cola, type ItemCola } from "@/components/cola";
import { COLOR_COURIER, nombreCourier } from "@/lib/empaque";
import { prendas } from "@/lib/formato";
import { Card } from "./card";

async function Tablero({ params }: { params: Promise<{ abrir?: string }> }) {
  await connection();
  const { abrir } = await params;
  await requirePermiso("empaquetado");
  const paquetes = await db((q) => cargarEmpaque(q));
  if (!paquetes.length)
    return (
      <Panel>
        <p className="py-12 text-center text-muted">
          Nada por empaquetar. Aparecerá acá cuando central lo libere.
        </p>
      </Panel>
    );
  const items: ItemCola[] = paquetes.map((p) => ({
    anchor: `pedido-${p.pedido}`,
    titulo: `@${p.cliente}`,
    etiqueta: nombreCourier(p.courier),
    tono: COLOR_COURIER[p.courier],
    subtitulo: `${prendas(p.prendas.length)} · pedido #${p.pedido}`,
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
      <div className="mb-5 flex justify-end">
        <Link
          href={`/empaquetar/etiquetas?ids=${paquetes.map((p) => p.pedido).join(",")}`}
          prefetch={false}
          target="_blank"
          className="btn btn-secundario"
        >
          Imprimir etiquetas ({paquetes.length})
        </Link>
      </div>
      <Panel
        title={`Cola de empaquetado · ${items.length}`}
        className="p-3! sm:p-6!"
      >
        <Cola
          items={items}
          detalles={detalles}
          resumen={Object.entries(porCourier).map(([nombre, n]) => ({
            nombre,
            n,
          }))}
        />
      </Panel>
    </>
  );
}

export default function Page(props: PageProps<"/empaquetar">) {
  return (
    <Pagina
      titulo="Empaquetado"
      subtitulo="Pedidos por empaquetar · se actualiza solo"
      vivo
    >
      <Tablero params={props.searchParams as Promise<{ abrir?: string }>} />
    </Pagina>
  );
}
