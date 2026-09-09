import { ChevronDown } from 'lucide-react';
import { calendarYearOptions } from '../utils/holiday-format';

export function HolidayYearSelect({
  year,
  onChange,
}: {
  year: number;
  onChange: (year: number) => void;
}) {
  return (
    <label className="inline-flex items-center gap-1 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
      <span className="font-semibold">Holidays</span>
      <span className="font-normal text-slate-500 dark:text-slate-400">for year,</span>
      <span className="relative inline-flex items-center">
        <select
          value={year}
          onChange={(e) => onChange(Number(e.target.value))}
          className="cursor-pointer appearance-none bg-transparent pr-5 font-bold text-slate-900 focus:outline-none dark:text-white"
          aria-label="Holiday calendar year"
        >
          {calendarYearOptions().map((y) => (
            <option key={y} value={y} className="text-slate-900">
              {y}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-0 h-4 w-4 text-slate-900 dark:text-white" />
      </span>
    </label>
  );
}
