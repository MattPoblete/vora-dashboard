import Link from "next/link";
import { Glass } from "@/components/glass";
import { db } from "@/lib/session";

type Cambio = { antes: unknown; despues: unknown };
type Fila = {
  id: number;
  en: Date;
  tabla: string;
  fila_id: number;
  accion: "insert" | "update";
  usuario: string | null;
  cambios: Record<string, unknown>;
  quien: string | null; // the client's nick, also for an order
};

const TABLAS = [
  { id: "", label: "Todo" },
  { id: "clientes", label: "Clientes" },
  { id: "pedidos", label: "Pedidos" },
] as const;

const NOMBRE = { clientes: "Cliente", pedidos: "Pedido" } as Record<
  string,
  string
>;
const val = (v: unknown) =>
  v === null || v === undefined || v === "" ? "—" : String(v).slice(0, 40);
const fecha = (d: Date) =>
  d.toLocaleString("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

// what changed, one short line per field
function Detalle({ f }: { f: Fila }) {
  const campos = Object.entries(f.cambios).filter(([k]) => k !== "id");
  if (f.accion === "insert")
    return (
      <span className="text-muted">
        {campos
          .filter(([, v]) => v !== null && v !== "")
          .slice(0, 5)
          .map(([k, v]) => `${k}: ${val(v)}`)
          .join(" · ")}
      </span>
    );
  return (
    <ul className="space-y-0.5">
      {campos.map(([k, v]) => {
        const c = v as Cambio;
        return (
          <li key={k}>
            <span className="text-muted">{k}:</span> {val(c.antes)}{" "}
            <span className="text-muted">→</span> {val(c.despues)}
          </li>
        );
      })}
    </ul>
  );
}

export async function Registro({ tabla }: { tabla: string }) {
  const filtro = TABLAS.some((t) => t.id === tabla) ? tabla : "";
  const filas = await db(
    (q) => q<Fila[]>`
      select r.id, r.en, r.tabla, r.fila_id, r.accion, r.usuario, r.cambios,
             case r.tabla
               when 'clientes' then (select nombre from clientes where id = r.fila_id)
               when 'pedidos' then (select c.nombre from pedidos p join clientes c on c.id = p.cliente_id where p.id = r.fila_id)
             end quien
      from registro r
      ${filtro ? q`where r.tabla = ${filtro}` : q``}
      order by r.id desc limit 100`,
  );

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-2">
        {TABLAS.map((t) => (
          <Link
            key={t.id}
            href={`/configuracion?tab=registro${t.id ? `&t=${t.id}` : ""}`}
            className={`rounded-full border px-4 py-1.5 text-sm ${
              t.id === filtro
                ? "border-primary bg-primary text-on-primary"
                : "border-border bg-surface-2 hover:bg-border"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <Glass title={`Últimos movimientos · ${filas.length}`}>
        {filas.length === 0 ? (
          <p className="text-muted">Aún no hay movimientos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="py-2 pr-4 font-medium">Fecha</th>
                  <th className="py-2 pr-4 font-medium">Usuario</th>
                  <th className="py-2 pr-4 font-medium">Qué</th>
                  <th className="py-2 font-medium">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border align-top">
                {filas.map((f) => (
                  <tr key={f.id}>
                    <td className="whitespace-nowrap py-2 pr-4 tabular-nums text-muted">
                      {fecha(f.en)}
                    </td>
                    <td className="py-2 pr-4">{f.usuario ?? "—"}</td>
                    <td className="py-2 pr-4">
                      <span className="font-medium">
                        {NOMBRE[f.tabla] ?? f.tabla} #{f.fila_id}
                      </span>
                      {f.quien && (
                        <span className="text-muted"> · {f.quien}</span>
                      )}
                      <span
                        className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                          f.accion === "insert"
                            ? "bg-success/20 text-success-fg"
                            : "bg-info/20 text-info-fg"
                        }`}
                      >
                        {f.accion === "insert" ? "creado" : "editado"}
                      </span>
                    </td>
                    <td className="py-2">
                      <Detalle f={f} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Glass>
    </div>
  );
}
