import Link from "next/link";
import type { IconSvgElement } from "@hugeicons/react";
import { IconoActivo } from "./icono-activo";

export type Pestana = {
  id: string;
  label: string;
  href: string;
  icono: IconSvgElement;
};

// tab bar of links (summary, settings): the open tab shows its icon on glass, the rest are plain text.
// Fixed height so switching tabs (and the icon appearing) never makes the bar jump; overflow-y-hidden: the glass
// canvas reaches past the icon (transparent margin for the tilted card) and would otherwise make the bar scroll.
export function Pestanas({
  tabs,
  actual,
  label,
}: {
  tabs: Pestana[];
  actual: string;
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="mb-6 flex w-fit max-w-full gap-1 overflow-x-auto overflow-y-hidden rounded-2xl bg-surface-2 p-1"
    >
      {tabs.map((t) => {
        const activo = t.id === actual;
        return (
          <Link
            key={t.id}
            href={t.href}
            role="tab"
            aria-selected={activo}
            className={`flex h-10 items-center gap-2.5 whitespace-nowrap rounded-xl px-4 text-sm font-medium transition ${
              activo
                ? "bg-surface pl-2.5 text-text shadow-sm"
                : "text-muted hover:text-text"
            }`}
          >
            {activo && <IconoActivo icon={t.icono} size={28} />}
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
