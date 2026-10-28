import Link from "next/link";
import { Glass } from "@/components/glass";
import { Buscador } from "@/components/buscador";
import {
  estadoTexto,
  historia,
  lineas,
  listarPedidos,
  ORDENES,
  parseBusqueda,
  type Orden,
} from "@/lib/auditoria";
import { leerBusqueda } from "@/lib/busqueda";
import { fono } from "@/lib/central";
import { db } from "@/lib/session";
import { clp } from "./panel";

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
  const { q } = leerBusqueda(p, [], 200);
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

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Buscador
          placeholder="Busca por pedido, cliente, teléfono o usuario…"
          reiniciar={["pagina", "ver"]}
        />
        <p className="px-1 text-xs text-muted">
          Combina filtros: <code>pedido:128</code> <code>cliente:cami</code>{" "}
          <code>usuario:maria</code> <code>estado:pagada</code>. Usa comillas
          para frases: <code>cliente:&quot;cami rojas&quot;</code>
        </p>
      </div>

      <Glass
        title={`Pedidos${q ? " encontrados" : ""} · ${filas.length}${hayMas ? "+" : ""}`}
      >
        {filas.length === 0 ? (
          <p className="text-muted">
            {q
              ? "Ningún pedido coincide con la búsqueda."
              : "Aún no hay pedidos."}
          </p>
        ) : (
          <div className="@container overflow-x-auto">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted">
                <tr>
                  {COLUMNAS.map((c) => (
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
                          href={
                            url({ ver: abierto ? "" : String(f.id) }) +
                            `#pedido-${f.id}`
                          }
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
                            {[f.nombre_completo, f.telefono && fono(f.telefono)]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        <span className={chip}>{estadoTexto(f.estado)}</span>
                      </td>
                      <td className="py-2 pr-4 tabular-nums">{clp(f.total)}</td>
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
                      <td className="whitespace-nowrap py-2">
                        <div>{f.ultimo_usuario ?? "—"}</div>
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
                        <td colSpan={COLUMNAS.length} className="px-3 py-3">
                          {/* pinned to the visible part of the scrolling table: on a phone the lines wrap instead of running off */}
                          <div className="sticky left-3 max-w-[calc(100cqw-1.5rem)]">
                            {eventos.length === 0 ? (
                              <p className="text-muted">
                                Sin movimientos registrados: el pedido es
                                anterior al registro de cambios.
                              </p>
                            ) : (
                              <ol className="space-y-1.5 border-l-2 border-border pl-4">
                                {eventos.map((e) => (
                                  <li key={e.id}>
                                    <span className="tabular-nums text-muted">
                                      {fecha(e.en)}
                                    </span>
                                    {" · "}
                                    <span className="font-medium">
                                      {e.usuario ?? "sistema"}
                                    </span>{" "}
                                    {e.texto}
                                  </li>
                                ))}
                              </ol>
                            )}
                          </div>
                        </td>
                      </tr>
                    ),
                  ];
                })}
              </tbody>
            </table>
          </div>
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
      </Glass>
    </div>
  );
}
