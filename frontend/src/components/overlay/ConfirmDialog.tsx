import { Button } from '../ui/Button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  message?: string;
  confirmLabel?: string;
  confirmText?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  confirmVariant?: 'danger' | 'primary';
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
  onClose?: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  message,
  confirmLabel,
  confirmText,
  cancelLabel = 'Cancel',
  variant,
  confirmVariant,
  isLoading = false,
  onConfirm,
  onCancel,
  onClose,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const handleClose = onCancel || onClose || (() => {});
  const effectiveConfirmText = confirmText || confirmLabel || 'Confirm';
  const effectiveVariant = confirmVariant || variant || 'danger';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={handleClose}
      />

      {/*
        * Fixed width, bounded height.
        *
        * The title is caller-supplied and can be anything — a quiz whose title
        * is an entire generation prompt turned this dialog into a wall of text
        * with its buttons somewhere below the fold. The shell no longer grows
        * with its content: long text scrolls inside, and the actions stay where
        * they were.
        */}
      <div className="relative z-10 flex max-h-[70vh] w-[440px] max-w-[92vw] flex-col rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95">
        <div className="flex min-h-0 flex-1 items-start gap-4 overflow-y-auto p-6">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
              effectiveVariant === 'danger'
                ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                : 'bg-indigo-50 text-[#524b6e] dark:bg-indigo-950/40 dark:text-indigo-400'
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            {/* Clamped rather than truncated to one line: enough of a long
                title to recognise what is about to happen, never enough to
                bury the question. */}
            <h3 className="line-clamp-3 text-base font-semibold break-words text-slate-900 dark:text-slate-100">
              {title}
            </h3>
            <p className="mt-1 text-sm leading-relaxed break-words text-slate-600 dark:text-slate-400">
              {description || message}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 p-4 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={effectiveVariant === 'danger' ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {effectiveConfirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
