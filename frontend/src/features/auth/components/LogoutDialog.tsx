import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, LogOut } from "lucide-react";
import { Button } from "../../../components/ui/Button";

interface LogoutDialogProps {
  isOpen: boolean;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function LogoutDialog({
  isOpen,
  isLoading,
  onConfirm,
  onCancel,
}: LogoutDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap & Escape key dismissal
  useEffect(() => {
    if (!isOpen) return;

    // Prevent body scrolling while modal is open
    document.body.style.overflow = "hidden";

    const focusTimer = setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-dialog-title"
      aria-describedby="logout-dialog-desc"
      className="fixed inset-0 z-9999 flex items-center justify-center p-4"
    >
      {/* Semi-transparent Dimmed Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={isLoading ? undefined : onCancel}
      />

      {/* Centered Professional Modal Card */}
      <div
        ref={dialogRef}
        className="relative z-10 w-full max-w-sm rounded-md border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 transition-all animate-in zoom-in-95 duration-200"
      >
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3
              id="logout-dialog-title"
              className="text-base font-bold text-slate-900 dark:text-slate-100"
            >
              Sign out of PeopleOS?
            </h3>
            <p
              id="logout-dialog-desc"
              className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed"
            >
              Are you sure you want to sign out? Your current active session will be ended and you will need to log in again.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-2.5">
          <Button
            ref={cancelButtonRef}
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isLoading}
            className="cursor-pointer"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
            disabled={isLoading}
            className="flex items-center gap-1.5 cursor-pointer bg-rose-600 hover:bg-rose-700 text-white"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>{isLoading ? "Signing out..." : "Sign out"}</span>
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
