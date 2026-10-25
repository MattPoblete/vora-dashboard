// Both are public by design (NEXT_PUBLIC_ = sent to the browser): the URL and the *publishable* key. Never put the
// secret / service_role key behind a NEXT_PUBLIC_ name.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// fail loudly instead of a client that silently talks to "undefined"
export function supabaseEnv() {
  if (!SUPABASE_URL || !SUPABASE_KEY)
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en el entorno",
    );
  return { url: SUPABASE_URL, key: SUPABASE_KEY };
}
