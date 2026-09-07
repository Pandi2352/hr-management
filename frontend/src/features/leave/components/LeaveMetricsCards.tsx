import React from 'react';
import { cn } from '../../../utils/cn';
import type { LeaveMetricItem } from '../types/leave.types';

interface LeaveMetricsCardsProps {
  metrics: LeaveMetricItem[];
  activeCardId?: string;
  onSelectCard?: (id: string) => void;
}

export const LeaveMetricsCards: React.FC<LeaveMetricsCardsProps> = ({
  metrics,
  activeCardId,
  onSelectCard,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
      {metrics.map((item) => {
        const isSelected = activeCardId ? activeCardId === item.id : item.isHighlighted;
        const radius = 24;
        const circumference = 2 * Math.PI * radius;
        const strokeDashoffset = circumference - (circumference * item.percentage) / 100;

        return (
          <div
            key={item.id}
            onClick={() => onSelectCard?.(item.id)}
            className={cn(
              'group relative flex items-center justify-between rounded-md p-5 transition-all duration-200 cursor-pointer bg-white dark:bg-slate-900 shadow-xs select-none',
              isSelected
                ? 'border-2 border-orange-500 dark:border-orange-500 shadow-sm ring-2 ring-orange-500/10'
                : 'border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            )}
          >
            {/* Left Content */}
            <div className="space-y-1">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {item.count.toLocaleString()}
                </span>
                <span className="text-xs font-normal text-slate-400 dark:text-slate-500">
                  /{item.total.toLocaleString()}
                </span>
              </div>
              <p className={cn('text-xs font-semibold tracking-wide', item.textColor)}>
                {item.label}
              </p>
            </div>

            {/* Right Circular Progress Ring */}
            <div className="relative flex items-center justify-center shrink-0 w-16 h-16">
              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
                {/* Background Ring */}
                <circle
                  cx="32"
                  cy="32"
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                  className="text-slate-100 dark:text-slate-800"
                />
                {/* Active Progress Ring */}
                <circle
                  cx="32"
                  cy="32"
                  r={radius}
                  fill="none"
                  stroke={item.color}
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              {/* Centered Percentage text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {item.percentage}%
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
