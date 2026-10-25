// usage: node scripts/crear-usuario.mjs <usuario> <permisos> [vendedores]
//   permisos: comma separated, any of: ventas, central, empaquetado, despacho, admin
//             e.g.  admin   |   central,empaquetado   |   ventas "Diego y Dani"
//   vendedores: required when permisos include "ventas" (the pair on air), e.g. "Diego y Dani"
// The password is read from the VORA_CLAVE env var (so it stays out of shell history/process list)
// or generated and printed once. Runs as the db owner: ADMIN_DATABASE_URL (default: local vora_dev).
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import postgres from "postgres";

const VALIDOS = ["ventas", "central", "empaquetado", "despacho", "admin"];
const [usuario, lista, vendedores] = process.argv.slice(2);
const permisos = [
  ...new Set(
    (lista ?? "")
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean),
  ),
];
if (
  !usuario ||
  !permisos.length ||
  permisos.some((p) => !VALIDOS.includes(p)) ||
  permisos.includes("ventas") !== Boolean(vendedores)
) {
  console.error(
    'uso: node scripts/crear-usuario.mjs <usuario> <permisos,separados,por,coma> ["Diego y Dani" solo si incluye ventas]',
  );
  console.error("permisos válidos: " + VALIDOS.join(", "));
  process.exit(1);
}
const clave = process.env.VORA_CLAVE ?? randomBytes(9).toString("base64url");
if (clave.length < 8) {
  console.error("La contraseña debe tener al menos 8 caracteres");
  process.exit(1);
}

const salt = randomBytes(16);
const hash = `scrypt$${salt.toString("base64")}$${(await promisify(scrypt)(clave, salt, 64)).toString("base64")}`;

const sql = postgres(
  process.env.ADMIN_DATABASE_URL ??
    "postgresql://vora:vora@localhost:5433/vora_dev",
);
try {
  // a generated password is temporary (must be changed on first login); one passed in VORA_CLAVE is taken as final
  await sql`insert into usuarios (usuario, password_hash, permisos, vendedores, debe_cambiar) values (${usuario.toLowerCase()}, ${hash}, ${permisos}, ${vendedores ?? null}, ${!process.env.VORA_CLAVE})`;
  console.log(
    `Usuario creado: ${usuario.toLowerCase()} [${permisos.join(", ")}]${vendedores ? " · " + vendedores : ""}`,
  );
  if (!process.env.VORA_CLAVE)
    console.log(
      `Contraseña temporal: ${clave}   <- guárdala, no se vuelve a mostrar; deberá cambiarla al entrar`,
    );
} catch (e) {
  console.error(e.code === "23505" ? "Ese usuario ya existe" : e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
