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
      className="mb-8 flex max-w-full gap-6 overflow-x-auto border-b border-border max-sm:pr-8 max-sm:[mask-image:linear-gradient(to_right,black_calc(100%-2rem),transparent)]"
    >
      {tabs.map((t) => {
        const activo = t.id === actual;
        return (
          <Link
            key={t.id}
            href={t.href}
            role="tab"
            aria-selected={activo}
            className={`-mb-px flex h-10 items-center whitespace-nowrap border-b-2 text-sm font-medium transition-colors ${
              activo
                ? "border-primary text-text"
                : "border-transparent text-muted hover:text-text"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
