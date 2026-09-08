import React, { useState } from 'react';
import { SelectField } from '../../../components/ui/SelectField';
import type { InterviewScheduleItem } from '../types/recruitment.types';

interface InterviewScheduleCardProps {
  items: InterviewScheduleItem[];
  onViewAll?: () => void;
}

export const InterviewScheduleCard: React.FC<InterviewScheduleCardProps> = ({
  items,
  onViewAll,
}) => {
  const [period, setPeriod] = useState('LAST_MONTH');

  const getBadgeStyles = (variant: InterviewScheduleItem['badgeVariant']) => {
    switch (variant) {
      case 'orange':
        return 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60';
      case 'green':
        return 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60';
      case 'blue':
        return 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60';
      case 'amber':
        return 'bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/60';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-slate-800/80">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Interview Schedule</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">Upcoming technical & culture fit rounds</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer transition-colors"
          >
            View All
          </button>

          <div className="w-32">
            <SelectField
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              options={[
                { value: 'TODAY', label: 'Today' },
                { value: 'THIS_WEEK', label: 'This Week' },
                { value: 'LAST_MONTH', label: 'Last Month' },
                { value: 'NEXT_MONTH', label: 'Next Month' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* 2-Column Schedule Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 pt-3 flex-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-2.5 rounded-md border border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {item.candidateAvatar ? (
                <img
                  src={item.candidateAvatar}
                  alt={item.candidateName}
                  className="h-8 w-8 rounded-md object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                />
              ) : (
                <div className="h-8 w-8 rounded-md bg-slate-100 dark:bg-slate-800 font-bold text-xs flex items-center justify-center shrink-0 text-slate-600 dark:text-slate-300">
                  {item.candidateName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {item.candidateName}
                </p>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.candidateRole}</p>
              </div>
            </div>

            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-tight border shrink-0 whitespace-nowrap ${getBadgeStyles(
                item.badgeVariant
              )}`}
            >
              {item.scheduledTimeOrDate}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
