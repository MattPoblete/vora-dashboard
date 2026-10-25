"use client";

import Scanner from "./Scanner";
import { useOscuro } from "./tema";

// Animated background: login only. docs/styles.md keeps it out of tables and forms (it distracts and is less sober).
export function Fondo() {
  const oscuro = useOscuro();
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0">
      <Scanner
        // palette tones; on a light page the lines are drawn as ink instead of light
        color1="#c2471f"
        color2="#f2b266"
        color3={oscuro ? "#FFFFFF" : "#2e2a44"}
        lightMode={!oscuro}
        speed={0.1}
        sweepSpeed={0.05}
        sweepWidth={4}
        trail={0.5}
        ripple={0.6}
        bandDensity={11.5}
        glow={0.6}
        scanDirection="vertical"
        colorSpread={0.9}
        scanline
        scanlineIntensity={0.3}
        mouseInteraction={false}
        clickEffect="none"
        scale={2.15}
        frequency={4}
        lineWidth={4}
        brightness={1.3}
        grainIntensity={0.07}
        mouseStrength={0}
        intro={false}
      />
    </div>
  );
}
