import { useEffect, useState } from 'react';
import { Button, Input, Modal, SelectField } from '../../../components/ui';
import { useToast } from '../../../components/ui/toast';
import { leaveApi } from '../api/leave.api';
import type { LeaveBalance, LeaveType } from '../types/leave-balance.types';

export interface AssignTarget {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  balance?: LeaveBalance | null;
}

export function AssignBalanceModal({
  isOpen,
  target,
  leaveTypes,
  year,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  target: AssignTarget | null;
  leaveTypes: LeaveType[];
  year: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [allocated, setAllocated] = useState('12');
  const [carriedForward, setCarriedForward] = useState('0');
  const [used, setUsed] = useState('0');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const activeTypes = leaveTypes.filter((t) => t.status === 'ACTIVE');
    if (target?.balance) {
      const b = target.balance;
      setLeaveTypeId(b.leaveTypeId);
      setAllocated(String(b.allocated));
      setCarriedForward(String(b.carriedForward));
      setUsed(String(b.used));
      setNote(b.note || '');
    } else {
      setLeaveTypeId(activeTypes[0]?._id || '');
      const first = activeTypes[0];
      setAllocated(String(first?.defaultAllocation ?? 12));
      setCarriedForward('0');
      setUsed('0');
      setNote('');
    }
  }, [isOpen, target, leaveTypes]);

  useEffect(() => {
    if (target?.balance) return;
    const selected = leaveTypes.find((t) => t._id === leaveTypeId);
    if (selected) setAllocated(String(selected.defaultAllocation ?? 0));
  }, [leaveTypeId, leaveTypes, target]);

  if (!target) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const alloc = Number(allocated);
    const carry = Number(carriedForward);
    const usedDays = Number(used);
    if (!leaveTypeId) {
      toast.error('Select a leave type.');
      return;
    }
    if ([alloc, carry, usedDays].some((n) => Number.isNaN(n) || n < 0)) {
      toast.error('Allocated, carried and used days must be zero or more.');
      return;
    }
    setIsSaving(true);
    try {
      await leaveApi.assignBalance({
        employeeId: target.employeeId,
        leaveTypeId,
        year,
        allocated: alloc,
        carriedForward: carry,
        used: usedDays,
        note: note.trim() || undefined,
      });
      toast.success(`Leave balance saved for ${target.employeeName}.`);
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not save balance.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign Leave — ${target.employeeName} (${target.employeeCode})`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <SelectField
          label="Leave Type"
          value={leaveTypeId}
          onChange={(e) => setLeaveTypeId(e.target.value)}
          options={leaveTypes
            .filter((t) => t.status === 'ACTIVE')
            .map((t) => ({ value: t._id, label: `${t.name} (${t.code})` }))}
        />
        <div className="grid grid-cols-3 gap-3">
          <Input
            label="Allocated"
            type="number"
            value={allocated}
            onChange={(e) => setAllocated(e.target.value)}
            required
          />
          <Input
            label="Carried Fwd"
            type="number"
            value={carriedForward}
            onChange={(e) => setCarriedForward(e.target.value)}
            required
          />
          <Input
            label="Used"
            type="number"
            value={used}
            onChange={(e) => setUsed(e.target.value)}
            required
          />
        </div>
        <Input
          label="Note (Optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Pro-rated mid-year joiner"
        />
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save Balance'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
