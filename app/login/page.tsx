import { Glass } from "@/components/glass";
import { Fondo } from "@/components/fondo";
import { LoginForm } from "./form";

export default function Page() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 text-text">
      <Fondo />
      <div className="relative w-full max-w-sm">
        <h1 className="mb-6 text-center text-3xl font-semibold">
          Vora Boutique
        </h1>
        <Glass>
          <LoginForm />
        </Glass>
      </div>
    </main>
  );
}
