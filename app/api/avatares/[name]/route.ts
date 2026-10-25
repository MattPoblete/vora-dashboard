import { leer, MIME_IMAGEN } from "@/lib/uploads";
import { getPerfil } from "@/lib/perfil";
import { getSession } from "@/lib/session";

export async function GET(
  _: Request,
  ctx: RouteContext<"/api/avatares/[name]">,
) {
  const { name } = await ctx.params;
  if (!(await getSession()))
    return new Response("No autorizado", { status: 403 });
  // strict pattern (uuid + known extension) and only your own picture: no path tricks, no browsing other people's
  const m = /^[0-9a-f-]{36}\.(jpg|png|webp)$/.exec(name);
  if (!m || (await getPerfil()).avatar !== name)
    return new Response("Not found", { status: 404 });
  const buf = await leer("avatares", name);
  if (!buf) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(buf), {
    headers: {
      "content-type": MIME_IMAGEN[m[1]],
      "x-content-type-options": "nosniff",
      "cache-control": "private, max-age=31536000, immutable", // the name changes when the picture does
    },
  });
}
