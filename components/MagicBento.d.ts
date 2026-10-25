import type { CSSProperties, ReactNode } from "react";

// types for the React Bits MagicBento (MagicBento.jsx)
export interface MagicBentoItem {
  id?: string | number;
  label?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  image?: string;
  visual?: ReactNode;
  content?: ReactNode; // replaces the whole inside of the card
  href?: string;
  target?: string;
  rel?: string;
  onClick?: (event: React.MouseEvent) => void;
  colSpan?: number;
  rowSpan?: number;
}

export interface MagicBentoProps {
  items?: MagicBentoItem[];
  columns?: number;
  rowHeight?: number;
  gap?: number;
  radius?: number;
  theme?: "dark" | "light";
  glowColor?: string;
  textAutoHide?: boolean;
  enableBorderGlow?: boolean;
  enableSpotlight?: boolean;
  spotlightRadius?: number;
  enableStars?: boolean;
  particleCount?: number;
  enableTilt?: boolean;
  enableMagnetism?: boolean;
  clickEffect?: boolean;
  intro?: boolean;
  disableAnimations?: boolean;
  onItemClick?: (item: MagicBentoItem, index: number) => void;
  className?: string;
  style?: CSSProperties;
}
export default function MagicBento(props: MagicBentoProps): React.JSX.Element;
