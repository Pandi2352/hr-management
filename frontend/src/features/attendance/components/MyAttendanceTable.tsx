import { formatRecordDate, formatWorkMinutes, type AttendanceRecord } from '../types/attendance.types';

export function MyAttendanceTable({ records }: { records: AttendanceRecord[] }) {
  if (records.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
        <p className="text-sm font-semibold">No punches this month</p>
        <p className="mt-1 text-xs text-slate-400">Check in above to start today's record.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-hairline bg-surface">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="bg-surface-2 text-[11px] tracking-wider text-ink-3 uppercase">
            <th className="px-3 py-2 font-bold">Date</th>
            <th className="px-3 py-2 font-bold">Check In</th>
            <th className="px-3 py-2 font-bold">Check Out</th>
            <th className="px-3 py-2 text-right font-bold">Worked</th>
            <th className="px-3 py-2 font-bold">Status</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r._id} className="border-t border-hairline first:border-t-0">
              <td className="px-3 py-2 font-semibold whitespace-nowrap">{formatRecordDate(r.date)}</td>
              <td className="px-3 py-2 font-mono">{r.checkIn || '—'}</td>
              <td className="px-3 py-2 font-mono">{r.checkOut || <span className="text-amber-500">open</span>}</td>
              <td className="px-3 py-2 text-right font-semibold">{r.workMinutes ? formatWorkMinutes(r.workMinutes) : '—'}</td>
              <td className="px-3 py-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    r.status === 'PRESENT'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                  }`}
                >
                  {r.status === 'PRESENT' ? 'Present' : 'Open'}
                </span>
                {r.source === 'MANUAL' && <span className="ml-1 text-[10px] text-ink-3">· manual</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
