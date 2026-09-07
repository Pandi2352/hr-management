import { useState } from 'react';
import { cn } from '../../../utils/cn';
import type { DepartmentHeadcount } from '../api/dashboard.api';

interface HeadcountByDepartmentProps {
  data: DepartmentHeadcount[];
  total: number;
}

/** Past this, the tail folds into "Other" rather than becoming unreadable. */
const VISIBLE_ROWS = 8;

/**
 * Ranked horizontal bars, one sequential hue.
 *
 * A donut was the original spec, but with ~15 departments a part-to-whole pie
 * is unreadable and colour stops being distinguishable past ~7 slices. The
 * reader's job here is comparing magnitude, which bars do better — and a single
 * hue keeps it legible for colour-vision deficiency without a legend.
 */
export function HeadcountByDepartment({ data, total }: HeadcountByDepartmentProps) {
  const [expanded, setExpanded] = useState(false);

  if (!data || data.length === 0) {
    return (
      <div className="rounded-md border border-hairline bg-surface p-5">
        <h3 className="text-[12.5px] font-semibold text-ink">Headcount by Department</h3>
        <p className="mt-4 text-center text-[11.5px] text-ink-3">
          No employees are assigned to a department yet.
        </p>
      </div>
    );
  }

  const rows = expanded ? data : data.slice(0, VISIBLE_ROWS);
  const hiddenRows = data.slice(VISIBLE_ROWS);
  const hiddenTotal = hiddenRows.reduce((sum, r) => sum + r.count, 0);
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="rounded-md border border-hairline bg-surface p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-[12.5px] font-semibold text-ink">Headcount by Department</h3>
          <p className="mt-0.5 text-[11px] text-ink-3">
            {data.length} department{data.length === 1 ? '' : 's'} with assigned employees
          </p>
        </div>
        <span className="shrink-0 text-[11px] tabular-nums text-ink-3">{total} total</span>
      </div>

      <div className="space-y-2">
        {rows.map((row) => {
          const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
          return (
            <div key={row.departmentId ?? 'unassigned'} className="group">
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="truncate text-[11.5px] text-ink-2" title={row.name}>
                  {row.name}
                </span>
                <span className="shrink-0 text-[11px] tabular-nums text-ink-3">
                  <span className="font-medium text-ink">{row.count}</span>
                  <span className="ml-1">({pct}%)</span>
                </span>
              </div>
              {/* Track + fill; 4px rounded data end anchored to the baseline */}
              <div className="h-2 w-full overflow-hidden rounded-md bg-surface-3">
                <div
                  className="h-full rounded-md bg-indigo-500 transition-[width] duration-500 dark:bg-indigo-400"
                  style={{ width: `${Math.max((row.count / max) * 100, 3)}%` }}
                  title={`${row.name}: ${row.count} employee${row.count === 1 ? '' : 's'} (${pct}%)`}
                />
              </div>
            </div>
          );
        })}

        {!expanded && hiddenRows.length > 0 && (
          <div>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-[11.5px] text-ink-3">
                Other ({hiddenRows.length} department{hiddenRows.length === 1 ? '' : 's'})
              </span>
              <span className="shrink-0 text-[11px] tabular-nums text-ink-3">{hiddenTotal}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-md bg-surface-3">
              <div
                className="h-full rounded-md bg-slate-400 dark:bg-slate-600"
                style={{ width: `${Math.max((hiddenTotal / max) * 100, 3)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {hiddenRows.length > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            'mt-3 cursor-pointer text-[11px] font-medium text-ink-2 underline-offset-2 hover:text-ink hover:underline',
          )}
        >
          {expanded ? 'Show top 8 only' : `Show all ${data.length} departments`}
        </button>
      )}
    </div>
  );
}
