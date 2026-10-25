import path from "node:path";

export const COMPROBANTES = path.join(process.cwd(), "uploads", "comprobantes");
export const GRUPOS = path.join(process.cwd(), "uploads", "grupos");
export const AVATARES = path.join(process.cwd(), "uploads", "avatares");
export const TIPOS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};
export const MIME: Record<string, string> = Object.fromEntries(
  Object.entries(TIPOS).map(([m, e]) => [e, m]),
);

// profile/group pictures: JPG, PNG or WEBP only (never SVG, which can carry scripts)
export const IMAGENES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export const MIME_IMAGEN: Record<string, string> = Object.fromEntries(
  Object.entries(IMAGENES).map(([m, e]) => [e, m]),
);
export type Imagen = { ext: string; buf: Buffer };
// null: nothing was sent; { error }: sent but rejected
export async function leerImagen(
  f: FormData,
  campo: string,
  maxMb: number,
): Promise<Imagen | { error: string } | null> {
  const file = f.get(campo);
  if (!(file instanceof File) || file.size === 0) return null;
  const ext = IMAGENES[file.type];
  if (!ext) return { error: "La imagen debe ser JPG, PNG o WEBP" };
  if (file.size > maxMb * 1024 * 1024)
    return { error: `La imagen supera ${maxMb} MB` };
  return { ext, buf: Buffer.from(await file.arrayBuffer()) };
}
