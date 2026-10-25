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
import { Pestanas } from "@/components/pestanas";
import { Encabezado, Pagina } from "@/components/pagina";
import { Bento, type ItemBento } from "@/components/bento";
import { BARRA, prendas, tonoEstado } from "@/lib/formato";
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
const colorEstado = (k: string) => BARRA[tonoEstado(k)];
const estado = (k: string) => ESTADOS[k] ?? k.replaceAll("_", " ");
const suma = (d: { n: number }[]) => num(d.reduce((a, x) => a + x.n, 0));

// one loader per role: each returns the cards for that part of the operation
const PANELES: Record<Pantalla, (q: Sql) => Promise<ItemBento[]>> = {
  async ventas(q) {
    const { hoy, live, semana, materiales } = await estadVentas(q);
    return [
      kpi("Ventas de hoy", num(hoy.n), clp(hoy.monto)),
      kpi(
        "Live en curso",
        live ? num(live.n) : "—",
        live ? `${live.vendedores} · ${clp(live.monto)}` : "Sin live activo",
      ),
      serie("Ventas por día", semana, suma(semana)),
      lista("Materiales más vendidos (30 días)", materiales),
      ir("/vender", "Agregar venta"),
    ];
  },
  async central(q) {
    const { estados, porCobrar, pagos, semana } = await estadCentral(q);
    return [
      kpi("Por cobrar", clp(porCobrar), "reservadas y esperando pago"),
      kpi("Pagos validados hoy", num(pagos.n), clp(pagos.monto as number)),
      serie("Pedidos enviados a empaque", semana, suma(semana)),
      lista("Ventas en tu cola", estados, {
        nombre: estado,
        color: colorEstado,
      }),
      ir("/central", "Ir a Central"),
    ];
  },
  async empaquetado(q) {
    const { cola, couriers, desde, semana } = await estadEmpaque(q);
    return [
      kpi("Pedidos por empaquetar", num(cola.pedidos), prendas(cola.prendas)),
      kpi("Espera más antigua", hace(desde), "pedido más viejo"),
      serie("Paquetes empaquetados", semana, suma(semana)),
      lista("Pendientes por courier", couriers, {
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
        "Paquetes por despachar",
        num(couriers.reduce((a, c) => a + c.v, 0)),
        "esperando al courier",
      ),
      kpi("Espera más antigua", hace(desde), "paquete más viejo"),
      serie("Paquetes entregados al courier", semana, suma(semana)),
      lista("Por courier", couriers, {
        nombre: courier,
        vacio: "Nada por despachar.",
      }),
      ir("/peoneta", "Ir a Despacho"),
    ];
  },
};

async function cargarAdmin(q: Sql): Promise<ItemBento[]> {
  const { t, lives, estados, parejas, clientes, semana } = await estadAdmin(q);
  return [
    kpi("Ventas", num(t.ventas)),
    kpi("Monto vendido", clp(Number(t.monto))),
    kpi(
      "Ticket promedio",
      t.ventas ? clp(Math.round(Number(t.monto) / t.ventas)) : "—",
      "por prenda vendida",
    ),
    kpi("Lives activos", num(lives.activos), `de ${num(lives.total)}`),
    serie("Ventas por día", semana, suma(semana)),
    lista("Ventas por estado", estados, {
      nombre: estado,
      color: colorEstado,
    }),
    lista("Parejas (30 días)", parejas),
    lista("Mejores clientes", clientes, { arroba: true }),
  ];
}

type Tab = "resumen" | "auditoria" | Pantalla;
const SUBTITULO: Record<Tab, string> = {
  resumen: "Totales de todos los lives",
  auditoria: "Historial de cada pedido y de quién lo tocó",
  ventas: "Lo vendido hoy y en la semana",
  central: "Cobros y pagos pendientes",
  empaquetado: "Lo que espera ser empaquetado",
  despacho: "Paquetes esperando al courier",
};
type Params = { tab?: string } & ParamsAuditoria;

// one tab per role the user holds; the admin also gets the general summary and the order audit first (and can look at
// every role)
async function Paneles({ params }: { params: Promise<Params> }) {
  await connection(); // always query at request time
  const s: Sesion = await requirePermiso(...PANTALLAS.map((p) => p.id)); // any role; admin passes
  const tabs: { id: Tab; label: string }[] = [
    ...(esAdmin(s)
      ? [
          { id: "resumen" as const, label: "General" },
          { id: "auditoria" as const, label: "Auditoría" },
        ]
      : []),
    ...PANTALLAS.filter((p) => esAdmin(s) || s.permisos.includes(p.id)).map(
      // "Cifras de …": these tabs are numbers about each area, not the area's work screen (that is in the nav)
      (p) => ({ id: p.id, label: `Cifras de ${p.label.toLowerCase()}` }),
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
  const accion = items.find((i) => i.href);
  return (
    <>
      <Encabezado
        titulo="Inicio"
        subtitulo={SUBTITULO[id]}
        accion={
          accion?.href && (
            <Link href={accion.href} className="btn btn-primario">
              {accion.content}
            </Link>
          )
        }
      />
      {tabs.length > 1 && (
        <Pestanas
          label="Resumen"
          actual={actual.id}
          tabs={tabs.map((t) => ({
            ...t,
            href: `/?tab=${t.id}`,
          }))}
        />
      )}
      <div role="tabpanel">
        {actual.id === "auditoria" ? (
          <Auditoria p={p} />
        ) : (
          <Bento items={items.filter((i) => !i.href)} />
        )}
      </div>
    </>
  );
}

export default function Home(props: PageProps<"/">) {
  return (
    <Pagina>
      <Paneles params={props.searchParams as Promise<Params>} />
    </Pagina>
  );
}
