import { useCallback, useEffect, useState, useRef } from 'react';
import { CalendarX2, CalendarCheck } from 'lucide-react';
import { SelectField } from '../../../components/ui';
import { ConfirmDialog } from '../../../components/overlay/ConfirmDialog';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/toast';
import { attendanceApi } from '../api/attendance.api';
import { AttendanceRegularizationWizard } from './AttendanceRegularizationWizard';
import { REG_STATUS_META, type Regularization } from '../types/shift.types';
import { formatRecordDate, type AttendanceRecord } from '../types/attendance.types';

interface Props {
  myRecords?: AttendanceRecord[];
  onChanged?: () => void;
}

export function MyRegularizations({ myRecords = [], onChanged }: Props) {
  const toast = useToast();
  const [requests, setRequests] = useState<Regularization[]>([]);
  const [status, setStatus] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<Regularization | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const requestsListRef = useRef<HTMLDivElement>(null);

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
      toast.success('Regularization request cancelled.');
      setCancelTarget(null);
      load();
      if (onChanged) onChanged();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not cancel.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleScrollToPending = () => {
    setStatus('PENDING');
    requestsListRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-6">
      {/* Attendance Regularization Wizard matching user screenshots */}
      <AttendanceRegularizationWizard
        myRecords={myRecords}
        onSubmitted={() => {
          load();
          if (onChanged) onChanged();
        }}
        onViewPendingClick={handleScrollToPending}
      />

      {/* Requests History List Section */}
      <div ref={requestsListRef} className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Regularization Requests History
            </h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Track status of your past and pending attendance corrections
            </p>
          </div>

          <div className="w-48">
            <SelectField
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: 'ALL', label: 'All statuses' },
                { value: 'PENDING', label: 'Pending Approval' },
                { value: 'APPROVED', label: 'Approved' },
                { value: 'REJECTED', label: 'Rejected' },
                { value: 'CANCELLED', label: 'Cancelled' },
              ]}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" variant="violet" />
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-8 text-center">
            <CalendarX2 className="mx-auto mb-2 h-7 w-7 text-slate-300 dark:text-slate-600" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              No regularization requests found
            </p>
            <p className="mx-auto mt-1 max-w-sm text-[11px] text-slate-400 dark:text-slate-500">
              Select any past day in the calendar above to request attendance punch correction.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {requests.map((r) => {
              const meta = REG_STATUS_META[r.status] || { label: r.status, classes: 'bg-slate-100 text-slate-700' };
              return (
                <div
                  key={r._id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3.5 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                      <CalendarCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {formatRecordDate(r.date)} ·{' '}
                        <span className="font-mono text-emerald-600 dark:text-emerald-400">
                          {r.requestedCheckIn}
                          {r.requestedCheckOut ? ` → ${r.requestedCheckOut}` : ''}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {r.reason}
                      </p>
                      {r.decisionNote && (
                        <p className="text-[11px] italic text-slate-400 dark:text-slate-500 mt-0.5">
                          Manager note: “{r.decisionNote}”
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${meta.classes}`}>
                      {meta.label}
                    </span>
                    {r.status === 'PENDING' && (
                      <button
                        type="button"
                        onClick={() => setCancelTarget(r)}
                        className="cursor-pointer rounded-md border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950/40 transition-colors"
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
      </div>

      <ConfirmDialog
        isOpen={!!cancelTarget}
        title="Cancel this regularization request?"
        description="Your manager will no longer see this punch correction request."
        confirmLabel={isCancelling ? 'Cancelling…' : 'Cancel Request'}
        variant="danger"
        onConfirm={handleCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}
