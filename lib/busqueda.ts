// Search contract shared by every list: `?q=` is free text, `?orden=` one of a fixed list. Both come from the URL, so
// both are validated here before they reach a query (orden only ever as a bound value or a whitelisted key).

export type ParamsBusqueda = { q?: string; orden?: string };

// ordenes: the valid keys, the first is the default; leave it out for a list with no sort selector
export function leerBusqueda(
  p: ParamsBusqueda,
  ordenes: readonly string[] = [],
  max = 100,
) {
  return {
    q: (p.q ?? "").trim().slice(0, max),
    orden: ordenes.find((o) => o === p.orden) ?? ordenes[0] ?? "",
  };
}

// `ilike` pattern for "contains": % _ \ typed by the user are matched literally
export const patron = (q: string) => "%" + q.replace(/[%_\\]/g, "\\$&") + "%";
