import { useCallback, useEffect, useState } from 'react';
import { CalendarX2, Plus } from 'lucide-react';
import { Avatar, Button, SelectField } from '../../../components/ui';
import { ConfirmDialog } from '../../../components/overlay/ConfirmDialog';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/toast';
import { attendanceApi } from '../api/attendance.api';
import { RaiseRegularizationModal } from './RaiseRegularizationModal';
import { REG_STATUS_META, type Regularization } from '../types/shift.types';
import { formatRecordDate } from '../types/attendance.types';

export function MyRegularizations() {
  const toast = useToast();
  const [requests, setRequests] = useState<Regularization[]>([]);
  const [status, setStatus] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [raiseOpen, setRaiseOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Regularization | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setRequests(await attendanceApi.myRegularizations(status));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not load requests.');
    } finally {
      setIsLoading(false);
    }
  }, [status, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setIsCancelling(true);
    try {
      await attendanceApi.cancelRegularization(cancelTarget._id);
      toast.success('Request cancelled.');
      setCancelTarget(null);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not cancel.');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="w-44">
          <SelectField
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: 'ALL', label: 'All statuses' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'APPROVED', label: 'Approved' },
              { value: 'REJECTED', label: 'Rejected' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
          />
        </div>
        <Button size="sm" onClick={() => setRaiseOpen(true)} className="flex items-center gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Raise Request
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" variant="violet" />
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <CalendarX2 className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm font-semibold">No attendance requests</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-400">
            Missed a punch? Raise a correction — your manager approves and the day is fixed.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {requests.map((r) => {
            const meta = REG_STATUS_META[r.status];
            return (
              <div key={r._id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-hairline bg-surface p-3.5">
                <div className="flex items-center gap-2.5">
                  <Avatar src={r.employee?.avatarUrl} name={r.employee?.displayName || '?'} size="sm" />
                  <div>
                    <p className="text-[13px] font-bold">
                      {formatRecordDate(r.date)} · <span className="font-mono">{r.requestedCheckIn}{r.requestedCheckOut ? ` → ${r.requestedCheckOut}` : ''}</span>
                    </p>
                    <p className="text-[11px] text-ink-3">{r.reason}</p>
                    {r.decisionNote && <p className="text-[11px] italic text-ink-2">“{r.decisionNote}”</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${meta.classes}`}>{meta.label}</span>
                  {r.status === 'PENDING' && (
                    <button
                      type="button"
                      onClick={() => setCancelTarget(r)}
                      className="cursor-pointer rounded-md border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950/40"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <RaiseRegularizationModal isOpen={raiseOpen} onClose={() => setRaiseOpen(false)} onSaved={load} />

      <ConfirmDialog
        isOpen={!!cancelTarget}
        title="Cancel this request?"
        description="Your manager will no longer see it."
        confirmLabel={isCancelling ? 'Cancelling…' : 'Cancel Request'}
        variant="danger"
        onConfirm={handleCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}
