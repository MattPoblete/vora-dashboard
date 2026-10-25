import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { cookies } from "next/headers";
import { supabaseEnv } from "./env";

// Server Components, Server Actions and Route Handlers. One client per request: it carries that request's cookies.
//   const supabase = createClient(await cookies())
export function createClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  const { url, key } = supabaseEnv();
  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // called from a Server Component, which can't write cookies: proxy.ts refreshes the session instead
        }
      },
    },
  });
}
