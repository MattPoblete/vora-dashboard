import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";

// Client Components. createBrowserClient keeps a singleton, so calling this repeatedly is cheap.
export function createClient() {
  const { url, key } = supabaseEnv();
  return createBrowserClient(url, key);
}
