import { cn } from "../../../utils/cn";
import { Toast } from "./Toast";
import type { ToastItem, ToastPosition } from "./toast.types";

interface ToastContainerProps {
  toasts: ToastItem[];
  position?: ToastPosition;
  onDismiss: (id: string) => void;
}

export function ToastContainer({
  toasts,
  position = "top-right",
  onDismiss,
}: ToastContainerProps) {
  if (toasts.length === 0) return null;

  const positionClasses: Record<ToastPosition, string> = {
    "top-right": "top-5 right-5 items-end",
    "top-center": "top-5 left-1/2 -translate-x-1/2 items-center",
    "top-left": "top-5 left-5 items-start",
    "bottom-right": "bottom-5 right-5 items-end",
    "bottom-center": "bottom-5 left-1/2 -translate-x-1/2 items-center",
    "bottom-left": "bottom-5 left-5 items-start",
  };

  return (
    <aside
      aria-label="Notifications"
      className={cn(
        "fixed z-50 flex flex-col gap-2.5 pointer-events-none max-w-sm w-full",
        positionClasses[position],
      )}
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </aside>
  );
}
