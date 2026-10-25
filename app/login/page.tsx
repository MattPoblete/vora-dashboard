import { Panel } from "@/components/panel";
import { LoginForm } from "./form";

export default function Page() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 text-text">
      <div className="relative w-full max-w-sm">
        <h1 className="mb-6 text-center text-3xl font-semibold">
          Vora Boutique
        </h1>
        <Panel>
          <LoginForm />
        </Panel>
      </div>
    </main>
  );
}
