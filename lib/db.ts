import postgres from "postgres";

// vora_app has no privileges of its own: lib/session.ts switches it to the logged-in user's role per request.
// The local docker default is for development only: a production server without DATABASE_URL refuses to start
// instead of quietly trying a dev password (the build is exempt: it imports this file but never queries).
const url =
  process.env.DATABASE_URL ??
  (process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build"
    ? undefined
    : "postgresql://vora_app:vora_app@localhost:5433/vora");
if (!url) throw new Error("Falta DATABASE_URL");

// ponytail: module-level singleton; dev HMR may leak a pool, stash on globalThis if it bites
// prepare: false so it also works through Supabase's transaction pooler (port 6543, the one for serverless/Vercel),
// which can't keep prepared statements. Its other limit (nothing survives between transactions) is already met: the
// per-request role switch is SET LOCAL inside a transaction (lib/session.ts), the rest are single statements
// max: 2 because each serverless instance has its own pool and the pooler caps total clients (EMAXCONNSESSION at 15 in
// session mode); 2 and not 1 so a `sql` call inside a db() transaction can't deadlock waiting for its own connection
export const sql = postgres(url, { max: 2, prepare: false });
