"use client";

import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import GlassIcons from "./GlassIcons";
import { useOscuro } from "./tema";

// The active tab / dock button: its icon on glass over a tilted brand-colored card (React Bits GlassIcons).
// Decorative only: the link or button around it carries the meaning. The colors are literal because the card is
// painted with WebGL, which can't read CSS variables (same values as --primary / --primary-hover in globals.css).
export function IconoActivo({
  icon,
  size,
  intro = true,
}: {
  icon: IconSvgElement;
  size: number;
  intro?: boolean; // false: no entrance animation (the dock lens slides in instead)
}) {
  const oscuro = useOscuro();
  return (
    <GlassIcons
      items={[
        {
          icon: <HugeiconsIcon icon={icon} strokeWidth={1.8} />,
          color: oscuro
            ? "linear-gradient(135deg, #f39363, #ee7a45)"
            : "linear-gradient(135deg, #c2471f, #a63a18)",
        },
      ]}
      size={size}
      gap={0}
      tilt={0}
      plate="offset"
      parallax={10}
      columns={1}
      labels="none"
      intro={intro}
      iconColor="#ffffff"
      theme={oscuro ? "dark" : "light"}
      className={size < 40 ? "glass-icons--chico" : ""}
      style={{ margin: 0 }}
    />
  );
}
