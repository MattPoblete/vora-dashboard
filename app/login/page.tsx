import { Panel } from "@/components/panel";
import { LoginForm } from "./form";

export default function Page() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 text-text">
      <div className="relative w-full max-w-sm">
        <h1 className="mb-8 text-center font-display text-5xl font-medium tracking-tight">
          Vora
          <span className="mt-1 block text-lg italic text-muted">Boutique</span>
        </h1>
        <Panel>
          <LoginForm />
        </Panel>
      </div>
    </main>
  );
}
