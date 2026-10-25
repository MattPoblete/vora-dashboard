import type { CSSProperties, MouseEventHandler, ReactNode } from "react";

// types for the React Bits GlassIcons (GlassIcons.jsx); every prop is optional
export interface GlassIconsItem {
  icon: ReactNode;
  label?: string;
  color?: string;
  href?: string;
  target?: string;
  onClick?: MouseEventHandler;
  id?: string | number;
  className?: string;
}

export interface GlassIconsProps {
  items?: GlassIconsItem[];
  size?: number;
  gap?: number;
  columns?: number;
  roundness?: number;
  refraction?: number;
  bevel?: number;
  dispersion?: number;
  frost?: number;
  shine?: number;
  tint?: string;
  tintOpacity?: number;
  iconColor?: string;
  plate?: "tilt" | "offset" | "circle" | "none";
  tilt?: number;
  spread?: number;
  hover?: "lift" | "float" | "press" | "none";
  parallax?: number;
  labels?: "hover" | "always" | "none";
  intro?: boolean;
  theme?: "dark" | "light";
  className?: string;
  style?: CSSProperties;
}

export default function GlassIcons(props: GlassIconsProps): React.JSX.Element;
