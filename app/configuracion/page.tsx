import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { Glass } from "@/components/glass";
import { Nav } from "@/components/nav";
import { transferencia } from "@/lib/mensajes";
import { PANTALLAS, esPermiso, type Permiso } from "@/lib/permisos";
import { db, requirePermiso } from "@/lib/session";
import { Boton, Form } from "../central/form";
import { guardarUsuario } from "./actions";
import { CrearUsuario } from "./crear";
import { Grupos } from "./grupos";
import { Registro } from "./registro";
import { Restablecer } from "./restablecer";

const TABS = [
  { id: "usuarios", label: "Usuarios" },
  { id: "grupos", label: "Grupos de venta" },
  { id: "transferencia", label: "Transferencia" },
  { id: "registro", label: "Registro" },
] as const;
type Tab = (typeof TABS)[number]["id"];

type Fila = {
  id: number;
  usuario: string;
  permisos: string[];
  vendedores: string | null;
  activo: boolean;
  bloqueado: boolean;
};

const caja =
  "flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface-2/50 p-3 has-[:checked]:border-primary has-[:checked]:bg-primary-soft";
const chip = "rounded-full bg-surface-2 px-2.5 py-0.5 text-xs text-text/80";

// ---------- tab: Usuarios (one expandable row per user, one open at a time) ----------
async function Usuarios({ yoId }: { yoId: number }) {
  const usuarios = await db(
    (q) => q<Fila[]>`select * from admin_listar_usuarios()`,
  );
  const etiqueta = (p: Permiso) =>
    p === "admin" ? "Admin" : (PANTALLAS.find((x) => x.id === p)?.label ?? p);

  return (
    <>
      <CrearUsuario />
      <Glass title={`Usuarios · ${usuarios.length}`}>
        <ul className="divide-y divide-border">
          {usuarios.map((u) => {
            const propios = u.permisos.filter(esPermiso) as Permiso[];
            const soyYo = u.id === yoId;
            return (
              <li key={u.id}>
                {/* native <details>: no JS, keyboard accessible, and `name` makes the group exclusive */}
                <details name="usuario" className="group">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-2 py-4 [&::-webkit-details-marker]:hidden">
                    <span
                      aria-hidden
                      className="text-muted transition-transform group-open:rotate-90"
                    >
                      ▶
                    </span>
                    <span className="min-w-28 text-lg font-semibold">
                      {u.usuario}
                      {soyYo && (
                        <span className="ml-2 text-sm font-normal text-muted">
                          (tú)
                        </span>
                      )}
                    </span>
                    <span className="flex flex-1 flex-wrap gap-1.5">
                      {propios.length === 0 && (
                        <span className={`${chip} text-muted`}>sin acceso</span>
                      )}
                      {propios.map((p) => (
                        <span key={p} className={chip}>
                          {etiqueta(p)}
                          {p === "ventas" && u.vendedores
                            ? ` · ${u.vendedores}`
                            : ""}
                        </span>
                      ))}
                    </span>
                    <span className="flex gap-1.5 text-xs">
                      {!u.activo && (
                        <span className="rounded-full bg-danger/20 px-2.5 py-0.5 text-danger-fg">
                          Desactivado
                        </span>
                      )}
                      {u.bloqueado && (
                        <span className="rounded-full bg-warning/20 px-2.5 py-0.5 text-warning-fg">
                          Bloqueado
                        </span>
                      )}
                    </span>
                  </summary>

                  <div className="pb-5 pl-6">
                    <Form
                      action={guardarUsuario}
                      className="space-y-3"
                      mostrarOk
                    >
                      <input type="hidden" name="id" value={u.id} />
                      {/* key: after saving, React resets the form to its old defaults; remounting the fields shows what was just stored */}
                      <fieldset
                        key={`${u.permisos.join()}|${u.vendedores}|${u.activo}`}
                        disabled={soyYo}
                        className="space-y-3"
                      >
                        <div className="grid gap-2 sm:grid-cols-2">
                          {PANTALLAS.map((p) => (
                            <label key={p.id} className={caja}>
                              <input
                                type="checkbox"
                                name="permisos"
                                value={p.id}
                                defaultChecked={propios.includes(p.id)}
                                className="mt-1 h-5 w-5 accent-primary"
                              />
                              <span>
                                <span className="block font-medium">
                                  {p.label}
                                </span>
                                <span className="block text-xs text-muted">
                                  {p.detalle}
                                </span>
                              </span>
                            </label>
                          ))}
                          <label className={`${caja} sm:col-span-2`}>
                            <input
                              type="checkbox"
                              name="permisos"
                              value="admin"
                              defaultChecked={propios.includes("admin")}
                              className="mt-1 h-5 w-5 accent-primary"
                            />
                            <span>
                              <span className="block font-medium">
                                Administrador
                              </span>
                              <span className="block text-xs text-muted">
                                Entra a todo, ve el resumen y esta configuración
                              </span>
                            </span>
                          </label>
                        </div>

                        <label className="flex cursor-pointer items-center gap-3">
                          <input
                            type="checkbox"
                            name="activo"
                            defaultChecked={u.activo}
                            className="h-5 w-5 accent-success"
                          />
                          <span>Usuario activo (puede iniciar sesión)</span>
                        </label>
                      </fieldset>

                      {soyYo ? (
                        <p className="text-sm text-muted">
                          Tu propio acceso no se edita desde aquí.
                        </p>
                      ) : (
                        <Boton className="bg-primary text-on-primary hover:bg-primary-hover">
                          Guardar cambios
                        </Boton>
                      )}
                    </Form>
                    {soyYo ? (
                      <p className="mt-3 text-sm text-muted">
                        Tu contraseña se cambia en la pestaña «Mi contraseña».
                      </p>
                    ) : (
                      <Restablecer id={u.id} usuario={u.usuario} />
                    )}
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      </Glass>
    </>
  );
}

// ---------- tab: Transferencia (read only: the values live in .env) ----------
function Transferencia() {
  const t = transferencia();
  const filas: [string, string, string][] = [
    ["Titular", t.titular, "TRANSFERENCIA_TITULAR"],
    ["RUT", t.rut, "TRANSFERENCIA_RUT"],
    ["Banco", t.banco, "TRANSFERENCIA_BANCO"],
    ["Tipo de cuenta", t.tipoCuenta, "TRANSFERENCIA_TIPO_CUENTA"],
    ["N° de cuenta", t.numeroCuenta, "TRANSFERENCIA_NUMERO_CUENTA"],
    ["Email para el comprobante", t.email, "TRANSFERENCIA_EMAIL"],
  ];
  return (
    <div className="max-w-2xl">
      <Glass title="Datos de transferencia">
        <p className="mb-4 text-sm text-muted">
          Es lo que central envía a los clientes en el mensaje de transferencia.
          Se lee del archivo <code>.env</code>: para cambiarlo, edita las
          variables y reinicia el servidor.
        </p>
        <dl className="divide-y divide-border">
          {filas.map(([nombre, valor, variable]) => {
            const falta = valor.startsWith("[");
            return (
              <div
                key={variable}
                className="flex flex-wrap items-baseline justify-between gap-2 py-3"
              >
                <dt className="text-muted">{nombre}</dt>
                <dd className={falta ? "text-danger-fg" : "font-medium"}>
                  {falta ? `Falta definir ${variable}` : valor}
                </dd>
              </div>
            );
          })}
        </dl>
      </Glass>
    </div>
  );
}

// ---------- page ----------
async function Contenido({
  params,
}: {
  params: Promise<{ tab?: string; t?: string }>;
}) {
  await connection();
  const yo = await requirePermiso(); // admin only
  const { tab: pedida, t } = await params;
  const tab: Tab = TABS.some((t) => t.id === pedida)
    ? (pedida as Tab)
    : "usuarios";

  return (
    <>
      <div
        role="tablist"
        aria-label="Configuración"
        className="mb-6 flex w-fit max-w-full gap-1 overflow-x-auto rounded-2xl bg-surface-2 p-1"
      >
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/configuracion?tab=${t.id}`}
            role="tab"
            aria-selected={t.id === tab}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition ${
              t.id === tab
                ? "bg-primary text-on-primary shadow-sm"
                : "text-muted hover:text-text"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <div role="tabpanel">
        {tab === "usuarios" && <Usuarios yoId={yo.usuarioId} />}
        {tab === "grupos" && <Grupos />}
        {tab === "transferencia" && <Transferencia />}
        {tab === "registro" && <Registro tabla={t ?? ""} />}
      </div>
    </>
  );
}

export default function Page(props: PageProps<"/configuracion">) {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 pb-32 pt-8 text-text sm:px-8">
      <div className="relative mx-auto max-w-4xl">
        <header className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold">Configuración</h1>
            <p className="text-muted">
              Usuarios, grupos de venta, transferencia y registro de cambios
            </p>
          </div>
          <Nav />
        </header>
        <Suspense
          fallback={<p className="text-center text-muted">Cargando…</p>}
        >
          <Contenido
            params={props.searchParams as Promise<{ tab?: string; t?: string }>}
          />
        </Suspense>
      </div>
    </main>
  );
}
