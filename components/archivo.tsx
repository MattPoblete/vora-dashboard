"use client";

import { useState } from "react";

// File picker in Spanish: the native one prints "Choose File / No file chosen" in the browser's language.
// The real input stays in the form (visually hidden, still focusable and required-checked).
export function Archivo({
  name,
  accept,
  required = false,
  texto = "Elegir archivo",
}: {
  name: string;
  accept?: string;
  required?: boolean;
  texto?: string;
}) {
  const [nombre, setNombre] = useState("");
  return (
    <label className="inline-flex min-w-0 cursor-pointer items-center gap-3">
      <input
        type="file"
        name={name}
        accept={accept}
        required={required}
        onChange={(e) => setNombre(e.currentTarget.files?.[0]?.name ?? "")}
        className="peer sr-only"
      />
      <span className="btn btn-secundario shrink-0 peer-focus-visible:outline-2 peer-focus-visible:outline-primary">
        {texto}
      </span>
      <span className="truncate text-sm text-muted">
        {nombre || "Ningún archivo"}
      </span>
    </label>
  );
}
