import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { actualizarSesion } from "@/lib/supabase/proxy";

// optimistic check only (cookie present). The real checks are the session lookup + postgres RLS.
// Requests that get through also refresh the Supabase Auth session (lib/supabase/proxy.ts).
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    pathname === "/login" ||
    pathname === "/api/health" ||
    req.cookies.has("vora_session")
  )
    return actualizarSesion(req);
  if (pathname.startsWith("/api/"))
    return new NextResponse("No autenticado", { status: 401 });
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
