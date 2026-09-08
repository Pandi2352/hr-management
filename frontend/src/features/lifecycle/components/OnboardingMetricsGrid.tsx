import { Users, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';
import type { OnboardingMetrics } from '../types/onboarding.types';

interface Props {
  metrics: OnboardingMetrics;
}

export function OnboardingMetricsGrid({ metrics }: Props) {
  const cards = [
    {
      label: 'Active Onboardings',
      value: metrics.inProgress,
      subtext: `${metrics.total} total sessions initiated`,
      icon: Users,
      color: 'text-violet-600 dark:text-violet-400',
      bgColor: 'bg-violet-50 dark:bg-violet-950/40',
      borderColor: 'border-violet-200/80 dark:border-violet-900/50',
    },
    {
      label: 'Avg Completion Rate',
      value: `${metrics.avgCompletion}%`,
      subtext: 'Across all active joiners',
      icon: TrendingUp,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/40',
      borderColor: 'border-indigo-200/80 dark:border-indigo-900/50',
    },
    {
      label: 'Completed & Cleared',
      value: metrics.completed,
      subtext: '100% Gated to Probation',
      icon: CheckCircle2,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
      borderColor: 'border-emerald-200/80 dark:border-emerald-900/50',
    },
    {
      label: 'Overdue / Attention',
      value: metrics.overdue,
      subtext: 'Past target joining date',
      icon: AlertTriangle,
      color: metrics.overdue > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500',
      bgColor: metrics.overdue > 0 ? 'bg-amber-50 dark:bg-amber-950/40' : 'bg-slate-50 dark:bg-slate-900/40',
      borderColor: metrics.overdue > 0 ? 'border-amber-200/80 dark:border-amber-900/50' : 'border-slate-200 dark:border-slate-800',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c, idx) => {
        const Icon = c.icon;
        return (
          <div
            key={idx}
            className={`p-4 rounded-md border bg-white dark:bg-slate-900 ${c.borderColor} transition-all`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {c.label}
              </span>
              <div className={`p-2 rounded-md ${c.bgColor} ${c.color}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-outfit text-slate-900 dark:text-white">
                {c.value}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-jakarta">
              {c.subtext}
            </p>
          </div>
        );
      })}
    </div>
  );
}
