import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "./env";

// Keeps a Supabase Auth session fresh: called from proxy.ts (Next 16's replacement for middleware.ts) on every
// request. Return the response it gives back as is: it is the one carrying the refreshed cookies.
export async function actualizarSesion(request: NextRequest) {
  const { url, key } = supabaseEnv();
  let respuesta = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        respuesta = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          respuesta.cookies.set(name, value, options),
        );
        // no-cache headers: a CDN must never hand one user's refreshed session cookie to someone else
        Object.entries(headers ?? {}).forEach(([k, v]) =>
          respuesta.headers.set(k, v),
        );
      },
    },
  });

  // refreshes and verifies the token (getSession would trust the cookie as sent, which anyone can forge).
  // Without a Supabase session cookie it returns right away, no network call.
  await supabase.auth.getClaims();
  return respuesta;
}
