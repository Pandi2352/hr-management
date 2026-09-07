import type { ReactNode } from "react";

export type TooltipPlacement =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-start"
  | "top-end"
  | "bottom-start"
  | "bottom-end";

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  placement?: TooltipPlacement;
  delay?: number; // ms delay before showing, default 200
  disabled?: boolean;
  className?: string;
  arrow?: boolean;
}
