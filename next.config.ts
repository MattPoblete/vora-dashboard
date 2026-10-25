import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
