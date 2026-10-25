import type { CSSProperties } from "react";

// types for the React Bits Scanner (Scanner.jsx); every prop is optional, defaults live in the component
export interface ScannerProps {
  color1?: string;
  color2?: string;
  color3?: string;
  speed?: number;
  sweepSpeed?: number;
  sweepWidth?: number;
  trail?: number;
  ripple?: number;
  bandDensity?: number;
  glow?: number;
  scanDirection?: "vertical" | "horizontal" | "diagonal";
  colorSpread?: number;
  scanline?: boolean;
  scanlineIntensity?: number;
  mouseInteraction?: boolean;
  clickEffect?: string;
  scale?: number;
  frequency?: number;
  lineWidth?: number;
  brightness?: number;
  grainIntensity?: number;
  mouseStrength?: number;
  intro?: boolean;
  dpr?: number;
  style?: CSSProperties;
  className?: string;
  [prop: string]: unknown;
}

export default function Scanner(props: ScannerProps): React.JSX.Element;
