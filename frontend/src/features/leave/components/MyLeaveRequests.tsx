import { useCallback, useEffect, useState } from 'react';
import { CalendarX2, Plus } from 'lucide-react';
import { Avatar, Button, SelectField } from '../../../components/ui';
import { ConfirmDialog } from '../../../components/overlay/ConfirmDialog';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/toast';
import { leaveApi } from '../api/leave.api';
import { ApprovalTimeline } from './ApprovalTimeline';
import { ApplyLeaveModal } from './ApplyLeaveModal';
import { LEAVE_STATUS_META, type LeaveRequest } from '../types/leave-request.types';
import type { MyLeaveSummary } from '../types/leave-balance.types';
import { formatRecordDate } from '../../attendance/types/attendance.types';

export function MyLeaveRequests({
  summary,
  onChanged,
}: {
  summary: MyLeaveSummary | null;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [status, setStatus] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [applyOpen, setApplyOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<LeaveRequest | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setRequests(await leaveApi.myRequests(status));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not load requests.');
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
      await leaveApi.cancelRequest(cancelTarget._id);
      toast.success('Request cancelled, balance released.');
      setCancelTarget(null);
      load();
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not cancel.');
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
              { value: 'PENDING_MANAGER', label: 'With Manager' },
              { value: 'PENDING_HR', label: 'With HR' },
              { value: 'APPROVED', label: 'Approved' },
              { value: 'REJECTED', label: 'Rejected' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
          />
        </div>
        <Button size="sm" onClick={() => setApplyOpen(true)} className="flex items-center gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Apply Leave
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" variant="violet" />
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <CalendarX2 className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm font-semibold">No leave requests</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-400">
            Apply and track manager → HR approval here. Approved days deduct from your wallet.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {requests.map((r) => {
            const meta = LEAVE_STATUS_META[r.status];
            const expanded = expandedId === r._id;
            const cancellable = r.status === 'PENDING_MANAGER' || r.status === 'PENDING_HR';
            return (
              <div key={r._id} className="rounded-md border border-hairline bg-surface p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Avatar src={r.employee?.avatarUrl} name={r.employee?.displayName || '?'} size="sm" />
                    <div>
                      <p className="text-[13px] font-bold">
                        {r.leaveType?.name} · {r.totalDays} day{r.totalDays === 1 ? '' : 's'}
                        {r.isHalfDay && <span className="ml-1 text-[11px] font-medium text-ink-3">(half day)</span>}
                      </p>
                      <p className="text-[11px] text-ink-3">
                        {formatRecordDate(r.startDate)} → {formatRecordDate(r.endDate)}
                        {r.reason ? ` · ${r.reason}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${meta.classes}`}>{meta.label}</span>
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : r._id)}
                      className="cursor-pointer text-[11px] font-semibold text-[var(--primary)] hover:underline"
                    >
                      {expanded ? 'Hide timeline' : 'Timeline'}
                    </button>
                    {cancellable && (
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
                {expanded && (
                  <div className="mt-3 border-t border-hairline pt-3">
                    <ApprovalTimeline steps={r.steps} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ApplyLeaveModal
        isOpen={applyOpen}
        summary={summary}
        onClose={() => setApplyOpen(false)}
        onApplied={() => {
          load();
          onChanged();
        }}
      />

      <ConfirmDialog
        isOpen={!!cancelTarget}
        title="Cancel this request?"
        description="The pending hold returns to your leave wallet immediately."
        confirmLabel={isCancelling ? 'Cancelling…' : 'Cancel Request'}
        variant="danger"
        onConfirm={handleCancel}
        onCancel={() => setCancelTarget(null)}
      />
    </div>
  );
}
