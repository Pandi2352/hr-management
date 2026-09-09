import { useCallback, useEffect, useState } from 'react';
import { Check, Inbox, X } from 'lucide-react';
import { Avatar, Button, SelectField } from '../../../components/ui';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/toast';
import { useAuth } from '../../auth/context/AuthContext';
import { leaveApi } from '../api/leave.api';
import { ApprovalTimeline } from './ApprovalTimeline';
import { LEAVE_STATUS_META, type LeaveRequest } from '../types/leave-request.types';
import { formatRecordDate } from '../../attendance/types/attendance.types';

function canActAsHr(roles?: string[], permissions?: string[]): boolean {
  if (permissions?.includes('*') || permissions?.includes('leave:manage')) return true;
  return Boolean(roles?.some((r) => ['SUPER_ADMIN', 'HR_ADMIN'].includes(r.toUpperCase())));
}

function DecisionBox({
  request,
  pendingLabel,
  onDecide,
  isWorking,
}: {
  request: LeaveRequest;
  pendingLabel: string;
  onDecide: (approve: boolean, comments: string) => void;
  isWorking: boolean;
}) {
  const [comments, setComments] = useState('');
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mt-3 space-y-2 border-t border-hairline pt-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="cursor-pointer text-[11px] font-semibold text-[var(--primary)] hover:underline"
      >
        {expanded ? 'Hide approval timeline' : 'Show approval timeline'}
      </button>
      {expanded && <ApprovalTimeline steps={request.steps} />}
      <p className="text-[11px] font-semibold text-ink-3">{pendingLabel}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          placeholder="Comment (optional, visible to employee)…"
          className="flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900"
        />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => onDecide(false, comments)} disabled={isWorking} className="flex items-center gap-1 text-rose-600">
            <X className="h-3.5 w-3.5" /> Reject
          </Button>
          <Button size="sm" onClick={() => onDecide(true, comments)} disabled={isWorking} className="flex items-center gap-1">
            <Check className="h-3.5 w-3.5" /> Approve
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ApprovalsInbox({ onChanged }: { onChanged: () => void }) {
  const toast = useToast();
  const { user } = useAuth();
  const hr = canActAsHr(user?.roles, user?.permissions);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [filter, setFilter] = useState('PENDING');
  const [isLoading, setIsLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = hr
        ? await leaveApi.allRequests(
            filter === 'ALL' || filter === 'PENDING' ? undefined : { status: filter },
          )
        : await leaveApi.approvalsInbox();
      setRequests(
        hr && filter === 'PENDING'
          ? data.filter((r) => r.status === 'PENDING_MANAGER' || r.status === 'PENDING_HR')
          : data,
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not load approvals.');
    } finally {
      setIsLoading(false);
    }
  }, [filter, hr, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (r: LeaveRequest, approve: boolean, comments: string, stage: 'manager' | 'hr') => {
    setWorkingId(r._id);
    try {
      if (stage === 'manager') await leaveApi.managerDecide(r._id, approve, comments);
      else await leaveApi.hrDecide(r._id, approve, comments);
      toast.success(
        approve
          ? stage === 'manager'
            ? 'Forwarded to HR for final approval.'
            : 'Leave approved, wallet deducted.'
          : 'Request rejected, balance released.',
      );
      load();
      onChanged();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not save decision.');
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-ink-3">
          {hr ? 'Manager stage for your reports, final HR approval, and full history.' : 'Requests from your direct reports waiting on you.'}
        </p>
        {hr && (
          <div className="w-44">
            <SelectField
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              options={[
                { value: 'PENDING', label: 'Pending only' },
                { value: 'ALL', label: 'Everything' },
                { value: 'APPROVED', label: 'Approved' },
                { value: 'REJECTED', label: 'Rejected' },
              ]}
            />
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" variant="violet" />
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <Inbox className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm font-semibold">Inbox clear</p>
          <p className="mt-1 text-xs text-slate-400">Nothing waiting on your approval right now.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {requests.map((r) => {
            const meta = LEAVE_STATUS_META[r.status];
            const actionable = r.status === 'PENDING_MANAGER' || r.status === 'PENDING_HR';
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
                        {r.leaveType?.name} · {r.totalDays} day{r.totalDays === 1 ? '' : 's'} · {formatRecordDate(r.startDate)} → {formatRecordDate(r.endDate)}
                        {r.reason ? ` · ${r.reason}` : ''}
                      </p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${meta.classes}`}>{meta.label}</span>
                </div>

                {actionable && r.status === 'PENDING_MANAGER' && (
                  <DecisionBox
                    request={r}
                    pendingLabel="Waiting on reporting manager — approve to send to HR."
                    isWorking={workingId === r._id}
                    onDecide={(ok, c) => decide(r, ok, c, 'manager')}
                  />
                )}
                {actionable && r.status === 'PENDING_HR' && hr && (
                  <DecisionBox
                    request={r}
                    pendingLabel="Manager approved — your HR decision deducts the wallet."
                    isWorking={workingId === r._id}
                    onDecide={(ok, c) => decide(r, ok, c, 'hr')}
                  />
                )}
                {!actionable && (
                  <div className="mt-3 border-t border-hairline pt-3">
                    <ApprovalTimeline steps={r.steps} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
