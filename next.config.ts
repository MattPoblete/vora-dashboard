import type { NextConfig } from "next";

// ponytail: no nonces, they force dynamic rendering and would turn off partial prerendering; 'unsafe-inline' scripts is
// the price. Everything is served from our own origin, so 'self' is enough.
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL;
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  // the browser Supabase client (lib/supabase/client.ts) talks to the project directly; wss for Realtime
  `connect-src 'self'${supabase ? ` ${supabase} ${supabase.replace(/^https/, "wss")}` : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          // ignored by browsers over plain http, so the LAN dev server is unaffected
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  cacheComponents: true,
  // lets a production build live next to the running dev server (NEXT_DIST_DIR=.next-perf next build)
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // dev only: let phones/other computers on the local network use the dev server (hot reload included).
  // 172.20.10.* is the iPhone hotspot range, 192.168.* the usual home/office router range.
  allowedDevOrigins: ["172.20.10.*", "192.168.*.*"],
  partialPrefetching: true,
  experimental: { serverActions: { bodySizeLimit: "10mb" } }, // transfer receipts
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
