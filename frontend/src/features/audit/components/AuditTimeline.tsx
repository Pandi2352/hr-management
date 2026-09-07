import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { AuditDetailDrawer } from './AuditDetailDrawer';
import {
  auditActionTone,
  humanizeAction,
  type AuditLog,
} from '../types/audit.types';

interface AuditTimelineProps {
  logs: AuditLog[];
  emptyMessage?: string;
}

function humanizeField(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_.]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}

function formatValue(value: any): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (typeof value === 'object') return '…';
  const str = String(value);
  return str.length > 40 ? `${str.slice(0, 40)}…` : str;
}

function groupByDay(logs: AuditLog[]): { day: string; entries: AuditLog[] }[] {
  const groups = new Map<string, AuditLog[]>();
  for (const log of logs) {
    const day = new Date(log.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day)!.push(log);
  }
  return Array.from(groups.entries()).map(([day, entries]) => ({ day, entries }));
}

/**
 * Resource-scoped audit timeline (checklist §16) — a date-grouped rail showing
 * who changed what, with the field-level delta inline.
 */
export function AuditTimeline({ logs, emptyMessage }: AuditTimelineProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!logs || logs.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-hairline bg-surface-2 px-3 py-6 text-center text-[11.5px] text-ink-3">
        {emptyMessage || 'No audit records found.'}
      </p>
    );
  }

  const groups = groupByDay(logs);

  return (
    <>
      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.day}>
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">
              {group.day}
            </p>

            {/* Vertical rail */}
            <div className="relative space-y-1.5 border-l border-hairline pl-4">
              {group.entries.map((log) => {
                const tone = auditActionTone(log.action);
                const changedFields = Object.keys(log.newValue || log.oldValue || {});

                return (
                  <button
                    key={log._id}
                    type="button"
                    onClick={() => setSelectedId(log._id)}
                    className="group relative block w-full cursor-pointer rounded-md border border-hairline bg-surface px-3 py-2 text-left transition-colors hover:bg-surface-2"
                  >
                    {/* Rail node */}
                    <span
                      className={cn(
                        'absolute -left-[21px] top-3.5 h-2 w-2 rounded-full ring-2 ring-surface',
                        tone.dot,
                      )}
                    />

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span
                        className={cn(
                          'rounded px-1.5 py-px text-[10.5px] font-semibold',
                          tone.chip,
                        )}
                      >
                        {humanizeAction(log.action)}
                      </span>
                      <span className="text-[11.5px] font-medium text-ink">
                        {log.actorName || log.actorEmail || 'System'}
                      </span>
                      <span className="ml-auto shrink-0 text-[10.5px] tabular-nums text-ink-3">
                        {new Date(log.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {log.description && (
                      <p className="mt-1 text-[11.5px] text-ink-2">{log.description}</p>
                    )}

                    {/* Inline field deltas — first two, rest summarized */}
                    {changedFields.length > 0 && (
                      <div className="mt-1.5 space-y-0.5">
                        {changedFields.slice(0, 2).map((field) => (
                          <div
                            key={field}
                            className="flex flex-wrap items-center gap-1.5 text-[10.5px]"
                          >
                            <span className="text-ink-3">{humanizeField(field)}</span>
                            <span className="text-ink-3 line-through">
                              {formatValue(log.oldValue?.[field])}
                            </span>
                            <ArrowRight className="h-2.5 w-2.5 text-ink-3" />
                            <span className="font-medium text-ink-2">
                              {formatValue(log.newValue?.[field])}
                            </span>
                          </div>
                        ))}
                        {changedFields.length > 2 && (
                          <p className="text-[10.5px] text-ink-3">
                            +{changedFields.length - 2} more field
                            {changedFields.length - 2 === 1 ? '' : 's'}
                          </p>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <AuditDetailDrawer auditId={selectedId} onClose={() => setSelectedId(null)} />
    </>
  );
}
