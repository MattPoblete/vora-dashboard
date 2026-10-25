import { Panel } from "@/components/panel";

export default function Page() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden px-4 pb-24 text-text">
      <div className="relative w-full max-w-md">
        <Panel title="Sin acceso">
          <p className="text-lg">
            Tu usuario todavía no tiene pantallas asignadas. Pídele a un
            administrador que te dé acceso.
          </p>
        </Panel>
      </div>
    </main>
  );
}
