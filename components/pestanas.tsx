import Link from "next/link";

export type Pestana = {
  id: string;
  label: string;
  href: string;
};

// tab bar of links (summary, settings); scrolls sideways on a phone
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
      className="mb-6 flex w-fit max-w-full gap-1 overflow-x-auto rounded-xl bg-surface-2 p-1 max-sm:pr-8 max-sm:[mask-image:linear-gradient(to_right,black_calc(100%-2rem),transparent)]"
    >
      {tabs.map((t) => {
        const activo = t.id === actual;
        return (
          <Link
            key={t.id}
            href={t.href}
            role="tab"
            aria-selected={activo}
            className={`flex h-9 items-center whitespace-nowrap rounded-lg px-3.5 text-sm font-medium transition ${
              activo
                ? "bg-surface text-text shadow-sm"
                : "text-muted hover:text-text"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
