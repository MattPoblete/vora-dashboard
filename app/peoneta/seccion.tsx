import { Panel } from "@/components/panel";
import { nombrePropio } from "@/lib/formato";
import type { PaqueteD } from "@/lib/despacho";
import { Boton, Form } from "../central/form";
import { marcarEnviado } from "./actions";
import { Todos } from "./todos";

export function Seccion({
  titulo,
  accion,
  paquetes,
  tono,
}: {
  titulo: string;
  accion: string;
  paquetes: PaqueteD[];
  tono: string;
}) {
  return (
    <Panel>
      <Form action={marcarEnviado}>
        <fieldset>
          <legend className="sr-only">{titulo}</legend>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2.5 text-xl font-semibold">
              {titulo}
              <span
                className={`rounded-full px-2.5 py-0.5 text-sm font-medium tabular-nums ${tono}`}
              >
                {paquetes.length}
              </span>
            </h2>
            <Todos />
          </div>
          <ul className="divide-y divide-border">
            {paquetes.map((p) => (
              <li key={p.id}>
                <label className="flex cursor-pointer items-center gap-4 py-4">
                  <input
                    type="checkbox"
                    name="paquete"
                    value={p.id}
                    className="size-6 shrink-0 rounded accent-success"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-lg font-semibold">
                      @{p.cliente}
                    </span>
                    <span className="block truncate text-sm text-muted">
                      {[
                        p.nombre_completo && nombrePropio(p.nombre_completo),
                        p.ciudad,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </span>
                    <span className="block text-sm text-text/80">
                      Prendas{" "}
                      <span className="font-medium tabular-nums text-primary">
                        {p.codigos.map((c) => "#" + c).join("  ")}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-xs text-muted">
                    Paquete
                    <span className="block text-sm font-medium tabular-nums text-text">
                      #{p.id}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <Boton className="btn-exito mt-4 h-14! w-full text-base!">
            {accion}
          </Boton>
        </fieldset>
      </Form>
    </Panel>
  );
}
