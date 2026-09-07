import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { generateUuid } from "../../../utils/uuid";
import { ToastContainer } from "./ToastContainer";
import type { ToastItem, ToastOptions, ToastPosition } from "./toast.types";

interface ToastContextValue {
  toasts: ToastItem[];
  position: ToastPosition;
  setPosition: (pos: ToastPosition) => void;
  toast: (options: ToastOptions) => string;
  success: (message: string, title?: string, duration?: number) => string;
  error: (message: string, title?: string, duration?: number) => string;
  warning: (message: string, title?: string, duration?: number) => string;
  info: (message: string, title?: string, duration?: number) => string;
  loading: (message: string, title?: string) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const MAX_VISIBLE_TOASTS = 5;

export function ToastProvider({
  children,
  defaultPosition = "top-right",
}: {
  children: ReactNode;
  defaultPosition?: ToastPosition;
}) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [position, setPosition] = useState<ToastPosition>(defaultPosition);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => {
      const target = prev.find((t) => t.id === id);
      if (target?.onDismiss) {
        target.onDismiss(id);
      }
      return prev.filter((t) => t.id !== id);
    });
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const toast = useCallback(
    (options: ToastOptions): string => {
      const id = options.id || generateUuid();

      setToasts((prev) => {
        // Prevent duplicate messages
        const isDuplicate = prev.some(
          (t) =>
            t.description === options.description &&
            t.type === options.type &&
            Date.now() - t.createdAt < 2000,
        );
        if (isDuplicate) return prev;

        const newToast: ToastItem = {
          id,
          type: options.type || "info",
          title: options.title || "",
          description: options.description || "",
          duration: options.duration !== undefined ? options.duration : 4000,
          action: options.action,
          onDismiss: options.onDismiss,
          createdAt: Date.now(),
        };

        const updated = [newToast, ...prev];
        return updated.slice(0, MAX_VISIBLE_TOASTS);
      });

      return id;
    },
    [],
  );

  const success = useCallback(
    (message: string, title?: string, duration?: number) => {
      return toast({ type: "success", description: message, title, duration });
    },
    [toast],
  );

  const error = useCallback(
    (message: string, title?: string, duration?: number) => {
      return toast({ type: "error", description: message, title, duration });
    },
    [toast],
  );

  const warning = useCallback(
    (message: string, title?: string, duration?: number) => {
      return toast({ type: "warning", description: message, title, duration });
    },
    [toast],
  );

  const info = useCallback(
    (message: string, title?: string, duration?: number) => {
      return toast({ type: "info", description: message, title, duration });
    },
    [toast],
  );

  const loading = useCallback(
    (message: string, title?: string) => {
      return toast({ type: "loading", description: message, title, duration: 0 });
    },
    [toast],
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        position,
        setPosition,
        toast,
        success,
        error,
        warning,
        info,
        loading,
        dismiss,
        dismissAll,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} position={position} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
