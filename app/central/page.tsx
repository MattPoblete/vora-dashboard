import { connection } from "next/server";
import { db, requirePermiso } from "@/lib/session";
import { cargar } from "@/lib/central";
import { Panel } from "@/components/panel";
import { Pagina } from "@/components/pagina";
import { Cola, type ItemCola } from "@/components/cola";
import { clp, prendas } from "@/lib/formato";
import { Card, estadoTarjeta } from "./card";

async function Tablero({ params }: { params: Promise<{ abrir?: string }> }) {
  await connection();
  const { abrir } = await params;
  await requirePermiso("central");
  const tarjetas = await db((q) => cargar(q));
  if (!tarjetas.length)
    return (
      <Panel>
        <p className="py-12 text-center text-muted">
          Sin ventas pendientes. Aparecerán acá apenas los vendedores las
          registren.
        </p>
      </Panel>
    );
  const items: ItemCola[] = tarjetas.map((t) => {
    const [etiqueta, tono] = estadoTarjeta(t);
    const esperando = t.ventas.filter(
      (v) => v.estado === "reservada" || v.estado === "esperando_pago",
    );
    return {
      anchor: `cliente-${t.cliente.id}`,
      titulo: `@${t.cliente.nombre}`,
      etiqueta,
      tono,
      subtitulo: `${prendas(t.ventas.length)} · ${clp(t.total)}`,
      lineas: [
        t.ventas.map((v) => "#" + v.codigo).join("  "),
        t.faltantes[0]
          ? `Falta: ${t.faltantes[0]}`
          : "Todo listo para empaquetar",
      ],
      desde: esperando[0]?.creado_en.toISOString(),
    };
  });
  // how many orders sit in each stage, for the summary next to the queue
  const porEstado = items.reduce<Record<string, number>>(
    (acc, it) => ({ ...acc, [it.etiqueta]: (acc[it.etiqueta] ?? 0) + 1 }),
    {},
  );
  // only the order named in ?abrir= gets its full card rendered (and sent to the browser)
  const abrirId = /^cliente-(\d+)$/.exec(abrir ?? "")?.[1];
  const abierta = abrirId
    ? tarjetas.find((t) => t.cliente.id === Number(abrirId))
    : undefined;
  const detalles = abierta
    ? {
        [`cliente-${abierta.cliente.id}`]: (
          <Card key={abierta.cliente.id} t={abierta} />
        ),
      }
    : {};
  return (
    <Panel title={`Cola de pedidos · ${items.length}`}>
      <Cola
        items={items}
        detalles={detalles}
        resumen={Object.entries(porEstado).map(([nombre, n]) => ({
          nombre,
          n,
        }))}
      />
    </Panel>
  );
}

export default function Page(props: PageProps<"/central">) {
  return (
    <Pagina
      titulo="Central"
      subtitulo="Ventas por confirmar · se actualiza sola"
      vivo
    >
      <Tablero params={props.searchParams as Promise<{ abrir?: string }>} />
    </Pagina>
  );
}
