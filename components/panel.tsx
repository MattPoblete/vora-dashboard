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
  plano?: boolean; // true: inside another surface (modal): padding, no rule
}) {
  return (
    <section
      id={id}
      className={`${plano ? "p-6" : "border-t border-text pt-4"} ${className}`}
    >
      {title && (
        <h2 className="mb-4 font-display text-xl font-medium">{title}</h2>
      )}
      {children}
    </section>
  );
}
