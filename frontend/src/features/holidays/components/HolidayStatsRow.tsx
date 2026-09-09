import { CalendarCheck2, Gift, BadgeCheck, Hourglass } from 'lucide-react';
import { cn } from '../../../utils/cn';
import type { HolidayCalendarView } from '../types/holidays.types';

const CARDS = [
  {
    key: 'fixed',
    label: 'Fixed Holidays',
    icon: CalendarCheck2,
    from: 'from-teal-500',
    to: 'to-emerald-600',
    ring: 'ring-teal-500/20',
    value: (v: HolidayCalendarView) => v.holidays.filter((h) => h.type === 'FIXED').length,
  },
  {
    key: 'restricted',
    label: 'Restricted Holidays',
    icon: Gift,
    from: 'from-amber-500',
    to: 'to-orange-600',
    ring: 'ring-amber-500/20',
    value: (v: HolidayCalendarView) => v.holidays.filter((h) => h.type === 'RESTRICTED').length,
  },
  {
    key: 'availed',
    label: 'Availed',
    icon: BadgeCheck,
    from: 'from-emerald-500',
    to: 'to-teal-600',
    ring: 'ring-emerald-500/20',
    value: (v: HolidayCalendarView) => v.restricted.availed,
  },
  {
    key: 'remaining',
    label: 'Remaining Picks',
    icon: Hourglass,
    from: 'from-violet-500',
    to: 'to-purple-600',
    ring: 'ring-violet-500/20',
    value: (v: HolidayCalendarView) => v.restricted.remaining,
  },
] as const;

export function HolidayStatsRow({ view }: { view: HolidayCalendarView }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {CARDS.map((card) => {
        const value = card.value(view);
        return (
          <div
            key={card.key}
            className={cn(
              'flex items-center gap-3 rounded-md border border-slate-200 bg-white p-3.5 ring-1 dark:border-slate-800 dark:bg-slate-950',
              card.ring,
            )}
          >
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br text-white',
                card.from,
                card.to,
              )}
            >
              <card.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-lg leading-none font-bold text-slate-900 dark:text-slate-100">
                {value}
              </p>
              <p className="mt-1 truncate text-[10px] text-slate-500 dark:text-slate-400">
                {card.label}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
