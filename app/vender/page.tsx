import Link from "next/link";
import { connection } from "next/server";
import { db, dbq, esAdmin, requirePermiso } from "@/lib/session";
import { gruposParaLive, nombreGrupo, type Grupo } from "@/lib/grupos";
import { Panel } from "@/components/panel";
import { Pagina } from "@/components/pagina";
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
      <Panel title="Iniciar live">
        <p className="text-muted">
          Todavía no estás en un grupo de venta. Pídele al administrador que te
          agregue a uno.
        </p>
      </Panel>
    );
  return (
    <Panel title="¿Quién transmite?">
      <form action={iniciarLive} className="grid gap-3 sm:grid-cols-3">
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
            className={`relative flex flex-col items-start justify-end gap-0.5 overflow-hidden rounded-xl border border-border bg-surface-2 bg-cover bg-center p-4 text-left transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-primary ${g.foto ? "h-40 text-white" : "h-24 hover:bg-primary-soft"}`}
          >
            {/* the scrim keeps the name readable over any photo */}
            {g.foto && (
              <span className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            )}
            <span className="relative text-lg font-semibold">
              {nombreGrupo(g)}
            </span>
            <span
              className={`relative text-sm ${g.foto ? "text-white/85" : "text-primary"}`}
            >
              Iniciar live →
            </span>
          </button>
        ))}
      </form>
    </Panel>
  );
}

async function Vender({
  params,
}: {
  params: Promise<{ live?: string; nuevo?: string }>;
}) {
  await connection();
  const sesion = await requirePermiso("ventas");
  const { live: liveParam, nuevo } = await params;
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

  const ultimas = await dbq`
    select id, codigo, comprador_texto nick, talla, material, detalle, monto,
           (select count(*)::int from reservas_respaldo r where r.venta_id = v.id) respaldo
    from ventas v where live_id = ${live.id} order by id desc limit 30`;

  return (
    <>
      <Tabs activos={activos} actual={live.id} />
      <PanelesVenta
        cantidad={ultimas.length}
        formulario={
          <Panel>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{titulo(live)}</h2>
                <p className="text-sm text-muted">Inicio {hora(live.inicio)}</p>
              </div>
              <Finalizar id={live.id} />
            </div>
            <VentaForm live={live.id} materiales={materiales} />
          </Panel>
        }
        ultimas={
          <Panel title="Últimas ventas">
            <div className="max-h-[calc(100vh-14rem)] overflow-y-auto pr-1">
              {ultimas.length === 0 ? (
                <p className="text-muted">Aún no hay ventas en este live.</p>
              ) : (
                <Lista ventas={ultimas as unknown as Venta[]} />
              )}
            </div>
          </Panel>
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
  const tab =
    "flex h-8 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-medium";
  return (
    <nav className="mb-5 flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl bg-surface-2 p-1">
      {activos.map((l) => (
        <Link
          key={l.id}
          href={`/vender?live=${l.id}`}
          aria-current={l.id === actual ? "page" : undefined}
          className={`${tab} ${l.id === actual ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"}`}
        >
          {/* on air */}
          <span aria-hidden className="size-2 rounded-full bg-danger" />
          {titulo(l)}
        </Link>
      ))}
      <Link
        href="/vender?nuevo=1"
        aria-current={actual === null ? "page" : undefined}
        className={`${tab} ${actual === null ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"}`}
      >
        + Nuevo live
      </Link>
    </nav>
  );
}

export default function Page(props: PageProps<"/vender">) {
  return (
    <Pagina titulo="Agregar venta">
      <Vender
        params={
          props.searchParams as Promise<{ live?: string; nuevo?: string }>
        }
      />
    </Pagina>
  );
}
