import { useState, useEffect, useRef } from "react";
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "../../../utils/cn";
import type { ToastItem } from "./toast.types";

interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(100);
  const remainingTimeRef = useRef(toast.duration);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    if (toast.duration <= 0 || toast.type === "loading") return;

    if (isHovered) {
      remainingTimeRef.current -= Date.now() - startTimeRef.current;
      return;
    }

    startTimeRef.current = Date.now();
    const interval = 20;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const timeLeft = remainingTimeRef.current - elapsed;
      const newProgress = Math.max(0, (timeLeft / toast.duration) * 100);

      setProgress(newProgress);

      if (timeLeft <= 0) {
        clearInterval(timer);
        onDismiss(toast.id);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [isHovered, toast.duration, toast.id, toast.type, onDismiss]);

  const typeConfig = {
    success: {
      icon: CheckCircle2,
      iconColor: "text-emerald-600 dark:text-emerald-400",
      borderColor: "border-emerald-200 dark:border-emerald-800/60",
      bgColor: "bg-white dark:bg-slate-900",
      accentBg: "bg-emerald-500",
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    error: {
      icon: AlertCircle,
      iconColor: "text-rose-600 dark:text-rose-400",
      borderColor: "border-rose-200 dark:border-rose-800/60",
      bgColor: "bg-white dark:bg-slate-900",
      accentBg: "bg-rose-500",
      badge: "bg-rose-50 text-rose-700 border-rose-200",
    },
    warning: {
      icon: AlertTriangle,
      iconColor: "text-amber-600 dark:text-amber-400",
      borderColor: "border-amber-200 dark:border-amber-800/60",
      bgColor: "bg-white dark:bg-slate-900",
      accentBg: "bg-amber-500",
      badge: "bg-amber-50 text-amber-700 border-amber-200",
    },
    info: {
      icon: Info,
      iconColor: "text-indigo-600 dark:text-indigo-400",
      borderColor: "border-indigo-200 dark:border-indigo-800/60",
      bgColor: "bg-white dark:bg-slate-900",
      accentBg: "bg-indigo-500",
      badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
    },
    loading: {
      icon: Loader2,
      iconColor: "text-indigo-600 dark:text-indigo-400 animate-spin",
      borderColor: "border-indigo-200 dark:border-indigo-800/60",
      bgColor: "bg-white dark:bg-slate-900",
      accentBg: "bg-indigo-500",
      badge: "bg-indigo-50 text-indigo-700 border-indigo-200",
    },
  }[toast.type];

  const IconComponent = typeConfig.icon;

  return (
    <div
      role="status"
      aria-live={toast.type === "error" ? "assertive" : "polite"}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "group relative flex w-full max-w-sm overflow-hidden rounded-md border p-3.5 transition-all",
        "pointer-events-auto select-none",
        typeConfig.borderColor,
        typeConfig.bgColor,
      )}
    >
      {/* Visual Accent Indicator */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", typeConfig.accentBg)} />

      <div className="flex w-full items-start gap-3 pl-1">
        {/* Semantic Icon */}
        <div className="shrink-0 mt-0.5">
          <IconComponent className={cn("h-4 w-4", typeConfig.iconColor)} />
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-0.5 pr-2">
          {toast.title && (
            <h5 className="text-xs font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {toast.title}
            </h5>
          )}
          {toast.description && (
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {toast.description}
            </p>
          )}

          {/* Optional Action Button */}
          {toast.action && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  toast.action?.onClick();
                  onDismiss(toast.id);
                }}
                className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {toast.action.label}
              </button>
            </div>
          )}
        </div>

        {/* Manual Dismiss Button */}
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label="Dismiss notification"
          className="rounded p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Auto-Dismiss Progress Bar (pauses on hover) */}
      {toast.duration > 0 && toast.type !== "loading" && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-100 dark:bg-slate-800">
          <div
            className={cn("h-full transition-all ease-linear", typeConfig.accentBg)}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
