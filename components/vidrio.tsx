"use client";

import GlassSurface from "./GlassSurface";
import { useEscritorio } from "./tema";

// Glass layer to sit BEHIND a box's content (React Bits GlassSurface, SVG renderer, "frost" values from reactbits.dev:
// displace 3, background opacity 0.28; the refraction strength is the one the dock uses). The parent must be
// `relative isolate` so the -1 layer stays inside it. Browsers without SVG backdrop filters (Safari, Firefox) get the
// component's own frosted fallback automatically, and so do phones (see useEscritorio).
export function Vidrio({ radius = 24 }: { radius?: number }) {
  const refraccion = useEscritorio();
  return (
    <GlassSurface
      width="100%"
      height="100%"
      borderRadius={radius}
      renderer="svg"
      refraction={refraccion}
      distortionScale={-70}
      displace={3}
      backgroundOpacity={0.28}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: -1,
        pointerEvents: "none",
      }}
    />
  );
}
