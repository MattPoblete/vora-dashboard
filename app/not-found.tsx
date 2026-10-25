import Link from "next/link";
import { Panel } from "@/components/panel";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 text-text">
      <div className="relative w-full max-w-md">
        <Panel title="No encontrado">
          <p className="mb-6 text-lg">Esta página no existe.</p>
          <Link
            href="/"
            className="flex h-12 w-full items-center justify-center rounded-2xl bg-primary text-lg font-semibold text-on-primary hover:bg-primary-hover"
          >
            Volver al inicio
          </Link>
        </Panel>
      </div>
    </main>
  );
}
