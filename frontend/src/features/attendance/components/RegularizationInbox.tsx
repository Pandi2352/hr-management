import { useCallback, useEffect, useState } from 'react';
import { Check, Inbox, X } from 'lucide-react';
import { Avatar, Button } from '../../../components/ui';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/toast';
import { attendanceApi } from '../api/attendance.api';
import { REG_STATUS_META, type Regularization } from '../types/shift.types';
import { formatRecordDate } from '../types/attendance.types';

export function RegularizationInbox({ onChanged }: { onChanged: () => void }) {
  const toast = useToast();
  const [requests, setRequests] = useState<Regularization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [workingId, setWorkingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setRequests(await attendanceApi.regularizationInbox());
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not load inbox.');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (r: Regularization, approve: boolean) => {
    setWorkingId(r._id);
    try {
      await attendanceApi.decideRegularization(r._id, approve, notes[r._id]?.trim() || undefined);
      toast.success(approve ? 'Approved and applied to the day.' : 'Request rejected.');
      load();
      onChanged();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not save decision.');
    } finally {
      setWorkingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" variant="violet" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
        <Inbox className="mx-auto mb-2 h-8 w-8 text-slate-300" />
        <p className="text-sm font-semibold">Inbox clear</p>
        <p className="mt-1 text-xs text-slate-400">No attendance corrections waiting on you.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {requests.map((r) => {
        const meta = REG_STATUS_META[r.status];
        return (
          <div key={r._id} className="rounded-md border border-hairline bg-surface p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Avatar src={r.employee?.avatarUrl} name={r.employee?.displayName || '?'} size="sm" />
                <div>
                  <p className="text-[13px] font-bold">
                    {r.employee?.displayName}{' '}
                    <span className="font-mono text-[11px] font-medium text-ink-3">{r.employee?.employeeCode}</span>
                  </p>
                  <p className="text-[11px] text-ink-3">
                    {formatRecordDate(r.date)} · <span className="font-mono">{r.requestedCheckIn}{r.requestedCheckOut ? ` → ${r.requestedCheckOut}` : ''}</span> · {r.reason}
                  </p>
                </div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${meta.classes}`}>{meta.label}</span>
            </div>
            <div className="mt-3 flex flex-col gap-2 border-t border-hairline pt-3 sm:flex-row">
              <input
                value={notes[r._id] || ''}
                onChange={(e) => setNotes((n) => ({ ...n, [r._id]: e.target.value }))}
                placeholder="Note (optional)…"
                className="flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
              />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => decide(r, false)} disabled={workingId === r._id} className="flex items-center gap-1 text-rose-600">
                  <X className="h-3.5 w-3.5" /> Reject
                </Button>
                <Button size="sm" onClick={() => decide(r, true)} disabled={workingId === r._id} className="flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> Approve & Apply
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
