// Copy text. `navigator.clipboard` only exists in secure contexts (https or localhost), so over plain http on the
// local network (testing from a phone) it is undefined: fall back to the legacy select + execCommand route.
export async function copiarTexto(texto: string): Promise<boolean> {
  try {
    if (window.isSecureContext && navigator.clipboard) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    // permission denied: try the fallback
  }
  const previo = document.activeElement as HTMLElement | null;
  const t = document.createElement("textarea");
  t.value = texto;
  t.setAttribute("readonly", "");
  t.style.cssText = "position:fixed;top:0;left:0;opacity:0";
  document.body.appendChild(t);
  t.select();
  t.setSelectionRange(0, texto.length); // iOS Safari ignores select() alone
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  t.remove();
  previo?.focus?.();
  return ok;
}
