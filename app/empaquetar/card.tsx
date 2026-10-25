import Link from "next/link";
import { Panel } from "@/components/panel";
import { Tiempo } from "@/components/tiempo";
import { nombrePropio } from "@/lib/formato";
import {
  lineasEtiqueta,
  nombreCourier,
  type Paquete,
  COLOR_COURIER,
} from "@/lib/empaque";
import { Boton, Form } from "../central/form";
import { marcarEmpaquetado } from "./actions";

export function Card({ p }: { p: Paquete }) {
  return (
    <Panel
      plano
      id={`pedido-${p.pedido}`}
      className="scroll-mt-6 transition-shadow"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 pr-10">
        <div>
          <h2 className="text-2xl font-semibold">@{p.cliente}</h2>
          <p className="text-sm text-muted">
            {p.nombre_completo
              ? nombrePropio(p.nombre_completo)
              : "sin nombre completo"}{" "}
            · pedido #{p.pedido}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tiempo desde={p.cerrado_en.toISOString()} />
          <span
            className={`rounded-full px-3 py-1 text-sm ${COLOR_COURIER[p.courier]}`}
          >
            {nombreCourier(p.courier)}
          </span>
        </div>
      </header>

      <h3 className="mb-2 mt-5 text-sm font-semibold">
        Prendas a buscar ({p.prendas.length})
      </h3>
      <ul className="divide-y divide-border">
        {p.prendas.map((x) => (
          <li key={x.id}>
            <label className="flex cursor-pointer items-center gap-4 py-3">
              <input
                type="checkbox"
                className="h-7 w-7 shrink-0 accent-success"
              />
              <span className="w-20 text-2xl font-semibold tabular-nums text-primary">
                #{x.codigo}
              </span>
              <span className="flex-1 text-text/80">
                {[x.talla, x.material].filter(Boolean).join(" · ") || "—"}
                {x.detalle && (
                  <span className="block text-sm text-warning-fg">
                    ⚠ {x.detalle}
                  </span>
                )}
              </span>
            </label>
          </li>
        ))}
      </ul>

      <h3 className="mb-2 mt-5 text-sm font-semibold">Datos de la etiqueta</h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        {lineasEtiqueta(p).map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd className={v === "(falta)" ? "text-danger-fg" : ""}>{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={`/empaquetar/etiquetas?ids=${p.pedido}`}
          prefetch={false}
          target="_blank"
          className="btn btn-secundario"
        >
          Imprimir etiqueta
        </Link>
        <Form action={marcarEmpaquetado} className="flex-1">
          <input type="hidden" name="pedido" value={p.pedido} />
          <Boton className="btn-exito h-12! w-full text-base!">
            Empaquetado → por enviar
          </Boton>
        </Form>
      </div>
    </Panel>
  );
}
