import { connection } from "next/server";
import { db, requirePermiso } from "@/lib/session";
import { COURIERS } from "@/lib/central";
import { cargarDespacho } from "@/lib/despacho";
import { COLOR_COURIER } from "@/lib/empaque";
import { Panel } from "@/components/panel";
import { Pagina } from "@/components/pagina";
import { Seccion } from "./seccion";

async function Tablero() {
  await connection();
  await requirePermiso("despacho");
  const paquetes = await db((q) => cargarDespacho(q));
  if (!paquetes.length)
    return (
      <Panel>
        <p className="py-12 text-center text-muted">
          No hay paquetes por despachar.
        </p>
      </Panel>
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
    <Pagina
      titulo="Despacho"
      subtitulo="Paquetes por enviar · se actualiza solo"
      vivo
      angosto
    >
      <Tablero />
    </Pagina>
  );
}
