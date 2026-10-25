"use server";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { db, requirePermiso } from "@/lib/session";
import { GRUPOS, leerImagen, type Imagen } from "@/lib/uploads";
import type { Estado } from "../vender/actions";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// trust boundary: the form is client-controlled
const ids = (f: FormData) => [
  ...new Set(
    f
      .getAll("miembros")
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0),
  ),
];
const alias = (f: FormData) =>
  String(f.get("alias") ?? "")
    .trim()
    .slice(0, 40) || null;

type Foto = Imagen;
const leerFoto = (f: FormData) => leerImagen(f, "foto", 3);
async function guardarArchivo(nombre: string, buf: Buffer) {
  await mkdir(GRUPOS, { recursive: true });
  await writeFile(path.join(GRUPOS, nombre), buf);
}
const sinFoto = (x: Foto | { error: string } | null): x is { error: string } =>
  !!x && "error" in x;

const falloPlanificado = (e: unknown) =>
  (e as { code?: string }).code === "P0001"
    ? { error: (e as Error).message }
    : null;

export async function crearGrupo(_: Estado, f: FormData): Promise<Estado> {
  await requirePermiso(); // admin only
  const miembros = ids(f);
  if (miembros.length !== 2) return { error: "Elige exactamente 2 vendedores" };
  const foto = await leerFoto(f);
  if (sinFoto(foto)) return foto;
  try {
    const r = await db(async (q) => {
      const us =
        await q`select usuario from admin_listar_usuarios() where id in ${q(miembros)}`;
      if (us.length !== 2) return { error: "Vendedor inválido" };
      const nombre = us
        .map((u) => cap(u.usuario))
        .sort()
        .join(" y ");
      const archivo = foto ? `${randomUUID()}.${foto.ext}` : null;
      const [g] = await q`
        insert into grupos_venta (vendedores, alias, foto) values (${nombre}, ${alias(f)}, ${archivo})
        on conflict do nothing returning vendedores`;
      if (!g) return { error: `Ya existe el grupo ${nombre}` };
      // moves the two users here: they leave whatever group they were in
      await q`select admin_fijar_miembros(${nombre}, ${q.array(miembros)}::int[])`;
      if (foto && archivo) await guardarArchivo(archivo, foto.buf);
      return { ok: `Grupo ${nombre} creado` };
    });
    revalidatePath("/configuracion");
    revalidatePath("/vender");
    return r;
  } catch (e) {
    const plan = falloPlanificado(e);
    if (plan) return plan;
    throw e;
  }
}

export async function guardarGrupo(_: Estado, f: FormData): Promise<Estado> {
  await requirePermiso(); // admin only
  const grupo = String(f.get("grupo") ?? "");
  const quitar = f.get("quitar_foto") === "on";
  const foto = await leerFoto(f);
  if (sinFoto(foto)) return foto;
  try {
    const r = await db(async (q) => {
      const [cur] =
        await q`select foto from grupos_venta where vendedores = ${grupo}`;
      if (!cur) return { error: "El grupo no existe" };
      const nueva = foto
        ? `${randomUUID()}.${foto.ext}`
        : quitar
          ? null
          : (cur.foto as string | null);
      await q`update grupos_venta set alias = ${alias(f)}, foto = ${nueva} where vendedores = ${grupo}`;
      await q`select admin_fijar_miembros(${grupo}, ${q.array(ids(f))}::int[])`;
      if (foto && nueva) await guardarArchivo(nueva, foto.buf);
      return {
        ok: "Guardado",
        viejo: nueva !== cur.foto ? (cur.foto as string | null) : null,
      };
    });
    if ("viejo" in r && r.viejo)
      await unlink(path.join(GRUPOS, r.viejo)).catch(() => {});
    revalidatePath("/configuracion");
    revalidatePath("/vender");
    return "error" in r ? { error: r.error } : { ok: r.ok };
  } catch (e) {
    const plan = falloPlanificado(e);
    if (plan) return plan;
    throw e;
  }
}
