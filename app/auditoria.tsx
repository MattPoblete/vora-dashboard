import Link from "next/link";
import { Panel } from "@/components/panel";
import {
  estadoTexto,
  historia,
  lineas,
  listarPedidos,
  ORDENES,
  parseBusqueda,
  type Orden,
} from "@/lib/auditoria";
import { fono } from "@/lib/central";
import { db } from "@/lib/session";
import { CHIP, clp, nombrePropio, tonoEstado } from "@/lib/formato";

export type ParamsAuditoria = {
  q?: string;
  orden?: string;
  dir?: string;
  pagina?: string;
  ver?: string;
};

const fecha = (d: Date) =>
  d.toLocaleString("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
const chip =
  "whitespace-nowrap rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-text/80";
const estadoChip = (e: string | null) =>
  `whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium first-letter:uppercase ${CHIP[tonoEstado(e)]}`;
const codigo = "rounded bg-surface-2 px-1 py-0.5 font-mono text-xs text-text";
const COLUMNAS: { id: Orden | null; label: string }[] = [
  { id: "pedido", label: "Pedido" },
  { id: "cliente", label: "Cliente" },
  { id: null, label: "Estado" },
  { id: "total", label: "Total" },
  { id: null, label: "Lo tocaron" },
  { id: "cambio", label: "Último cambio" },
];

// admin only (the summary page only offers this tab to admins); everything lives in the URL, so a search is a link
export async function Auditoria({ p }: { p: ParamsAuditoria }) {
  const q = (p.q ?? "").slice(0, 200);
  const orden = ORDENES.find((o) => o === p.orden) ?? "cambio";
  const asc = p.dir === "asc";
  const pagina = Math.max(1, Math.floor(Number(p.pagina)) || 1);
  const ver = Number(p.ver);

  const { filas, hayMas, eventos } = await db(async (tx) => {
    const r = await listarPedidos(tx, parseBusqueda(q), orden, asc, pagina);
    const abierto = r.filas.some((f) => f.id === ver);
    return {
      ...r,
      eventos: abierto ? lineas(await historia(tx, ver), ver) : [],
    };
  });

  const url = (cambios: ParamsAuditoria) => {
    const s = new URLSearchParams({ tab: "auditoria" });
    const todo = {
      q,
      orden,
      dir: asc ? "asc" : "desc",
      pagina: String(pagina),
      ...cambios,
    };
    for (const [k, v] of Object.entries(todo)) if (v) s.set(k, v);
    return `/?${s}`;
  };

  // the "who touched it" column only when someone did
  const tocados = filas.some((f) => f.usuarios.length);
  const columnas = COLUMNAS.filter((c) => tocados || c.label !== "Lo tocaron");
  const historiaAbierta =
    eventos.length === 0 ? (
      <p className="text-muted">
        Sin movimientos registrados: el pedido es anterior al registro de
        cambios.
      </p>
    ) : (
      <ol className="space-y-1.5 border-l-2 border-border pl-4">
        {eventos.map((e) => (
          <li key={e.id}>
            <span className="tabular-nums text-muted">{fecha(e.en)}</span>
            {" · "}
            <span className="font-medium">{e.usuario ?? "sistema"}</span>{" "}
            {e.texto}
          </li>
        ))}
      </ol>
    );
  const enlace = (id: number, abierto: boolean) =>
    url({ ver: abierto ? "" : String(id) }) + `#pedido-${id}`;

  return (
    <div className="space-y-4">
      <form action="/" className="space-y-1">
        <input type="hidden" name="tab" value="auditoria" />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Busca por pedido, cliente, teléfono o usuario…"
          aria-label="Buscar pedidos"
          className="h-11 w-full rounded-lg border border-border bg-surface px-4 text-base shadow-sm outline-none focus:border-primary"
        />
        <details className="px-1 text-sm text-muted">
          <summary className="w-fit hover:text-text">Búsqueda avanzada</summary>
          <p className="mt-2 leading-relaxed">
            Combina filtros: <code className={codigo}>pedido:128</code>{" "}
            <code className={codigo}>cliente:cami</code>{" "}
            <code className={codigo}>usuario:maria</code>{" "}
            <code className={codigo}>estado:pagada</code>. Usa comillas para
            frases:{" "}
            <code className={codigo}>cliente:&quot;cami rojas&quot;</code>
          </p>
        </details>
      </form>

      <Panel
        title={`Pedidos${q ? " encontrados" : ""} · ${filas.length}${hayMas ? "+" : ""}`}
      >
        {filas.length === 0 ? (
          <p className="text-muted">
            {q
              ? "Ningún pedido coincide con la búsqueda."
              : "Aún no hay pedidos."}
          </p>
        ) : (
          <>
            {/* phone: one card per order instead of a table that scrolls sideways */}
            <ul className="-mx-2 divide-y divide-border md:hidden">
              {filas.map((f) => {
                const abierto = f.id === ver;
                return (
                  <li key={f.id} id={`m-pedido-${f.id}`}>
                    <Link
                      href={enlace(f.id, abierto)}
                      scroll={false}
                      aria-expanded={abierto}
                      className={`block rounded-lg px-2 py-3 ${abierto ? "bg-primary-soft" : "hover:bg-surface-2"}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">
                          @{f.nick}{" "}
                          <span className="font-normal text-muted">
                            #{f.id}
                          </span>
                        </span>
                        <span className="tabular-nums">{clp(f.total)}</span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between gap-3">
                        <span className={estadoChip(f.estado)}>
                          {estadoTexto(f.estado)}
                        </span>
                        <span className="text-xs tabular-nums text-muted">
                          {fecha(f.ultimo_en)}
                        </span>
                      </div>
                    </Link>
                    {abierto && (
                      <div className="px-2 pb-3 pt-2 text-sm">
                        {historiaAbierta}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="@container hidden overflow-x-auto md:block">
              <table className="w-full min-w-[48rem] text-left text-sm">
                <thead className="border-b border-border text-xs text-muted">
                  <tr>
                    {columnas.map((c) => (
                      <th key={c.label} className="py-2 pr-4 font-medium">
                        {c.id ? (
                          <Link
                            href={url({
                              orden: c.id,
                              dir: c.id === orden && !asc ? "asc" : "desc",
                              pagina: "1",
                              ver: "",
                            })}
                            className="hover:text-text"
                            aria-sort={
                              c.id === orden
                                ? asc
                                  ? "ascending"
                                  : "descending"
                                : undefined
                            }
                          >
                            {c.label}
                            {c.id === orden && (asc ? " ▴" : " ▾")}
                          </Link>
                        ) : (
                          c.label
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border align-top">
                  {filas.map((f) => {
                    const abierto = f.id === ver;
                    return [
                      <tr
                        key={f.id}
                        id={`pedido-${f.id}`}
                        className={abierto ? "bg-primary-soft" : undefined}
                      >
                        <td className="py-2 pr-4">
                          <Link
                            href={enlace(f.id, abierto)}
                            scroll={false}
                            aria-expanded={abierto}
                            className="font-medium text-info-fg underline-offset-2 hover:underline"
                          >
                            #{f.id} {abierto ? "▴" : "▾"}
                          </Link>
                        </td>
                        <td className="py-2 pr-4">
                          <div className="font-medium">@{f.nick}</div>
                          {(f.nombre_completo || f.telefono) && (
                            <div className="text-xs text-muted">
                              {[
                                f.nombre_completo &&
                                  nombrePropio(f.nombre_completo),
                                f.telefono && fono(f.telefono),
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </div>
                          )}
                        </td>
                        <td className="py-2 pr-4">
                          <span className={estadoChip(f.estado)}>
                            {estadoTexto(f.estado)}
                          </span>
                        </td>
                        <td className="py-2 pr-4 tabular-nums">
                          {clp(f.total)}
                        </td>
                        {tocados && (
                          <td className="py-2 pr-4">
                            <div className="flex flex-wrap gap-1">
                              {f.usuarios.length ? (
                                f.usuarios.map((u) => (
                                  <span key={u} className={chip}>
                                    {u}
                                  </span>
                                ))
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </div>
                          </td>
                        )}
                        <td className="whitespace-nowrap py-2">
                          {f.ultimo_usuario && <div>{f.ultimo_usuario}</div>}
                          <div className="text-xs tabular-nums text-muted">
                            {fecha(f.ultimo_en)}
                          </div>
                        </td>
                      </tr>,
                      abierto && (
                        <tr
                          key={`${f.id}-historia`}
                          className="bg-primary-soft/40"
                        >
                          <td colSpan={columnas.length} className="px-3 py-3">
                            {/* pinned to the visible part of the scrolling table: on a phone the lines wrap instead of running off */}
                            <div className="sticky left-3 max-w-[calc(100cqw-1.5rem)]">
                              {historiaAbierta}
                            </div>
                          </td>
                        </tr>
                      ),
                    ];
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
        {(pagina > 1 || hayMas) && (
          <nav className="mt-4 flex justify-between text-sm">
            {pagina > 1 ? (
              <Link
                href={url({ pagina: String(pagina - 1), ver: "" })}
                className="text-info-fg hover:underline"
              >
                ← Anteriores
              </Link>
            ) : (
              <span />
            )}
            {hayMas && (
              <Link
                href={url({ pagina: String(pagina + 1), ver: "" })}
                className="text-info-fg hover:underline"
              >
                Siguientes →
              </Link>
            )}
          </nav>
        )}
      </Panel>
    </div>
  );
}
