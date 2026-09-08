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

      {/* Modal Dialog (Strict Zero Shadow, rounded-md) */}
      <div className="relative z-10 w-full max-w-md rounded-md bg-white p-6 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 animate-in zoom-in-95">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
              effectiveVariant === 'danger'
                ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                : 'bg-indigo-50 text-[#524b6e] dark:bg-indigo-950/40 dark:text-indigo-400'
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              {description || message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
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
