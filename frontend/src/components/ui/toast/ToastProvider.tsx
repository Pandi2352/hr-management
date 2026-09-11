import { createContext, useContext, useState, useCallback, useMemo, useRef, type ReactNode, type MutableRefObject } from "react";
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
  /** Rewrites a toast in place, or shows it if it is not on screen. */
  update: (id: string, options: ToastOptions) => string;
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
        /*
         * An explicit id names one toast rather than requesting another.
         *
         * Without this, a progress notification that rewrites itself every few
         * seconds would stack up a new toast per update and push everything
         * else off the screen.
         */
        const existing = prev.findIndex((t) => t.id === id);
        if (existing !== -1) {
          const next = [...prev];
          next[existing] = {
            ...next[existing],
            type: options.type ?? next[existing].type,
            title: options.title ?? next[existing].title,
            description: options.description ?? next[existing].description,
            duration: options.duration !== undefined ? options.duration : next[existing].duration,
            action: options.action ?? next[existing].action,
            onDismiss: options.onDismiss ?? next[existing].onDismiss,
          };
          return next;
        }

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

  const update = useCallback(
    (id: string, options: ToastOptions) => toast({ ...options, id }),
    [toast],
  );

  /*
   * Memoised because this object is a dependency of callers' hooks.
   *
   * A fresh literal on every render gave every `useCallback(..., [toast])` a new
   * identity each time a toast appeared or vanished, which re-fired the effects
   * depending on it — page data refetching because an unrelated notification
   * had just been shown. The individual handlers below are already stable.
   */
  const value = useMemo(
    () => ({
      toasts,
      position,
      setPosition,
      toast,
      success,
      error,
      warning,
      info,
      loading,
      update,
      dismiss,
      dismissAll,
    }),
    [toasts, position, toast, success, error, warning, info, loading, update, dismiss, dismissAll],
  );

  return (
    <ToastContext.Provider value={value}>
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

/**
 * The toast API behind a ref whose identity never changes.
 *
 * For use inside `useCallback` and `useEffect`. Depending on `useToast()`
 * directly makes a fetch callback change identity every time a notification
 * appears or expires, which re-runs the effect and refetches the page — data
 * reloading because an unrelated toast happened to pop. Reach through the ref
 * instead and leave it out of the dependency array.
 */
export function useToastRef(): MutableRefObject<ToastContextValue> {
  const toast = useToast();
  const ref = useRef(toast);
  ref.current = toast;
  return ref;
}
