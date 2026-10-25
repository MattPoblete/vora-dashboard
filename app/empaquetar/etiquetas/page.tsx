import { Suspense } from "react";
import { connection } from "next/server";
import { db, requirePermiso } from "@/lib/session";
import { cargarEmpaque, lineasEtiqueta, nombreCourier } from "@/lib/empaque";
import { Imprimir } from "./imprimir";

// 10 x 15 cm thermal label, one per page
const css =
  "@page { size: 100mm 150mm; margin: 0 } @media print { body { background: #fff !important } }";

async function Etiquetas({ ids }: { ids: Promise<{ ids?: string }> }) {
  await connection();
  await requirePermiso("empaquetado");
  const lista = ((await ids).ids ?? "")
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
  const paquetes = lista.length ? await db((q) => cargarEmpaque(q, lista)) : [];
  if (!paquetes.length)
    return (
      <p className="p-8">
        No hay etiquetas para imprimir (¿ya fueron empaquetadas?).
      </p>
    );

  return (
    <>
      <style>{css}</style>
      <div className="flex items-center gap-4 p-4 print:hidden">
        <Imprimir />
        <span className="text-sm text-neutral-600">
          {paquetes.length} etiqueta(s) · tamaño 10 × 15 cm
        </span>
      </div>
      <div className="flex flex-col items-center gap-6 pb-10 print:block print:gap-0 print:pb-0">
        {paquetes.map((p) => (
          <article
            key={p.pedido}
            className="box-border flex h-[150mm] w-[100mm] flex-col border-2 border-black p-[6mm] [break-after:page] print:border-0 print:last:[break-after:auto]"
          >
            <header className="flex items-start justify-between gap-[3mm] border-b-4 border-black pb-[3mm]">
              <span className="text-[8mm] font-black uppercase leading-none">
                {nombreCourier(p.courier)}
              </span>
              <span className="shrink-0 whitespace-nowrap text-[4mm] font-semibold">
                Pedido #{p.pedido}
              </span>
            </header>
            <div className="mt-[4mm] flex-1 space-y-[3mm]">
              <p className="text-[3.5mm] font-bold uppercase tracking-widest">
                {p.courier === "retiro_tienda"
                  ? "Retira en tienda"
                  : "Destinatario"}
              </p>
              {lineasEtiqueta(p).map(([k, v]) => (
                <div key={k}>
                  <p className="text-[3mm] uppercase text-neutral-600">{k}</p>
                  <p className="text-[5mm] font-semibold leading-tight break-words">
                    {v}
                  </p>
                </div>
              ))}
            </div>
            <footer className="border-t-2 border-black pt-[3mm]">
              <p className="text-[3.5mm]">
                <b>{p.prendas.length}</b> prenda(s):{" "}
                {p.prendas.map((x) => "#" + x.codigo).join(" ")}
              </p>
              <p className="mt-[1mm] text-[3mm] text-neutral-600">
                Vora Boutique
              </p>
            </footer>
          </article>
        ))}
      </div>
    </>
  );
}

export default function Page(props: PageProps<"/empaquetar/etiquetas">) {
  return (
    <main className="min-h-screen bg-neutral-100 text-black print:bg-white">
      <Suspense fallback={<p className="p-8">Cargando etiquetas…</p>}>
        <Etiquetas ids={props.searchParams as Promise<{ ids?: string }>} />
      </Suspense>
    </main>
  );
}
