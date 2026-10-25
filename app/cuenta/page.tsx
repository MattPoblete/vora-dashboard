import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Glass } from "@/components/glass";
import { Nav } from "@/components/nav";
import { getPerfil } from "@/lib/perfil";
import { getSession } from "@/lib/session";
import { Boton, Form } from "../central/form";
import { FormularioPassword } from "./formulario";
import { guardarPerfil } from "./perfil-actions";

const campo =
  "h-12 w-full rounded-xl border border-border bg-surface-2 px-4 text-text outline-none placeholder:text-muted/70 focus:border-primary";

async function Contenido() {
  const s = await getSession();
  if (!s) redirect("/login");
  const p = await getPerfil();

  // a temporary password blocks everything else: only the change form shows
  if (s.debeCambiar)
    return (
      <Glass title="Elige tu contraseña">
        <FormularioPassword usuario={s.usuario} temporal />
      </Glass>
    );

  return (
    <div className="space-y-6">
      <Glass title="Ajustes del perfil">
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
                <input
                  name="avatar"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  aria-label="Avatar"
                  className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-text hover:file:bg-border"
                />
                <p className="text-xs text-muted">
                  JPG, PNG o WEBP · hasta 2 MB
                </p>
                {p.avatar && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="quitar_avatar"
                      className="h-4 w-4 accent-primary"
                    />
                    Quitar el avatar actual
                  </label>
                )}
              </div>
            </div>
            <label className="block">
              <span className="mb-1 block text-sm text-muted">Nombre</span>
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
              <span className="mb-1 block text-sm text-muted">
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
          <Boton className="bg-primary text-on-primary hover:bg-primary-hover">
            Guardar cambios
          </Boton>
        </Form>
      </Glass>

      <Glass title="Contraseña">
        {/* native <details>: opens the change form only when asked */}
        <details>
          <summary className="inline-block cursor-pointer list-none rounded-xl border border-border bg-surface-2 px-4 py-2 font-medium hover:bg-border">
            Restablecer contraseña
          </summary>
          <div className="mt-4">
            <FormularioPassword usuario={s.usuario} />
          </div>
        </details>
      </Glass>
    </div>
  );
}

export default function Page() {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 pb-32 pt-10 text-text sm:px-8">
      <div className="relative mx-auto max-w-xl">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold">Mi cuenta</h1>
          <p className="text-muted">Tu perfil y tu contraseña</p>
        </header>
        <Suspense
          fallback={<p className="text-center text-muted">Cargando…</p>}
        >
          <Contenido />
        </Suspense>
      </div>
      <Nav />
    </main>
  );
}
