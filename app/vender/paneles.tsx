"use client";

import { useState, type ReactNode } from "react";

// On a phone the form and the latest sales used to stack; now they are tabs. On a wide screen (lg) both stay side by
// side and the tab bar disappears. min-w-0: a grid item otherwise grows to its content and overflows a phone screen. Both panels stay mounted and only the hidden one is `display: none`, so what the
// seller already typed is not lost when switching tabs.
export function PanelesVenta({
  formulario,
  ultimas,
  cantidad,
}: {
  formulario: ReactNode;
  ultimas: ReactNode;
  cantidad: number;
}) {
  const [tab, setTab] = useState<"form" | "ultimas">("form");
  const boton = (id: "form" | "ultimas", texto: string) => (
    <button
      type="button"
      role="tab"
      id={`tab-${id}`}
      aria-selected={tab === id}
      aria-controls={`panel-${id}`}
      onClick={() => setTab(id)}
      className={`flex-1 rounded-xl px-4 py-3 text-base font-medium transition ${
        tab === id
          ? "bg-surface text-text shadow-sm"
          : "text-muted hover:text-text"
      }`}
    >
      {texto}
    </button>
  );

  return (
    <>
      <div
        role="tablist"
        aria-label="Venta"
        className="mb-4 flex gap-1 rounded-2xl bg-surface-2 p-1 lg:hidden"
      >
        {boton("form", "Agregar")}
        {boton("ultimas", `Últimas ventas · ${cantidad}`)}
      </div>
      <div className="grid gap-5 lg:grid-cols-5">
        <div
          role="tabpanel"
          id="panel-form"
          aria-labelledby="tab-form"
          className={`min-w-0 lg:col-span-3 ${tab === "form" ? "" : "max-lg:hidden"}`}
        >
          {formulario}
        </div>
        <div
          role="tabpanel"
          id="panel-ultimas"
          aria-labelledby="tab-ultimas"
          className={`min-w-0 lg:col-span-2 ${tab === "ultimas" ? "" : "max-lg:hidden"}`}
        >
          {ultimas}
        </div>
      </div>
    </>
  );
}
