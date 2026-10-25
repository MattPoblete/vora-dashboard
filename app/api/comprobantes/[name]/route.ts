import { leer, MIME } from "@/lib/uploads";
import { dbq, getSession, tiene } from "@/lib/session";

export async function GET(
  _: Request,
  ctx: RouteContext<"/api/comprobantes/[name]">,
) {
  const { name } = await ctx.params;
  const s = await getSession();
  if (!s || !tiene(s, "central"))
    return new Response("No autorizado", { status: 403 });
  // strict allow-list pattern: no path separators can get through
  const m = /^\d+-\d+\.(jpg|png|webp|pdf)$/.exec(name);
  if (!m) return new Response("Not found", { status: 404 });
  // only receipts that exist as a payment visible to this role (RLS) are served
  const [pago] = await dbq`select 1 from pagos where comprobante = ${name}`;
  if (!pago) return new Response("Not found", { status: 404 });
  const buf = await leer("comprobantes", name);
  if (!buf) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(buf), {
    headers: {
      "content-type": MIME[m[1]],
      "x-content-type-options": "nosniff",
      "cache-control": "private, max-age=3600",
    },
  });
}
