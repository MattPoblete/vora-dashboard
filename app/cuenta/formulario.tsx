import { Boton, Form } from "../central/form";
import { cambiarPassword } from "./actions";

const campo =
  "h-12 w-full rounded-xl border border-border bg-surface-2 px-4 text-text outline-none placeholder:text-muted/70 focus:border-primary";

// Used by /cuenta, both for the regular change and for the forced change of a temporary password.
export function FormularioPassword({
  usuario,
  temporal = false,
}: {
  usuario: string;
  temporal?: boolean;
}) {
  return (
    <>
      {temporal && (
        <p className="mb-4 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-warning-fg">
          Tu contraseña es temporal. Debes cambiarla antes de seguir.
        </p>
      )}
      <Form action={cambiarPassword} className="space-y-3">
        {/* lets password managers attach the new password to the right account */}
        <input
          type="text"
          name="usuario"
          value={usuario}
          autoComplete="username"
          readOnly
          hidden
        />
        <input
          name="actual"
          type="password"
          placeholder={temporal ? "Contraseña temporal" : "Contraseña actual"}
          autoComplete="current-password"
          required
          className={campo}
        />
        <input
          name="nueva"
          type="password"
          placeholder="Nueva contraseña (mín. 8 caracteres)"
          autoComplete="new-password"
          minLength={8}
          required
          className={campo}
        />
        <input
          name="repetir"
          type="password"
          placeholder="Repite la nueva contraseña"
          autoComplete="new-password"
          minLength={8}
          required
          className={campo}
        />
        <Boton className="h-12 w-full bg-primary text-lg text-on-primary hover:bg-primary-hover">
          Guardar contraseña
        </Boton>
      </Form>
      <p className="mt-4 text-xs text-muted">
        Al cambiarla se cierran tus sesiones en los demás dispositivos.
      </p>
    </>
  );
}
