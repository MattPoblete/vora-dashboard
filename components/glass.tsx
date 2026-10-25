import { Vidrio } from "./vidrio";

export function Glass({
  id,
  title,
  children,
  className = "",
  vidrio = true,
}: {
  id?: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
  vidrio?: boolean; // false: the box sits inside another glass (nested backdrop filters re-run on every scroll frame)
}) {
  return (
    <section
      id={id}
      className={`relative isolate rounded-3xl p-6 ${className}`}
    >
      {vidrio && <Vidrio />}
      {title && (
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
