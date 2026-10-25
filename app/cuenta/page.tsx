import { redirect } from "next/navigation";
import { Panel } from "@/components/panel";
import { Archivo } from "@/components/archivo";
import { Pagina } from "@/components/pagina";
import { getPerfil } from "@/lib/perfil";
import { getSession } from "@/lib/session";
import { Boton, Form } from "../central/form";
import { FormularioPassword } from "./formulario";
import { guardarPerfil } from "./perfil-actions";

const campo = "campo";

async function Contenido() {
  const s = await getSession();
  if (!s) redirect("/login");
  const p = await getPerfil();

  // a temporary password blocks everything else: only the change form shows
  if (s.debeCambiar)
    return (
      <Panel title="Elige tu contraseña">
        <FormularioPassword usuario={s.usuario} temporal />
      </Panel>
    );

  return (
    <div className="space-y-6">
      <Panel title="Ajustes del perfil">
        <Form action={guardarPerfil} mostrarOk className="space-y-4">
          {/* key: after saving, React keeps the old uncontrolled values; remounting shows what was stored */}
          <div
            key={`${p.nombre}|${p.telefono}|${p.avatar}`}
            className="space-y-4"
          >
            <div className="flex items-center gap-4">
              <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-2 text-2xl font-semibold text-muted ring-1 ring-border">
                {p.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/avatares/${p.avatar}`}
                    alt="Tu avatar"
                    className="size-full object-cover"
                  />
                ) : (
                  (p.nombre || s.usuario).charAt(0).toUpperCase()
                )}
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <Archivo
                  name="avatar"
                  accept="image/jpeg,image/png,image/webp"
                  texto="Cambiar foto"
                />
                <p className="text-xs text-muted">
                  JPG, PNG o WEBP · hasta 2 MB
                </p>
                {p.avatar && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="quitar_avatar"
                      className="size-4"
                    />
                    Quitar el avatar actual
                  </label>
                )}
              </div>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Nombre</span>
              <input
                name="nombre"
                defaultValue={p.nombre ?? ""}
                maxLength={60}
                placeholder={s.usuario}
                autoComplete="name"
                className={campo}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Teléfono de contacto
              </span>
              <input
                name="telefono"
                type="tel"
                defaultValue={p.telefono ?? ""}
                maxLength={20}
                placeholder="+56 9 1234 5678"
                autoComplete="tel"
                className={campo}
              />
            </label>
            <p className="text-sm text-muted">
              Usuario: <b className="text-text">{s.usuario}</b>
            </p>
          </div>
          <Boton className="btn-primario">Guardar cambios</Boton>
        </Form>
      </Panel>

      <Panel title="Contraseña">
        {/* native <details>: opens the change form only when asked */}
        <details>
          <summary className="btn btn-secundario w-fit">
            Restablecer contraseña
          </summary>
          <div className="mt-4">
            <FormularioPassword usuario={s.usuario} />
          </div>
        </details>
      </Panel>
    </div>
  );
}

export default function Page() {
  return (
    <Pagina titulo="Mi cuenta" subtitulo="Tu perfil y tu contraseña" angosto>
      <Contenido />
    </Pagina>
  );
}
