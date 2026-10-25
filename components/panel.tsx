export function Panel({
  id,
  title,
  children,
  className = "",
  plano = false,
}: {
  id?: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
  plano?: boolean; // true: the box already sits inside another surface (modal), so no second border
}) {
  return (
    <section
      id={id}
      className={`p-6 ${plano ? "" : "rounded-xl border border-border bg-surface shadow-sm"} ${className}`}
    >
      {title && <h2 className="mb-4 text-base font-semibold">{title}</h2>}
      {children}
    </section>
  );
}
