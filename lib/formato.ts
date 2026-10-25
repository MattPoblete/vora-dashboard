export const num = (n: number) => Number(n).toLocaleString("es-CL");
export const clp = (n: number) => "$" + num(n);
export const prendas = (n: number) =>
  `${num(n)} ${n === 1 ? "prenda" : "prendas"}`;

// "35 min" / "2 h 15 min" / "3 d"
export function duracion(min: number) {
  if (min < 60) return `${min} min`;
  if (min < 60 * 24) {
    const m = min % 60;
    return m
      ? `${Math.floor(min / 60)} h ${m} min`
      : `${Math.floor(min / 60)} h`;
  }
  return `${Math.floor(min / 1440)} d`;
}

// sale states by meaning: done, waiting on the customer, in our hands, lost, released (or no sales)
type Tono = "exito" | "espera" | "proceso" | "perdida" | "neutro";
const TONO: Record<string, Tono> = {
  enviada: "exito",
  reservada: "espera",
  esperando_pago: "espera",
  pagada: "proceso",
  por_empaquetar: "proceso",
  empaquetada: "proceso",
  por_enviar: "proceso",
  no_habla: "perdida",
  no_se_encuentra: "perdida",
};
export const tonoEstado = (k: string | null): Tono => TONO[k ?? ""] ?? "neutro";
export const BARRA: Record<Tono, string> = {
  exito: "bg-success",
  espera: "bg-warning",
  proceso: "bg-info",
  perdida: "bg-danger",
  neutro: "bg-muted",
};
export const CHIP: Record<Tono, string> = {
  exito: "bg-success/15 text-success-fg",
  espera: "bg-warning/20 text-warning-fg",
  proceso: "bg-info/15 text-info-fg",
  perdida: "bg-danger/15 text-danger-fg",
  neutro: "bg-surface-2 text-muted",
};

// "fernando moreno" -> "Fernando Moreno" (names are typed in lowercase during the live)
export const nombrePropio = (s: string) =>
  s
    .toLocaleLowerCase("es-CL")
    .replace(/(^|[\s-])\p{L}/gu, (c) => c.toLocaleUpperCase("es-CL"));
