import { Link } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { Spinner } from '../../../components/ui/Spinner';
import type { MyLeaveSummary } from '../types/leave-balance.types';

const TILE_TINTS = [
  { tile: 'from-sky-500 to-cyan-600', soft: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300', bar: 'bg-sky-500' },
  { tile: 'from-violet-500 to-purple-600', soft: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300', bar: 'bg-violet-500' },
  { tile: 'from-emerald-500 to-teal-600', soft: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300', bar: 'bg-emerald-500' },
  { tile: 'from-amber-500 to-orange-600', soft: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300', bar: 'bg-amber-500' },
  { tile: 'from-rose-500 to-pink-600', soft: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300', bar: 'bg-rose-500' },
  { tile: 'from-indigo-500 to-blue-600', soft: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300', bar: 'bg-indigo-500' },
];

export function MyLeaveBalances({
  summary,
  isLoading,
  year,
  onYearChange,
}: {
  summary: MyLeaveSummary | null;
  isLoading: boolean;
  year: number;
  onYearChange: (year: number) => void;
}) {
  if (isLoading || !summary) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" variant="violet" />
      </div>
    );
  }

  const years = [year - 1, year, year + 1];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold uppercase tracking-wider">Year</span>
          <select
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="cursor-pointer rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <Link
          to="/holidays"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:underline dark:text-teal-300"
        >
          <CalendarDays className="h-3.5 w-3.5" />
          View holiday calendar
        </Link>
      </div>

      {summary.balances.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            No leave balances assigned for {summary.year} yet
          </p>
          <p className="mt-1 text-xs text-slate-400">
            HR assigns yearly leave wallets — they will appear here once published.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {summary.balances.map((b, idx) => {
            const tint = TILE_TINTS[idx % TILE_TINTS.length];
            const total = (b.allocated || 0) + (b.carriedForward || 0);
            const usedPct = total > 0 ? Math.min(((b.used + b.pending) / total) * 100, 100) : 0;
            return (
              <div
                key={b._id}
                className="rounded-md border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gradient-to-br font-mono text-[11px] font-black text-white ${tint.tile}`}>
                      {b.leaveType?.code?.slice(0, 2) || 'LV'}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-bold text-slate-900 dark:text-white">
                        {b.leaveType?.name || 'Leave'}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">{b.leaveType?.code}</span>
                    </span>
                  </div>
                  <span className="text-right">
                    <span className="block text-[22px] leading-none font-black text-slate-900 tabular-nums dark:text-white">
                      {b.available}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">left of {total}</span>
                  </span>
                </div>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className={`h-full rounded-full ${tint.bar}`} style={{ width: `${100 - usedPct}%` }} />
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: 'Allocated', value: b.allocated },
                    { label: 'Carried', value: b.carriedForward },
                    { label: 'Used', value: b.used + (b.pending > 0 ? `+${b.pending}⏳` : '') },
                  ].map((s) => (
                    <div key={s.label} className="rounded-md bg-slate-50 px-1 py-1.5 dark:bg-slate-900">
                      <p className="text-[13px] font-bold text-slate-800 tabular-nums dark:text-slate-100">{s.value}</p>
                      <p className="text-[9.5px] font-medium tracking-wide text-slate-400 uppercase">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-sm border border-slate-300 bg-slate-50 px-3 py-1.5 text-[12px] font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
        Restricted holidays: entitled to {summary.restricted.limit} until December 31, {summary.year}.
        Availed {summary.restricted.availed}, {summary.restricted.remaining} remaining.{' '}
        <Link to="/holidays" className="text-teal-700 hover:underline dark:text-teal-300">
          Pick yours →
        </Link>
      </div>
    </div>
  );
}
