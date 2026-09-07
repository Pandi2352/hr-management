import { cn } from '../../../utils/cn';

interface WorkforceStatusBarProps {
  byStatus: Record<string, number>;
  total: number;
}

/**
 * Employee lifecycle statuses use the reserved status palette (good / warning /
 * serious / neutral) — never a categorical hue, and every segment carries a
 * text label so meaning never rests on colour alone.
 */
const STATUS_META: { key: string; label: string; bar: string; dot: string }[] = [
  { key: 'ACTIVE', label: 'Active', bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
  { key: 'PROBATION', label: 'Probation', bar: 'bg-amber-500', dot: 'bg-amber-500' },
  { key: 'ON_LEAVE', label: 'On Leave', bar: 'bg-sky-500', dot: 'bg-sky-500' },
  { key: 'SUSPENDED', label: 'Suspended', bar: 'bg-rose-500', dot: 'bg-rose-500' },
  { key: 'RESIGNED', label: 'Resigned', bar: 'bg-slate-400', dot: 'bg-slate-400' },
  { key: 'TERMINATED', label: 'Terminated', bar: 'bg-slate-500', dot: 'bg-slate-500' },
  { key: 'INACTIVE', label: 'Inactive', bar: 'bg-slate-300 dark:bg-slate-700', dot: 'bg-slate-300 dark:bg-slate-700' },
];

export function WorkforceStatusBar({ byStatus, total }: WorkforceStatusBarProps) {
  const present = STATUS_META.map((meta) => ({
    ...meta,
    count: byStatus[meta.key] ?? 0,
  })).filter((s) => s.count > 0);

  return (
    <div className="rounded-md border border-hairline bg-surface p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-[12.5px] font-semibold text-ink">Workforce Status</h3>
          <p className="mt-0.5 text-[11px] text-ink-3">Lifecycle distribution across the roster</p>
        </div>
        <span className="shrink-0 text-[11px] tabular-nums text-ink-3">{total} total</span>
      </div>

      {present.length === 0 ? (
        <p className="text-center text-[11.5px] text-ink-3">No employee records yet.</p>
      ) : (
        <>
          {/* Stacked part-to-whole; 2px surface gaps separate adjacent segments */}
          <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-md">
            {present.map((s) => (
              <div
                key={s.key}
                className={cn('h-full first:rounded-l-md last:rounded-r-md', s.bar)}
                style={{ width: `${Math.max((s.count / Math.max(total, 1)) * 100, 2)}%` }}
                title={`${s.label}: ${s.count}`}
              />
            ))}
          </div>

          {/* Legend doubles as the value readout */}
          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2">
            {present.map((s) => (
              <div key={s.key} className="flex items-center gap-2">
                <span className={cn('h-2 w-2 shrink-0 rounded-sm', s.dot)} aria-hidden="true" />
                <span className="truncate text-[11.5px] text-ink-2">{s.label}</span>
                <span className="ml-auto shrink-0 text-[11.5px] font-medium tabular-nums text-ink">
                  {s.count}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
