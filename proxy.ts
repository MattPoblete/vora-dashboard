import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// optimistic check only (cookie present). The real checks are the session lookup + postgres RLS.
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    pathname === "/login" ||
    pathname === "/api/health" ||
    req.cookies.has("vora_session")
  )
    return NextResponse.next();
  if (pathname.startsWith("/api/"))
    return new NextResponse("No autenticado", { status: 401 });
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
