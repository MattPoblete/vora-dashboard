import { dbq, getSession, tiene } from "@/lib/session";

export async function GET(req: Request) {
  const s = await getSession();
  if (!s || !tiene(s, "ventas", "central"))
    return new Response("No autorizado", { status: 403 });
  const q = (new URL(req.url).searchParams.get("q") ?? "")
    .replace(/^@/, "")
    .trim();
  if (!q) return Response.json([]);
  const rows = await dbq`
    select c.nombre, c.telefono, count(v.id)::int compras
    from clientes c left join ventas v on v.cliente_id = c.id
    where c.nombre ilike ${"%" + q.replace(/[%_\\]/g, "\\$&") + "%"}
    group by c.id
    order by (c.nombre ilike ${q.replace(/[%_\\]/g, "\\$&") + "%"}) desc, compras desc
    limit 8`;
  return Response.json(rows);
}
