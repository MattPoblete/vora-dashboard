import {
  COURIERS,
  ETIQUETA,
  REQUERIDOS,
  type Campo,
  type Tarjeta,
} from "@/lib/central";
import { Panel } from "@/components/panel";
import { Tiempo } from "@/components/tiempo";
import { Step } from "@/components/Stepper";
import {
  mensajeConfirmacion,
  mensajeTransferencia,
  primerNombre,
} from "@/lib/mensajes";
import { Generador, Mensaje } from "./copiar";
import { Boton, Form } from "./form";
import { PasosCentral } from "./pasos";
import {
  contactado,
  guardarEnvio,
  liberarVenta,
  quitarPago,
  subirComprobante,
  validarPago,
} from "./actions";

const clp = (n: number) => "$" + Number(n).toLocaleString("es-CL");
const campo =
  "h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-text outline-none placeholder:text-muted/70 focus:border-primary";
const sec = "mt-5 border-t border-border pt-4";
const h3 = "mb-3 text-xs font-medium uppercase tracking-wider text-muted";

export function estadoTarjeta(t: Tarjeta) {
  if (t.pagos.length === 0) {
    return t.ventas.some((v) => v.estado === "esperando_pago")
      ? ["Esperando comprobante", "bg-info/20 text-info-fg"]
      : ["Por confirmar", "bg-warning/20 text-warning-fg"];
  }
  if (!t.pagos.some((p) => p.validado))
    return ["Comprobante por validar", "bg-secondary/30 text-info-fg"];
  return t.pagado >= t.total
    ? ["Pago validado", "bg-success/20 text-success-fg"]
    : ["Pago incompleto", "bg-warning/20 text-warning-fg"];
}

export function Card({ t }: { t: Tarjeta }) {
  const cid = t.cliente.id;
  const [estado, color] = estadoTarjeta(t);
  const courier = t.pedido?.courier ?? null;
  const esperando = t.ventas.filter(
    (v) => v.estado === "reservada" || v.estado === "esperando_pago",
  );
  const mas = esperando[0]?.creado_en;
  const pendientePago = Math.max(0, t.total - t.pagado);
  // open the stepper on the first stage that still needs work
  const pagoOk = t.pagos.some((x) => x.validado) && t.pagado >= t.total;
  const yaContactado = t.ventas.every((v) => v.estado !== "reservada");
  const inicial =
    t.faltantes.length === 0
      ? 4
      : pagoOk
        ? 3
        : t.pagos.length || yaContactado
          ? 2
          : 1;
  const val = (k: Campo) =>
    ({
      nombre_completo: t.cliente.nombre_completo,
      rut: t.dir?.rut,
      email: t.dir?.email,
      telefono_envio: t.dir?.telefono,
      direccion: t.dir?.direccion,
      ciudad: t.dir?.ciudad,
    })[k] ?? "";
  const pedirPara = (k: Campo) =>
    COURIERS.filter((c) => REQUERIDOS[c.id].includes(k))
      .map((c) => c.label)
      .join(" · ");

  return (
    <Panel
      plano
      id={`cliente-${cid}`}
      className="scroll-mt-6 transition-shadow"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 pr-10">
        <div>
          <h2 className="text-2xl font-semibold">{t.cliente.nombre}</h2>
          <p className="text-sm text-muted">
            {t.cliente.nombre_completo ?? "sin nombre completo"} ·{" "}
            {t.cliente.telefono ? "+" + t.cliente.telefono : "sin teléfono"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {mas && <Tiempo desde={mas.toISOString()} />}
          <span className={`rounded-full px-3 py-1 text-sm ${color}`}>
            {estado}
          </span>
        </div>
      </header>

      <div className="mt-5">
        <PasosCentral
          cliente={cid}
          inicial={inicial}
          completo={t.faltantes.length === 0}
        >
          <Step title="Pedido">
            <ul className="mt-4 divide-y divide-border">
              {t.ventas.map((v) => (
                <li
                  key={v.id}
                  className="flex flex-wrap items-center gap-3 py-2"
                >
                  <span className="w-14 text-lg font-semibold tabular-nums text-primary">
                    #{v.codigo}
                  </span>
                  <span className="flex-1 text-sm text-text/80">
                    {[v.talla, v.material, v.live].filter(Boolean).join(" · ")}
                    {v.detalle && (
                      <span className="block text-warning-fg">
                        ⚠ {v.detalle}
                      </span>
                    )}
                  </span>
                  <span className="tabular-nums">{clp(v.monto)}</span>
                  {(v.estado === "reservada" ||
                    v.estado === "esperando_pago") && (
                    <Form action={liberarVenta}>
                      <input type="hidden" name="venta" value={v.id} />
                      <Boton className="border border-border bg-surface-2 px-3 py-1 text-xs hover:bg-danger/30">
                        Liberar
                      </Boton>
                    </Form>
                  )}
                </li>
              ))}
              <li className="flex justify-between pt-3 text-lg font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{clp(t.total)}</span>
              </li>
            </ul>

            {t.ventas.some((v) => v.estado === "reservada") && (
              <Form action={contactado} className="mt-4">
                <input type="hidden" name="cliente" value={cid} />
                <Boton className="w-full border border-info/50 bg-info/20 hover:bg-info/30">
                  Cliente contactó · enviar datos de transferencia
                </Boton>
              </Form>
            )}

            <section className={sec}>
              <h3 className={h3}>Mensaje con datos de transferencia</h3>
              <Mensaje
                texto={mensajeTransferencia(primerNombre(t), t.ventas, t.total)}
              />
            </section>
          </Step>
          <Step title="Pago">
            <section>
              <h3 className={h3}>Pago</h3>
              {t.pagos.map((p) => (
                <div
                  key={p.id}
                  className="mb-2 flex flex-wrap items-center gap-3 rounded-xl bg-surface-2/50 p-3"
                >
                  {p.comprobante && (
                    <a
                      href={`/api/comprobantes/${p.comprobante}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-info-fg underline"
                    >
                      Ver comprobante
                    </a>
                  )}
                  <span className="tabular-nums">{clp(p.monto)}</span>
                  {p.validado ? (
                    <span className="ml-auto text-success-fg">
                      ✓ validado{p.validado_por && ` por ${p.validado_por}`}
                    </span>
                  ) : (
                    <span className="ml-auto flex gap-2">
                      <Form action={validarPago}>
                        <input type="hidden" name="pago" value={p.id} />
                        <Boton className="bg-success text-on-primary py-1 hover:bg-success text-on-primary">
                          Validar
                        </Boton>
                      </Form>
                      <Form action={quitarPago}>
                        <input type="hidden" name="pago" value={p.id} />
                        <Boton className="border border-border bg-surface-2 py-1">
                          Quitar
                        </Boton>
                      </Form>
                    </span>
                  )}
                </div>
              ))}
              {pendientePago > 0 && (
                <Form
                  action={subirComprobante}
                  resetOnOk
                  className="flex flex-wrap items-center gap-2"
                >
                  <input type="hidden" name="cliente" value={cid} />
                  <input
                    name="monto"
                    inputMode="numeric"
                    defaultValue={pendientePago}
                    className={`${campo} w-32`}
                    aria-label="Monto transferido"
                  />
                  <input
                    type="file"
                    name="archivo"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    required
                    className="min-w-0 flex-1 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-text"
                  />
                  <Boton className="bg-primary text-on-primary hover:bg-primary-hover">
                    Subir
                  </Boton>
                </Form>
              )}
            </section>
          </Step>
          <Step title="Envío">
            <section>
              <h3 className={h3}>Mensaje para confirmar datos y envío</h3>
              <Generador
                boton="Generar mensaje de confirmación"
                texto={mensajeConfirmacion(t)}
              />
            </section>

            <section className={sec}>
              <h3 className={h3}>Envío</h3>
              <Form action={guardarEnvio} className="space-y-3">
                <input type="hidden" name="cliente" value={cid} />
                <div className="flex flex-wrap gap-2">
                  {COURIERS.map((c) => (
                    <label key={c.id}>
                      <input
                        type="radio"
                        name="courier"
                        value={c.id}
                        defaultChecked={courier === c.id}
                        required
                        className="peer sr-only"
                      />
                      <span className="inline-block cursor-pointer rounded-xl border border-border bg-surface-2 px-4 py-2 peer-checked:border-primary peer-checked:bg-primary-soft">
                        {c.label}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    [
                      "nombre_completo",
                      "rut",
                      "email",
                      "telefono_envio",
                      "direccion",
                      "ciudad",
                    ] as Campo[]
                  ).map((k) => (
                    <label
                      key={k}
                      className={k === "direccion" ? "sm:col-span-2" : ""}
                    >
                      <span className="mb-1 block text-xs text-muted">
                        {ETIQUETA[k]}{" "}
                        <span className="text-muted/60">({pedirPara(k)})</span>
                      </span>
                      <input
                        name={k}
                        defaultValue={val(k)}
                        className={campo}
                        autoComplete="off"
                      />
                    </label>
                  ))}
                  <label>
                    <span className="mb-1 block text-xs text-muted">
                      Teléfono de contacto{" "}
                      <span className="text-muted/60">(WhatsApp)</span>
                    </span>
                    <input
                      name="telefono"
                      defaultValue={t.cliente.telefono ?? ""}
                      className={campo}
                      placeholder="+56 9 1234 5678"
                      autoComplete="off"
                    />
                  </label>
                </div>
                <Boton className="border border-border bg-surface-2 hover:bg-border">
                  Guardar datos de envío
                </Boton>
              </Form>
            </section>
          </Step>
          <Step title="Listo">
            <h3 className={h3}>Antes de empaquetar</h3>
            {t.faltantes.length > 0 ? (
              <ul className="space-y-2">
                {t.faltantes.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 rounded-xl bg-warning/10 px-4 py-2 text-warning-fg"
                  >
                    <span>⚠</span>
                    {f}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl bg-success/10 px-4 py-3 text-success-fg">
                ✓ Pago validado y datos de envío completos. Ya puedes pasar el
                pedido a empaquetar.
              </p>
            )}
            <p className="mt-3 text-sm text-muted">
              Al pasarlo, el empaquetador lo ve en su cola y aquí deja de
              aparecer.
            </p>
          </Step>
        </PasosCentral>
      </div>
    </Panel>
  );
}
