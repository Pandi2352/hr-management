import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "../../utils/cn";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      {/*
        * Fixed width, bounded height, and the header stays put.
        *
        * A dialog that grows with its content pushes its own close button off
        * the bottom of the screen as soon as the content is long, which is not
        * something the caller can be expected to guard against. Content
        * scrolls inside the shell instead.
        */}
      <div
        className={cn(
          "relative z-10 flex max-h-[85vh] w-[560px] max-w-[94vw] flex-col rounded-md border border-slate-200 bg-white transition-all dark:border-slate-800 dark:bg-slate-900",
          className
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
          {title && (
            <h3 className="truncate text-base font-semibold text-slate-900 dark:text-white">
              {title}
            </h3>
          )}
          <button
            onClick={onClose}
            aria-label="Close"
            className="ml-auto shrink-0 cursor-pointer rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
