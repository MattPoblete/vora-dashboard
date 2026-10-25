"use client";

import { useEffect } from "react";

export function Imprimir() {
  // open the print dialog as soon as the labels are on screen
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);
  return (
    <button
      onClick={() => window.print()}
      className="rounded-lg bg-black px-4 py-2 font-medium text-white print:hidden"
    >
      🖨 Imprimir
    </button>
  );
}
