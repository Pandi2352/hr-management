import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button, SelectField, Input } from '../../../components/ui';

interface StatusTransitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  currentStatus: string;
  onConfirm: (status: string, reason?: string, effectiveDate?: string) => Promise<void>;
}

export const StatusTransitionModal: React.FC<StatusTransitionModalProps> = ({
  isOpen,
  onClose,
  employeeName,
  currentStatus,
  onConfirm,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>(currentStatus);
  const [reason, setReason] = useState<string>('');
  const [effectiveDate, setEffectiveDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onConfirm(selectedStatus, reason, effectiveDate);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusOptions = [
    { value: 'ACTIVE', label: 'Active — Regular Full Duty' },
    { value: 'PROBATION', label: 'Probation — Evaluation Period' },
    { value: 'ON_LEAVE', label: 'On Leave — Approved Absence' },
    { value: 'SUSPENDED', label: 'Suspended — Access Temporarily Revoked' },
    { value: 'RESIGNED', label: 'Resigned — Voluntary Departure' },
    { value: 'TERMINATED', label: 'Terminated — Involuntary Departure' },
    { value: 'INACTIVE', label: 'Inactive — Account Disabled' },
  ];

  const isDeparture = selectedStatus === 'RESIGNED' || selectedStatus === 'TERMINATED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-[#524b6e] dark:bg-indigo-950/60 dark:text-indigo-400">
            <RefreshCw className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Change Employee Status
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Update employment lifecycle for {employeeName}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="text-[11px] font-medium tracking-wide uppercase text-slate-500">
              New Lifecycle Status
            </label>
            <div className="mt-1">
              <SelectField
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                options={statusOptions}
              />
            </div>
          </div>

          {isDeparture && (
            <div>
              <label className="text-[11px] font-medium tracking-wide uppercase text-slate-500">
                Effective / Last Working Date
              </label>
              <Input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="mt-1"
                required
              />
            </div>
          )}

          <div>
            <label className="text-[11px] font-medium tracking-wide uppercase text-slate-500">
              Reason / Administrative Notes
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Completed 90-day probationary period successfully or voluntary resignation..."
              className="mt-1 w-full rounded-md border border-slate-300 bg-white p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#524b6e] focus:outline-none focus:ring-1 focus:ring-[#524b6e] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-indigo-500 dark:focus:ring-indigo-500"
            />
          </div>

          {selectedStatus === 'SUSPENDED' && (
            <div className="rounded-md bg-amber-50 p-3 border border-amber-200 text-xs text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300">
              <strong>Notice:</strong> Suspending this employee will immediately revoke their ability to log into the self-service employee portal.
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Confirm Status Change'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
