import React from 'react';
import {
  Briefcase,
  FileText,
  Users,
  Headphones,
  UserX,
  BadgeCheck,
} from 'lucide-react';
import type { RecruitmentMetrics } from '../types/recruitment.types';

interface RecruitmentMetricsGridProps {
  metrics: RecruitmentMetrics;
}

export const RecruitmentMetricsGrid: React.FC<RecruitmentMetricsGridProps> = ({ metrics }) => {
  const items = [
    {
      title: 'Total Job Openings',
      value: metrics.totalJobOpenings.toLocaleString(),
      icon: Briefcase,
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/40',
    },
    {
      title: 'Total Application',
      value: metrics.totalApplications.toLocaleString(),
      icon: FileText,
      color: 'text-yellow-600 dark:text-yellow-400',
      bg: 'bg-yellow-50 dark:bg-yellow-950/40 border-yellow-100 dark:border-yellow-900/40',
    },
    {
      title: 'Shortlisted',
      value: metrics.shortlisted.toLocaleString(),
      icon: Users,
      color: 'text-sky-600 dark:text-sky-400',
      bg: 'bg-sky-50 dark:bg-sky-950/40 border-sky-100 dark:border-sky-900/40',
    },
    {
      title: 'Interviewed',
      value: metrics.interviewed.toLocaleString(),
      icon: Headphones,
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900/40',
    },
    {
      title: 'Rejected',
      value: metrics.rejected.toLocaleString(),
      icon: UserX,
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900/40',
    },
    {
      title: 'Hired',
      value: metrics.hired.toLocaleString(),
      icon: BadgeCheck,
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/40',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 h-full">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.title}
            className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs flex items-center gap-3.5 transition-all hover:border-slate-300 dark:hover:border-slate-700"
          >
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md border ${item.bg} ${item.color}`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                {item.title}
              </p>
              <p className="text-xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums mt-0.5">
                {item.value}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
