import { Link } from 'react-router-dom';
import { ArrowRight, ShieldOff } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { auditActionTone, humanizeAction, relativeTime, type AuditLog } from '../../audit/types/audit.types';

interface AdminActivityFeedProps {
  logs: AuditLog[];
  /** True when the viewer lacks audit:read — shown as a permission notice, not an error. */
  forbidden?: boolean;
}

/** Recent administrative activity, sourced from the real audit trail. */
export function AdminActivityFeed({ logs, forbidden }: AdminActivityFeedProps) {
  return (
    <div className="flex h-full flex-col rounded-md border border-hairline bg-surface p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-[12.5px] font-semibold text-ink">Recent Activity</h3>
          <p className="mt-0.5 text-[11px] text-ink-3">Administrative actions across the platform</p>
        </div>
        {!forbidden && (
          <Link
            to="/audit/logs"
            className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-ink-2 transition-colors hover:text-ink"
          >
            View all
            <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {forbidden ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
          <ShieldOff className="h-5 w-5 text-ink-3" />
          <p className="text-[11.5px] text-ink-3">
            You don't have permission to view audit activity.
          </p>
        </div>
      ) : logs.length === 0 ? (
        <p className="flex-1 py-6 text-center text-[11.5px] text-ink-3">
          No administrative activity recorded yet.
        </p>
      ) : (
        <div className="-mx-2 space-y-0.5">
          {logs.map((log) => {
            const tone = auditActionTone(log.action);
            return (
              <div key={log._id} className="flex items-start gap-2.5 rounded-md px-2 py-1.5">
                <span
                  className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', tone.dot)}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11.5px] text-ink-2" title={log.description}>
                    {log.description || humanizeAction(log.action)}
                  </p>
                  <p className="truncate text-[10.5px] text-ink-3">
                    {log.actorName || log.actorEmail || 'System'}
                  </p>
                </div>
                <span
                  className="shrink-0 text-[10.5px] tabular-nums text-ink-3"
                  title={new Date(log.createdAt).toLocaleString()}
                >
                  {relativeTime(log.createdAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
