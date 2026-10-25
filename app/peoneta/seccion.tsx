import { Glass } from "@/components/glass";
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
    <Glass>
      <Form action={marcarEnviado}>
        <fieldset>
          <legend className="sr-only">{titulo}</legend>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold">
              {titulo}{" "}
              <span className={`ml-2 rounded-full px-3 py-1 text-base ${tono}`}>
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
                    className="h-9 w-9 shrink-0 accent-success"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xl font-semibold">
                      {p.cliente}
                    </span>
                    <span className="block truncate text-sm text-muted">
                      {[p.nombre_completo, p.ciudad]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </span>
                    <span className="block text-sm text-primary">
                      {p.codigos.map((c) => "#" + c).join("  ")}
                    </span>
                  </span>
                  <span className="text-sm tabular-nums text-muted">
                    #{p.id}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <Boton className="mt-4 h-16 w-full bg-success text-on-primary hover:brightness-110 text-lg">
            {accion}
          </Boton>
        </fieldset>
      </Form>
    </Glass>
  );
}
