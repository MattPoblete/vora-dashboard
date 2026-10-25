// usage: node --env-file=.env.local scripts/subir-uploads.mjs
// One-off: copies the files the app used to keep on disk (uploads/comprobantes|grupos|avatares) into the private
// Supabase Storage bucket `archivos` (db/init/012_storage.sql), same names, so existing payments and profiles keep
// their files. Safe to re-run (overwrites with the same content). Needs NEXT_PUBLIC_SUPABASE_URL and
// SUPABASE_SECRET_KEY. The local folder is left untouched: delete it yourself once the app shows the files.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const clave = process.env.SUPABASE_SECRET_KEY;
if (!url || !clave) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY");
  process.exit(1);
}
const MIME = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", pdf: "application/pdf" };
const raiz = path.join(import.meta.dirname, "..", "uploads");
const bucket = createClient(url, clave, {
  auth: { persistSession: false, autoRefreshToken: false },
}).storage.from("archivos");

let ok = 0;
let fallos = 0;
for (const carpeta of ["comprobantes", "grupos", "avatares"]) {
  const archivos = await readdir(path.join(raiz, carpeta)).catch(() => []);
  for (const nombre of archivos) {
    const tipo = MIME[nombre.split(".").pop()];
    if (!tipo) continue; // .DS_Store and the like
    const { error } = await bucket.upload(
      `${carpeta}/${nombre}`,
      await readFile(path.join(raiz, carpeta, nombre)),
      { contentType: tipo, upsert: true },
    );
    if (error) {
      fallos++;
      console.error(`✗ ${carpeta}/${nombre}: ${error.message}`);
    } else ok++;
  }
}
console.log(`${ok} subidos, ${fallos} con error`);
process.exitCode = fallos ? 1 : 0;
