"use client";

import { useSyncExternalStore } from "react";
import { duracion } from "@/lib/formato";

const subscribe = (cb: () => void) => {
  const t = setInterval(cb, 15000);
  return () => clearInterval(t);
};
const ahora = () => Math.floor(Date.now() / 15000) * 15000;

// minutes waiting since the sale was registered: green < 5, amber 5-10, red > 10 (the release window)
export function Tiempo({ desde }: { desde: string }) {
  const now = useSyncExternalStore(subscribe, ahora, () => 0);
  if (!now) return null;
  const min = Math.max(
    0,
    Math.floor((now - new Date(desde).getTime()) / 60000),
  );
  const color =
    min < 5
      ? "bg-success/20 text-success-fg"
      : min <= 10
        ? "bg-warning/20 text-warning-fg"
        : "bg-danger/20 text-danger-fg";
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums ${color}`}
    >
      {min < 1 ? "recién" : `hace ${duracion(min)}`}
    </span>
  );
}
