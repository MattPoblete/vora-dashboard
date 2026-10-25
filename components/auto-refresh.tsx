"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// ponytail: polling is "real time" enough for a handful of central users; swap for LISTEN/NOTIFY + SSE if it gets heavy
export function AutoRefresh({ ms = 3000 }: { ms?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (!document.hidden) router.refresh();
    }, ms);
    return () => clearInterval(t);
  }, [router, ms]);
  return null;
}
