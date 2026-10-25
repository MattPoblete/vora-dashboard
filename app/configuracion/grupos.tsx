import { Panel } from "@/components/panel";
import { Archivo } from "@/components/archivo";
import { nombreGrupo, type Grupo } from "@/lib/grupos";
import { db } from "@/lib/session";
import { Boton, Form } from "../central/form";
import { crearGrupo, guardarGrupo } from "./grupos-actions";

type Vendedor = { id: number; usuario: string; vendedores: string | null };

const campo = "campo";
const caja =
  "flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface-2/50 p-3 has-[:checked]:border-primary has-[:checked]:bg-primary-soft";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// every active seller is a card you tick; two ticked + Crear makes a group (a "tab" of the live gallery)
function Vendedores({
  vendedores,
  marcados = [],
}: {
  vendedores: Vendedor[];
  marcados?: number[];
}) {
  if (!vendedores.length)
    return (
      <p className="text-sm text-muted">
        Aún no hay usuarios activos con permiso de Ventas.
      </p>
    );
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {vendedores.map((v) => (
        <label key={v.id} className={caja}>
          <input
            type="checkbox"
            name="miembros"
            value={v.id}
            defaultChecked={marcados.includes(v.id)}
            className="size-4"
          />
          <span>
            <span className="block font-medium">{cap(v.usuario)}</span>
            <span className="block text-xs text-muted">
              {v.vendedores ?? "sin grupo"}
            </span>
          </span>
        </label>
      ))}
    </div>
  );
}

export async function Grupos() {
  const { grupos, vendedores } = await db(async (q) => ({
    grupos: await q<
      Grupo[]
    >`select vendedores, alias, foto from grupos_venta order by vendedores`,
    vendedores: await q<
      Vendedor[]
    >`select id, usuario, vendedores from admin_listar_usuarios() where activo and 'ventas' = any(permisos) order by usuario`,
  }));

  return (
    <div className="space-y-6">
      <Panel title="Nuevo grupo de venta">
        <p className="mb-4 text-sm text-muted">
          Marca a los 2 vendedores de la pareja. Si alguno ya estaba en otro
          grupo, pasa a este.
        </p>
        <Form action={crearGrupo} resetOnOk mostrarOk className="space-y-4">
          <Vendedores vendedores={vendedores} />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              name="alias"
              maxLength={40}
              placeholder="Alias del dúo (opcional)"
              autoComplete="off"
              className={campo}
            />
            <Archivo
              name="foto"
              accept="image/jpeg,image/png,image/webp"
              texto="Foto del dúo"
            />
          </div>
          <Boton className="btn-primario">Crear grupo</Boton>
        </Form>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {grupos.map((g) => {
          const miembros = vendedores.filter(
            (v) => v.vendedores === g.vendedores,
          );
          return (
            <article key={g.vendedores} className="border-t border-border">
              <div
                className={`relative flex items-end bg-cover bg-center ${g.foto ? "mt-3 h-40 overflow-hidden rounded-xl p-4" : "pt-3"}`}
                style={
                  g.foto
                    ? { backgroundImage: `url(/api/grupos/${g.foto})` }
                    : undefined
                }
              >
                {g.foto && (
                  <span className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                )}
                <div className="relative">
                  <h3
                    className={`font-display text-2xl font-medium ${g.foto ? "text-white" : ""}`}
                  >
                    {nombreGrupo(g)}
                  </h3>
                  <p
                    className={`text-sm ${g.foto ? "text-white/80" : "text-muted"}`}
                  >
                    {miembros.length
                      ? miembros.map((m) => cap(m.usuario)).join(" · ")
                      : "Sin integrantes"}
                  </p>
                </div>
              </div>
              <details className="group py-3">
                <summary className="flex w-fit items-center gap-1 text-sm font-medium text-primary">
                  Editar
                  <span
                    aria-hidden
                    className="transition-transform group-open:rotate-90"
                  >
                    ›
                  </span>
                </summary>
                <Form
                  action={guardarGrupo}
                  mostrarOk
                  className="mt-4 space-y-3"
                >
                  <input type="hidden" name="grupo" value={g.vendedores} />
                  {/* key: after saving, React keeps the old uncontrolled values; remounting shows what was stored */}
                  <div
                    key={`${g.alias}|${g.foto}|${miembros.map((m) => m.id).join()}`}
                    className="space-y-3"
                  >
                    <label className="block">
                      <span className="mb-1 block text-sm text-muted">
                        Alias
                      </span>
                      <input
                        name="alias"
                        defaultValue={g.alias ?? ""}
                        maxLength={40}
                        placeholder={g.vendedores}
                        autoComplete="off"
                        className={campo}
                      />
                    </label>
                    <div>
                      <span className="mb-1 block text-sm text-muted">
                        Foto del fondo (JPG, PNG o WEBP · hasta 3 MB)
                      </span>
                      <Archivo
                        name="foto"
                        accept="image/jpeg,image/png,image/webp"
                      />
                    </div>
                    {g.foto && (
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="quitar_foto"
                          className="size-4"
                        />
                        Quitar la foto actual
                      </label>
                    )}
                    <Vendedores
                      vendedores={vendedores}
                      marcados={miembros.map((m) => m.id)}
                    />
                  </div>
                  <Boton className="btn-primario">Guardar</Boton>
                </Form>
              </details>
            </article>
          );
        })}
      </div>
    </div>
  );
}
