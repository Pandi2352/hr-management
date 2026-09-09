import { useEffect, useMemo, useState } from 'react';
import { Button, Input, Modal, SelectField } from '../../../components/ui';
import { useToast } from '../../../components/ui/toast';
import { leaveApi } from '../api/leave.api';
import type { LeaveType } from '../types/leave-balance.types';
import type { MyLeaveSummary } from '../types/leave-balance.types';

function daysBetween(start: string, end: string): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;
}

/** Employee applies for leave: type select with live balance, dates, reason. */
export function ApplyLeaveModal({
  isOpen,
  summary,
  onClose,
  onApplied,
}: {
  isOpen: boolean;
  summary: MyLeaveSummary | null;
  onClose: () => void;
  onApplied: () => void;
}) {
  const toast = useToast();
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [types, setTypes] = useState<LeaveType[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setLeaveTypeId('');
    setStartDate('');
    setEndDate('');
    setIsHalfDay(false);
    setReason('');
    leaveApi.getLeaveTypes('ACTIVE').then(setTypes).catch(() => setTypes([]));
  }, [isOpen]);

  const balanceByType = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of summary?.balances || []) {
      map.set(b.leaveTypeId, b.available);
    }
    return map;
  }, [summary]);

  const totalDays = useMemo(() => {
    if (!startDate || !endDate || endDate < startDate) return 0;
    if (isHalfDay) return startDate === endDate ? 0.5 : 0;
    return daysBetween(startDate, endDate);
  }, [startDate, endDate, isHalfDay]);

  const selectedBalance = leaveTypeId ? balanceByType.get(leaveTypeId) : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveTypeId) {
      toast.error('Select a leave type.');
      return;
    }
    if (!startDate || !endDate) {
      toast.error('Select start and end dates.');
      return;
    }
    if (totalDays <= 0) {
      toast.error('End date cannot be before start date.');
      return;
    }
    setIsSaving(true);
    try {
      await leaveApi.applyLeave({ leaveTypeId, startDate, endDate, isHalfDay, reason: reason.trim() || undefined });
      toast.success('Leave request sent to your manager for approval.');
      onApplied();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not submit request.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Apply for Leave">
      <form onSubmit={handleSubmit} className="space-y-4">
        <SelectField
          label="Leave Type"
          required
          value={leaveTypeId}
          onChange={(e) => setLeaveTypeId(e.target.value)}
          placeholder="Select leave type…"
          options={types.map((t) => {
            const avail = balanceByType.get(t._id);
            return {
              value: t._id,
              label: avail !== undefined ? `${t.name} (${t.code}) — ${avail} left` : `${t.name} (${t.code})`,
            };
          })}
          helperText={selectedBalance !== undefined ? `${selectedBalance} days available in your wallet` : undefined}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Start Date" required type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); if (isHalfDay) setEndDate(e.target.value); }} />
          <Input
            label="End Date"
            required
            type="date"
            value={endDate}
            min={startDate || undefined}
            disabled={isHalfDay}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={isHalfDay}
            onChange={(e) => {
              setIsHalfDay(e.target.checked);
              if (e.target.checked && startDate) setEndDate(startDate);
            }}
            className="h-4 w-4 rounded border-slate-300 text-teal-700"
          />
          Half day (single day, counts 0.5)
        </label>
        <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Family function in hometown" />
        {totalDays > 0 && (
          <p className="rounded-md bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
            Total: {totalDays} day{totalDays === 1 ? '' : 's'} → goes to your manager first, then HR.
          </p>
        )}
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Submitting…' : 'Submit Request'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
