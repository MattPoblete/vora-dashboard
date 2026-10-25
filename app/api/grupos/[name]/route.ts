import { leer, MIME_IMAGEN } from "@/lib/uploads";
import { dbq, getSession } from "@/lib/session";

export async function GET(_: Request, ctx: RouteContext<"/api/grupos/[name]">) {
  const { name } = await ctx.params;
  if (!(await getSession()))
    return new Response("No autorizado", { status: 403 });
  // strict pattern (uuid + known extension): no path separators can get through
  const m = /^[0-9a-f-]{36}\.(jpg|png|webp)$/.exec(name);
  if (!m) return new Response("Not found", { status: 404 });
  try {
    // only photos of groups this role can see (RLS: a vendedor sees their own group's; roles without access to the
    // table at all get a permission error, also answered 404)
    const [g] = await dbq`select 1 from grupos_venta where foto = ${name}`;
    if (!g) return new Response("Not found", { status: 404 });
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const buf = await leer("grupos", name);
  if (!buf) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(buf), {
    headers: {
      "content-type": MIME_IMAGEN[m[1]],
      "x-content-type-options": "nosniff",
      "cache-control": "private, max-age=31536000, immutable", // the name changes when the photo does
    },
  });
}
