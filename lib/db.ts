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
export const sql = postgres(url, { max: 5 });
