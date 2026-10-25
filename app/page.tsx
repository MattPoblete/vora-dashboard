import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import type { Sql } from "postgres";
import { db, esAdmin, requirePermiso, type Sesion } from "@/lib/session";
import { PANTALLAS, type Pantalla } from "@/lib/permisos";
import {
  estadAdmin,
  estadCentral,
  estadDespacho,
  estadEmpaque,
  estadVentas,
} from "@/lib/estadisticas";
import { Nav } from "@/components/nav";
import { Bento } from "@/components/bento";
import type { MagicBentoItem } from "@/components/MagicBento";
import { clp, courier, hace, ir, kpi, lista, num, serie } from "./panel";
import { Auditoria, type ParamsAuditoria } from "./auditoria";

const ESTADOS: Record<string, string> = {
  reservada: "Reservadas",
  esperando_pago: "Esperando pago",
  pagada: "Pagadas, por liberar",
  por_empaquetar: "Por empaquetar",
  por_enviar: "Por enviar",
  enviada: "Enviadas",
  liberada: "Liberadas",
  no_habla: "No habla",
  no_se_encuentra: "No se encuentra",
  empaquetada: "Empaquetadas",
};
const estado = (k: string) => ESTADOS[k] ?? k.replaceAll("_", " ");
const suma = (d: { n: number }[]) => num(d.reduce((a, x) => a + x.n, 0));

// one loader per role: each returns the cards for that part of the operation
const PANELES: Record<Pantalla, (q: Sql) => Promise<MagicBentoItem[]>> = {
  async ventas(q) {
    const { hoy, live, semana, materiales } = await estadVentas(q);
    return [
      kpi("ventas", "Ventas de hoy", num(hoy.n), clp(hoy.monto)),
      kpi(
        "monto",
        "Live en curso",
        live ? num(live.n) : "—",
        live ? `${live.vendedores} · ${clp(live.monto)}` : "Sin live activo",
      ),
      serie("Ventas por día", semana, suma(semana)),
      lista("ventas", "Materiales más vendidos (30 días)", materiales),
      ir("/vender", "Agregar venta"),
    ];
  },
  async central(q) {
    const { estados, porCobrar, pagos, semana } = await estadCentral(q);
    return [
      kpi("monto", "Por cobrar", clp(porCobrar), "reservadas y esperando pago"),
      kpi(
        "central",
        "Pagos validados hoy",
        num(pagos.n),
        clp(pagos.monto as number),
      ),
      serie("Pedidos enviados a empaque", semana, suma(semana)),
      lista("central", "Ventas en tu cola", estados, { nombre: estado }),
      ir("/central", "Ir a Central"),
    ];
  },
  async empaquetado(q) {
    const { cola, couriers, desde, semana } = await estadEmpaque(q);
    return [
      kpi(
        "empaquetado",
        "Pedidos por empaquetar",
        num(cola.pedidos),
        `${num(cola.prendas)} prenda(s)`,
      ),
      kpi("reloj", "Espera más antigua", hace(desde), "pedido más viejo"),
      serie("Paquetes empaquetados", semana, suma(semana)),
      lista("empaquetado", "Pendientes por courier", couriers, {
        nombre: courier,
        vacio: "Nada por empaquetar.",
      }),
      ir("/empaquetar", "Ir a Empaquetado"),
    ];
  },
  async despacho(q) {
    const { couriers, desde, semana } = await estadDespacho(q);
    return [
      kpi(
        "despacho",
        "Paquetes por despachar",
        num(couriers.reduce((a, c) => a + c.v, 0)),
        "esperando al courier",
      ),
      kpi("reloj", "Espera más antigua", hace(desde), "paquete más viejo"),
      serie("Paquetes entregados al courier", semana, suma(semana)),
      lista("despacho", "Por courier", couriers, {
        nombre: courier,
        vacio: "Nada por despachar.",
      }),
      ir("/peoneta", "Ir a Despacho"),
    ];
  },
};

async function cargarAdmin(q: Sql): Promise<MagicBentoItem[]> {
  const { t, lives, estados, parejas, clientes, semana } = await estadAdmin(q);
  return [
    kpi("ventas", "Ventas", num(t.ventas)),
    kpi("monto", "Monto vendido", clp(Number(t.monto))),
    kpi(
      "ventas",
      "Lives activos",
      num(lives.activos),
      `de ${num(lives.total)}`,
    ),
    serie("Ventas por día", semana, suma(semana)),
    lista("ventas", "Ventas por estado", estados, { nombre: estado }),
    lista("ventas", "Parejas (30 días)", parejas),
    lista("ventas", "Mejores clientes", clientes),
  ];
}

type Tab = "resumen" | "auditoria" | Pantalla;
type Params = { tab?: string } & ParamsAuditoria;

// one tab per role the user holds; the admin also gets the general summary and the order audit first (and can look at
// every role)
async function Paneles({ params }: { params: Promise<Params> }) {
  await connection(); // always query at request time
  const s: Sesion = await requirePermiso(...PANTALLAS.map((p) => p.id)); // any role; admin passes
  const tabs: { id: Tab; label: string }[] = [
    ...(esAdmin(s)
      ? [
          { id: "resumen" as const, label: "Resumen" },
          { id: "auditoria" as const, label: "Auditoría" },
        ]
      : []),
    ...PANTALLAS.filter((p) => esAdmin(s) || s.permisos.includes(p.id)).map(
      (p) => ({ id: p.id, label: p.label }),
    ),
  ];
  const p = await params;
  const actual = tabs.find((t) => t.id === p.tab) ?? tabs[0];
  // only the open tab is queried
  const id = actual.id; // a const, so the narrowing below reaches the callback
  const items =
    id === "auditoria"
      ? []
      : await db((q) => (id === "resumen" ? cargarAdmin(q) : PANELES[id](q)));
  return (
    <>
      {tabs.length > 1 && (
        <div
          role="tablist"
          aria-label="Resumen"
          className="mb-6 flex w-fit max-w-full gap-1 overflow-x-auto rounded-2xl bg-surface-2 p-1"
        >
          {tabs.map((t) => (
            <Link
              key={t.id}
              href={`/?tab=${t.id}`}
              role="tab"
              aria-selected={t.id === actual.id}
              className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition ${
                t.id === actual.id
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-muted hover:text-text"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      )}
      <div role="tabpanel">
        {actual.id === "auditoria" ? (
          <Auditoria p={p} />
        ) : (
          // key: switching tabs remounts the grid, so the intro animation plays for the new cards
          <Bento key={actual.id} items={items} />
        )}
      </div>
    </>
  );
}

export default function Home(props: PageProps<"/">) {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 pb-32 pt-10 text-text sm:px-8">
      <div className="relative mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Vora Boutique</h1>
            <p className="text-muted">Tu resumen del día</p>
          </div>
          <Nav />
        </header>
        <Suspense
          fallback={<p className="text-center text-muted">Cargando…</p>}
        >
          <Paneles params={props.searchParams as Promise<Params>} />
        </Suspense>
      </div>
    </main>
  );
}
