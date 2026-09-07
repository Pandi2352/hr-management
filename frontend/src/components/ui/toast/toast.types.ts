export type ToastType = "success" | "error" | "warning" | "info" | "loading";

export type ToastPosition =
  | "top-right"
  | "top-center"
  | "top-left"
  | "bottom-right"
  | "bottom-center"
  | "bottom-left";

export interface ToastAction {
  label: string;
  onClick: () => void;
  altText?: string;
}

export interface ToastOptions {
  id?: string;
  type?: ToastType;
  title?: string;
  description?: string;
  duration?: number; // ms, default 4000 (0 for persistent)
  action?: ToastAction;
  onDismiss?: (id: string) => void;
}

export interface ToastItem extends Required<Omit<ToastOptions, "action" | "onDismiss">> {
  action?: ToastAction;
  onDismiss?: (id: string) => void;
  createdAt: number;
}
