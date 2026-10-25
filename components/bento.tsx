import Link from "next/link";
import type { ReactNode } from "react";

export type ItemBento = {
  id: string;
  content: ReactNode;
  colSpan?: 1 | 2;
  href?: string;
};

const caja =
  "flex flex-col rounded-xl border border-border bg-surface p-5 shadow-sm";

// 2 columns on a phone (the KPIs pair up), 4 on a wide screen; wide cards take 2. Heights follow the content.
export function Bento({ items }: { items: ItemBento[] }) {
  return (
    <div className="grid grid-flow-row-dense grid-cols-2 gap-4 lg:grid-cols-4">
      {items.map((it) => {
        const clase = `${caja} ${it.colSpan === 2 ? "col-span-2" : ""}`;
        return it.href ? (
          <Link
            key={it.id}
            href={it.href}
            className={`${clase} transition-colors hover:border-primary`}
          >
            {it.content}
          </Link>
        ) : (
          <div key={it.id} className={clase}>
            {it.content}
          </div>
        );
      })}
    </div>
  );
}
