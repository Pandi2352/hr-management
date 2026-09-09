import { Check } from 'lucide-react';
import { cn } from '../../../utils/cn';
import type { ApprovalStep } from '../types/leave-request.types';

const STAGE_LABEL: Record<string, string> = {
  SUBMITTED: 'Submitted',
  MANAGER: 'Manager',
  HR: 'HR Approval',
};

function dotClasses(action: ApprovalStep['action']): string {
  switch (action) {
    case 'APPROVED':
      return 'border-emerald-500 bg-emerald-500 text-white';
    case 'REJECTED':
      return 'border-rose-500 bg-rose-500 text-white';
    case 'SKIPPED':
      return 'border-slate-300 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800';
    default:
      return 'border-amber-400 bg-white text-amber-500 dark:bg-slate-900';
  }
}

/** Vertical stepper showing submitted → manager → HR progress. */
export function ApprovalTimeline({ steps }: { steps: ApprovalStep[] }) {
  const visible = steps.filter((s) => s.stage !== 'SUBMITTED' || s.comments);
  return (
    <div className="space-y-0">
      {visible.map((s, idx) => {
        const last = idx === visible.length - 1;
        return (
          <div key={`${s.stage}-${idx}`} className="flex gap-2.5">
            <div className="flex flex-col items-center">
              <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2', dotClasses(s.action))}>
                {(s.action === 'APPROVED' || s.action === 'SKIPPED') && <Check className="h-3 w-3 stroke-[3]" />}
                {s.action === 'REJECTED' && <span className="text-[10px] font-black">×</span>}
                {s.action === 'PENDING' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />}
              </span>
              {!last && <span className="w-0.5 flex-1 bg-slate-200 dark:bg-slate-800" />}
            </div>
            <div className={cn(!last && 'pb-3')}>
              <p className="text-[11px] font-bold text-ink">
                {STAGE_LABEL[s.stage] || s.stage}
                <span className="ml-1.5 font-medium text-ink-3">
                  {s.action === 'PENDING' ? '· waiting' : s.action === 'SKIPPED' ? '· skipped' : `· ${s.action.toLowerCase()}`}
                </span>
              </p>
              {s.approverName && <p className="text-[11px] text-ink-3">{s.approverName}</p>}
              {s.comments && <p className="mt-0.5 text-[11px] text-ink-2 italic">“{s.comments}”</p>}
              {s.actedAt && (
                <p className="text-[10px] text-ink-3">{new Date(s.actedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
