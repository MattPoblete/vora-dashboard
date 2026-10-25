// usage: ADMIN_DATABASE_URL=postgres://... node scripts/migrar.mjs [--ya-aplicadas]
// Applies every db/init/*.sql not yet recorded in the `migraciones` table, in file-name order, each one in its own
// transaction (a failing file changes nothing and stops the run). Runs as the db owner (Supabase: `postgres`).
//   --ya-aplicadas   only records the current files as applied, without running them: for a database that already
//                    got them by hand (psql -f) before this script existed
// VORA_APP_CLAVE=...  also sets the password of vora_app, the login the app uses (002 creates it with a dev one).
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const url = process.env.ADMIN_DATABASE_URL;
if (!url) {
  console.error("Falta ADMIN_DATABASE_URL (conexión como dueño de la base)");
  process.exit(1);
}
const dir = path.join(import.meta.dirname, "..", "db", "init");
const sql = postgres(url, { max: 1, onnotice: () => {} });

try {
  await sql`create table if not exists migraciones (
    archivo     text primary key,
    aplicada_en timestamptz not null default now()
  )`;
  await sql`revoke all on migraciones from public`;
  const hechas = new Set(
    (await sql`select archivo from migraciones`).map((r) => r.archivo),
  );
  const pendientes = (await readdir(dir))
    .filter((f) => f.endsWith(".sql") && !hechas.has(f))
    .sort();
  const soloMarcar = process.argv.includes("--ya-aplicadas");

  for (const archivo of pendientes) {
    const texto = await readFile(path.join(dir, archivo), "utf8");
    await sql.begin(async (tx) => {
      if (!soloMarcar) await tx.unsafe(texto);
      await tx`insert into migraciones (archivo) values (${archivo})`;
    });
    console.log(`${soloMarcar ? "marcada" : "aplicada"}: ${archivo}`);
  }
  if (!pendientes.length) console.log("Nada pendiente");

  const clave = process.env.VORA_APP_CLAVE;
  if (clave) {
    if (clave.length < 24) throw new Error("VORA_APP_CLAVE: usa al menos 24 caracteres");
    // format(%L) quotes it; ALTER ROLE takes no bind parameters
    const [{ q }] = await sql`select format('alter role vora_app password %L', ${clave}::text) q`;
    await sql.unsafe(q);
    console.log("Contraseña de vora_app actualizada");
  }
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
