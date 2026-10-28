"use client";

import { useSyncExternalStore } from "react";

const MQ = "(prefers-color-scheme: dark)";

function suscribir(cb: () => void) {
  const m = window.matchMedia(MQ);
  m.addEventListener("change", cb);
  // <html data-theme="dark|light"> overrides the system preference (see globals.css)
  const o = new MutationObserver(cb);
  o.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => {
    m.removeEventListener("change", cb);
    o.disconnect();
  };
}

function oscuro() {
  const forzado = document.documentElement.dataset.theme;
  return forzado ? forzado === "dark" : window.matchMedia(MQ).matches;
}

// flips light/dark and remembers it; the inline script in app/layout.tsx puts it back before the first paint
export function alternarTema() {
  const siguiente = oscuro() ? "light" : "dark";
  document.documentElement.dataset.theme = siguiente;
  try {
    localStorage.setItem("tema", siguiente);
  } catch {} // private window: it just won't persist
}

// for the few vendored components that need to know the theme in JS (the rest follows the CSS tokens)
export const useOscuro = () =>
  useSyncExternalStore(suscribir, oscuro, () => true);

// SVG refraction bends whatever is behind the glass: great on a big screen, noisy and costly on a phone
const GRANDE = "(min-width: 640px)";
const suscribirTamano = (cb: () => void) => {
  const m = window.matchMedia(GRANDE);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
export const useEscritorio = () =>
  useSyncExternalStore(
    suscribirTamano,
    () => window.matchMedia(GRANDE).matches,
    () => true,
  );
