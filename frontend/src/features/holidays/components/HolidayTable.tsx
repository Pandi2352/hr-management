import { formatHolidayDate, weekdayOf } from '../utils/holiday-format';
import type { Holiday } from '../types/holidays.types';

function TypePill({ type }: { type: Holiday['type'] }) {
  const fixed = type === 'FIXED';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold whitespace-nowrap ${
        fixed
          ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300'
          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${fixed ? 'bg-teal-500' : 'bg-amber-500'}`} />
      {fixed ? 'Fixed holiday' : 'Restricted holiday'}
    </span>
  );
}

export function HolidayTable({
  holidays,
  action,
}: {
  holidays: Holiday[];
  /** Optional per-row action (e.g. avail/cancel for restricted picks). */
  action?: (holiday: Holiday) => React.ReactNode;
}) {
  if (holidays.length === 0) {
    return (
      <div className="rounded-sm border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          No holidays in this list
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Holidays added by HR for this year will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border border-hairline bg-surface">
      <div className="overflow-x-auto">
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="bg-surface-2 text-[11px] tracking-wider text-ink-3 uppercase">
            <th className="px-4 py-2.5 font-bold">Holiday name</th>
            <th className="px-4 py-2.5 font-bold">Day</th>
            <th className="px-4 py-2.5 font-bold">Date</th>
            <th className="px-4 py-2.5 font-bold">Type</th>
            {action && <th className="px-4 py-2.5 text-right font-bold">Action</th>}
          </tr>
        </thead>
        <tbody>
          {holidays.map((h) => (
            <tr
              key={h._id}
              className="border-t border-hairline transition-colors first:border-t-0 hover:bg-surface-2/60"
            >
              <td className="max-w-55 truncate px-4 py-2.5 font-semibold text-ink" title={h.name}>
                <span className="mr-2 inline-block h-6 w-1 shrink-0 rounded-full align-middle"
                  style={{ background: h.type === 'FIXED' ? '#14b8a6' : '#f59e0b' }} />
                {h.name}
              </td>
              <td className="px-4 py-2.5">
                <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap text-ink-2">
                  {weekdayOf(h.date)}
                </span>
              </td>
              <td className="px-4 py-2.5 font-mono text-[12px] whitespace-nowrap text-ink-2">
                {formatHolidayDate(h.date)}
              </td>
              <td className="px-4 py-2.5">
                <TypePill type={h.type} />
              </td>
              {action && <td className="px-4 py-2.5 text-right">{action(h)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
