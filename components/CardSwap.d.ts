import type {
  ForwardRefExoticComponent,
  HTMLAttributes,
  ReactNode,
  RefAttributes,
} from "react";

// types for the React Bits CardSwap (CardSwap.jsx)
export interface CardSwapItem {
  title?: string;
  image?: string;
  icon?: ReactNode;
  alt?: string;
}

export interface CardSwapHandle {
  next(): void;
  prev(): void;
}

export interface CardSwapProps {
  items?: CardSwapItem[];
  children?: ReactNode;
  width?: number;
  height?: number;
  cardDistance?: number;
  verticalDistance?: number;
  depth?: number;
  skewAmount?: number;
  visibleCards?: number;
  delay?: number;
  autoplay?: boolean;
  pauseOnHover?: boolean;
  draggable?: boolean;
  speed?: number;
  bounce?: number;
  parallax?: number;
  hoverSpread?: number;
  dim?: number;
  cardRadius?: number;
  intro?: boolean;
  theme?: "dark" | "light";
  onCardClick?: (index: number) => void;
  onChange?: (index: number) => void;
  className?: string;
}

declare const CardSwap: ForwardRefExoticComponent<
  CardSwapProps & RefAttributes<CardSwapHandle>
>;
export default CardSwap;

export const Card: ForwardRefExoticComponent<
  {
    customClass?: string;
    className?: string;
    children?: ReactNode;
  } & HTMLAttributes<HTMLDivElement> &
    RefAttributes<HTMLDivElement>
>;
