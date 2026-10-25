"use client";

import MagicBento, { type MagicBentoItem } from "./MagicBento";

// MagicBento ships fixed dark/light palettes; these overrides (the `style` prop wins over its own) point every
// color at the app tokens, so the cards follow docs/styles.md in both themes.
const TEMA = {
  "--mb-surface": "var(--surface)",
  "--mb-edge": "var(--border)",
  "--mb-highlight": "transparent",
  "--mb-shadow":
    "0 14px 30px -22px color-mix(in srgb, var(--text) 45%, transparent)",
  "--mb-tile": "var(--surface-2)",
  "--mb-tile-edge": "var(--border)",
  "--mb-tile-highlight": "transparent",
  "--mb-tile-shadow": "none",
  "--mb-well": "var(--surface-2)",
  "--mb-well-edge": "var(--border)",
  "--mb-ink": "var(--text)",
  "--mb-muted": "var(--text-muted)",
  "--mb-faint": "var(--text-muted)",
  "--mb-line": "var(--border)",
  "--mb-secondary": "var(--text-muted)",
  "--mb-secondary-ink": "var(--surface)",
  "--mb-ring": "var(--surface)",
  "--mb-focus": "var(--primary)",
  "--mb-glow-rgb": "var(--primary-rgb)",
  "--mb-accent-rgb": "var(--primary-rgb)",
  "--mb-accent-ink": "var(--on-primary)",
  "--mb-glow-alpha": 0.6,
  "--mb-spot-alpha": 0.06,
} as React.CSSProperties;

export function Bento({ items }: { items: MagicBentoItem[] }) {
  return (
    <MagicBento
      items={items}
      columns={4}
      rowHeight={150}
      gap={16}
      radius={24}
      style={TEMA}
    />
  );
}
