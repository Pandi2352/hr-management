import { useState } from 'react';
import { Button, Input, Modal } from '../../../components/ui';
import { useToast } from '../../../components/ui/toast';
import { attendanceApi } from '../api/attendance.api';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Employee raises a missed/wrong punch correction for manager approval. */
export function RaiseRegularizationModal({
  isOpen,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [date, setDate] = useState(todayStr());
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkIn) {
      toast.error('Punch-in time is required.');
      return;
    }
    if (!reason.trim()) {
      toast.error('Tell your manager what went wrong.');
      return;
    }
    setIsSaving(true);
    try {
      await attendanceApi.raiseRegularization({
        date,
        requestedCheckIn: checkIn,
        requestedCheckOut: checkOut || undefined,
        reason: reason.trim(),
      });
      toast.success('Request sent to your manager.');
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not raise request.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Raise Attendance Request">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Date" required type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Correct Punch-In (24h)" required type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
          <Input label="Correct Punch-Out (24h)" type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} helperText="Leave empty if still open" />
        </div>
        <Input label="Reason" required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Forgot to punch — biometric queue" />
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Sending…' : 'Send to Manager'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
