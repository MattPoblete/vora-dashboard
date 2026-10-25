import Link from "next/link";
import { Panel } from "@/components/panel";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 text-text">
      <div className="relative w-full max-w-md">
        <Panel title="No encontrado">
          <p className="mb-6 text-lg">Esta página no existe.</p>
          <Link href="/" className="btn btn-primario w-full">
            Volver al inicio
          </Link>
        </Panel>
      </div>
    </main>
  );
}
