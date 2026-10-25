import type { CSSProperties, ReactNode } from "react";

// types for the React Bits AnimatedList (AnimatedList.jsx)
export interface AnimatedListItem {
  id?: string | number;
  icon?: ReactNode;
  image?: string;
  title?: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
}
export interface AnimatedListProps<T = AnimatedListItem> {
  items?: T[];
  onItemSelect?: (item: T, index: number) => void;
  renderItem?: (item: T, index: number, selected: boolean) => ReactNode;
  initialSelectedIndex?: number;
  selectOnHover?: boolean;
  enableArrowNavigation?: boolean;
  loop?: boolean;
  animation?: "pop" | "slide" | "fade" | "none";
  animateOnce?: boolean;
  stagger?: number;
  showGradients?: boolean;
  fadeSize?: number;
  displayScrollbar?: boolean;
  frame?: boolean;
  theme?: "dark" | "light";
  accentColor?: string;
  radius?: number;
  gap?: number;
  width?: number | string;
  maxHeight?: number | string;
  className?: string;
  itemClassName?: string;
  style?: CSSProperties;
}
export default function AnimatedList<T = AnimatedListItem>(
  props: AnimatedListProps<T>,
): React.JSX.Element;
