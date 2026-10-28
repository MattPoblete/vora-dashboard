import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { db, dbq, esAdmin, requirePermiso } from "@/lib/session";
import { gruposParaLive, nombreGrupo, type Grupo } from "@/lib/grupos";
import { Glass } from "@/components/glass";
import { Buscador } from "@/components/buscador";
import { leerBusqueda, patron } from "@/lib/busqueda";
import { iniciarLive } from "./actions";
import { VentaForm } from "./form";
import { Lista, type Venta } from "./lista";
import { Finalizar } from "./finalizar";
import { PanelesVenta } from "./paneles";

type Activo = {
  id: number;
  nombre: string;
  vendedores: string | null;
  alias: string | null;
  inicio: Date;
};

// key -> label; the first is the default. "antigua" is creation time: id grows with it
const ORDENES = {
  reciente: "Más recientes",
  antigua: "Más antiguas",
  numero: "Número",
  talla: "Talla",
};

const titulo = (l: Activo) => l.alias ?? l.vendedores ?? l.nombre;

const hora = (d: Date) =>
  d.toLocaleString("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

function Iniciar({ grupos }: { grupos: Grupo[] }) {
  if (!grupos.length)
    return (
      <Glass title="Iniciar live">
        <p className="text-muted">
          Todavía no estás en un grupo de venta. Pídele al administrador que te
          agregue a uno.
        </p>
      </Glass>
    );
  return (
    <Glass title="Iniciar live · ¿quién transmite?">
      {/* accordion gallery: the hovered/focused pair grows; on phones they simply stack */}
      <form
        action={iniciarLive}
        className="flex flex-col gap-3 sm:h-64 sm:flex-row"
      >
        {grupos.map((g) => (
          <button
            key={g.vendedores}
            name="vendedores"
            value={g.vendedores}
            style={
              g.foto
                ? { backgroundImage: `url(/api/grupos/${g.foto})` }
                : undefined
            }
            className={`group relative flex min-h-24 flex-1 flex-col items-start justify-end gap-1 overflow-hidden rounded-2xl border border-border bg-surface-2 bg-cover bg-center p-4 backdrop-blur-xl transition-[flex-grow,background-color,border-color] duration-500 hover:border-primary focus-visible:border-primary sm:hover:flex-[3] sm:focus-visible:flex-[3] ${g.foto ? "text-white" : "hover:bg-primary-soft focus-visible:bg-primary-soft"}`}
          >
            {/* the scrim keeps the name readable over any photo */}
            {g.foto && (
              <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
            )}
            <span className="relative text-left text-xl font-semibold transition-all duration-500 group-hover:text-3xl group-focus-visible:text-3xl">
              {nombreGrupo(g)}
            </span>
            <span
              className={`relative hidden whitespace-nowrap text-sm opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 sm:block ${g.foto ? "text-white/90" : "text-primary"}`}
            >
              Iniciar live →
            </span>
          </button>
        ))}
      </form>
    </Glass>
  );
}

async function Vender({
  params,
}: {
  params: Promise<{
    live?: string;
    nuevo?: string;
    q?: string;
    orden?: string;
  }>;
}) {
  await connection();
  const sesion = await requirePermiso("ventas");
  const {
    live: liveParam,
    nuevo,
    q: busqueda,
    orden: ordenParam,
  } = await params;
  const activos = await dbq<
    Activo[]
  >`select l.id, l.nombre, l.vendedores, g.alias, l.inicio from lives l
      left join grupos_venta g on g.vendedores = l.vendedores
      where l.inicio is not null and l.fin is null order by l.id`;

  if (!activos.length || nuevo) {
    return (
      <>
        <Tabs activos={activos} actual={null} />
        <Iniciar grupos={await db((q) => gruposParaLive(q, esAdmin(sesion)))} />
      </>
    );
  }

  const live =
    activos.find((l) => String(l.id) === liveParam) ??
    activos[activos.length - 1];

  // ponytail: seed = most used materials in the imported data, so an empty db still suggests something
  const base = ["softshell", "cortavientos", "engomada"];
  const usados = (
    await dbq`select lower(trim(material)) m from ventas where material is not null
              group by 1 order by count(*) desc limit 30`
  ).map((r) => r.m as string);
  const materiales = [...new Set([...usados, ...base])];

  // search and order run in sql, so they cover every sale of the live and not just the visible ones
  const { q, orden } = leerBusqueda(
    { q: busqueda, orden: ordenParam },
    Object.keys(ORDENES),
  );
  const like = patron(q);
  const ultimas = await dbq`
    select id, codigo, comprador_texto nick, talla, material, detalle, monto,
           (select count(*)::int from reservas_respaldo r where r.venta_id = v.id) respaldo
    from ventas v where live_id = ${live.id}
      and (${q} = '' or concat_ws(' ', codigo, comprador_texto, talla, material, detalle) ilike ${like})
    order by
      case when ${orden}::text = 'antigua' then id end asc,
      case when ${orden}::text = 'numero' then codigo end asc,
      case when ${orden}::text = 'talla'
        then array_position(array['xxs','xs','s','m','l','xl','xxl','xxxl'], lower(trim(talla))) end asc nulls last,
      id desc
    limit 100`;

  return (
    <>
      <Tabs activos={activos} actual={live.id} />
      <PanelesVenta
        cantidad={ultimas.length}
        formulario={
          <Glass>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{titulo(live)}</h2>
                <p className="text-sm text-muted">Inicio {hora(live.inicio)}</p>
              </div>
              <Finalizar id={live.id} />
            </div>
            <VentaForm live={live.id} materiales={materiales} />
          </Glass>
        }
        ultimas={
          <Glass title="Últimas ventas">
            {/* the scroll lives inside: the glass layer is absolutely positioned and would not follow a scrolling card */}
            <div className="max-h-[calc(100vh-14rem)] overflow-y-auto pr-1">
              <Buscador
                placeholder="Buscar nick, número, talla…"
                ordenes={ORDENES}
              />
              {ultimas.length === 0 ? (
                <p className="text-muted">
                  {q
                    ? "Ninguna venta coincide con la búsqueda."
                    : "Aún no hay ventas en este live."}
                </p>
              ) : (
                <Lista ventas={ultimas as unknown as Venta[]} />
              )}
            </div>
          </Glass>
        }
      />
    </>
  );
}

function Tabs({
  activos,
  actual,
}: {
  activos: Activo[];
  actual: number | null;
}) {
  if (!activos.length) return null;
  const tab = "rounded-full border px-4 py-1.5 text-sm backdrop-blur-xl";
  return (
    <nav className="mb-5 flex flex-wrap gap-2">
      {activos.map((l) => (
        <Link
          key={l.id}
          href={`/vender?live=${l.id}`}
          className={`${tab} ${l.id === actual ? "border-primary bg-primary-soft" : "border-border bg-surface-2 hover:bg-border"}`}
        >
          ● {titulo(l)}
        </Link>
      ))}
      <Link
        href="/vender?nuevo=1"
        className={`${tab} border-border bg-surface-2 hover:bg-border`}
      >
        + Nuevo live
      </Link>
    </nav>
  );
}

export default function Page(props: PageProps<"/vender">) {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 pb-32 pt-8 text-text sm:px-8">
      <div className="relative mx-auto max-w-6xl">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Agregar venta</h1>
        </header>
        <Suspense
          fallback={<p className="text-center text-muted">Cargando…</p>}
        >
          <Vender
            params={
              props.searchParams as Promise<{
                live?: string;
                nuevo?: string;
                q?: string;
                orden?: string;
              }>
            }
          />
        </Suspense>
      </div>
    </main>
  );
}
