"use client";

import { useSyncExternalStore } from "react";

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
        : "bg-danger/30 text-danger-fg";
  return (
    <span className={`rounded-full px-3 py-1 text-sm tabular-nums ${color}`}>
      {min < 1 ? "recién" : `hace ${min} min`}
    </span>
  );
}
