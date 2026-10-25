import { sql } from "@/lib/db";

// for the host's health check: public (see proxy.ts), says nothing but up/down
export async function GET() {
  try {
    await sql`select 1`;
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
