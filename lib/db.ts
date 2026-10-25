import postgres from "postgres";

// vora_app has no privileges of its own: lib/session.ts switches it to the logged-in user's role per request
const url =
  process.env.DATABASE_URL ??
  "postgresql://vora_app:vora_app@localhost:5433/vora";

// ponytail: module-level singleton; dev HMR may leak a pool, stash on globalThis if it bites
export const sql = postgres(url, { max: 5 });
