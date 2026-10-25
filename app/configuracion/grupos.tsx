import { Glass } from "@/components/glass";
import { nombreGrupo, type Grupo } from "@/lib/grupos";
import { db } from "@/lib/session";
import { Boton, Form } from "../central/form";
import { crearGrupo, guardarGrupo } from "./grupos-actions";

type Vendedor = { id: number; usuario: string; vendedores: string | null };

const campo =
  "h-11 w-full rounded-xl border border-border bg-surface-2 px-3 text-text outline-none placeholder:text-muted/70 focus:border-primary";
const caja =
  "flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface-2/50 p-3 has-[:checked]:border-primary has-[:checked]:bg-primary-soft";
const archivo =
  "block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-text hover:file:bg-border";

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
            className="h-5 w-5 accent-primary"
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
      <Glass title="Nuevo grupo de venta">
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
            <input
              name="foto"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className={archivo}
            />
          </div>
          <Boton className="bg-primary text-on-primary hover:bg-primary-hover">
            Crear grupo
          </Boton>
        </Form>
      </Glass>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {grupos.map((g) => {
          const miembros = vendedores.filter(
            (v) => v.vendedores === g.vendedores,
          );
          return (
            <article
              key={g.vendedores}
              className="overflow-hidden rounded-3xl border border-border bg-surface"
            >
              <div
                className="relative flex h-40 items-end bg-surface-2 bg-cover bg-center p-4"
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
                    className={`text-xl font-semibold ${g.foto ? "text-white" : ""}`}
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
              <details className="group p-4">
                <summary className="cursor-pointer list-none text-sm font-medium text-primary">
                  Editar
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
                    <label className="block">
                      <span className="mb-1 block text-sm text-muted">
                        Foto del fondo (JPG, PNG o WEBP · hasta 3 MB)
                      </span>
                      <input
                        name="foto"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className={archivo}
                      />
                    </label>
                    {g.foto && (
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          name="quitar_foto"
                          className="h-4 w-4 accent-primary"
                        />
                        Quitar la foto actual
                      </label>
                    )}
                    <Vendedores
                      vendedores={vendedores}
                      marcados={miembros.map((m) => m.id)}
                    />
                  </div>
                  <Boton className="bg-primary text-on-primary hover:bg-primary-hover">
                    Guardar
                  </Boton>
                </Form>
              </details>
            </article>
          );
        })}
      </div>
    </div>
  );
}
