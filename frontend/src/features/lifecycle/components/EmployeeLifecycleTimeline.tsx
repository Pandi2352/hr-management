import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Award,
  TrendingUp,
  Shuffle,
  UserCheck,
  CheckCircle,
  Flag,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { lifecycleApi } from '../api/lifecycle.api';
import type { TimelineMilestone } from '../types/lifecycle.types';

interface EmployeeLifecycleTimelineProps {
  employeeId: string;
}

export const EmployeeLifecycleTimeline: React.FC<EmployeeLifecycleTimelineProps> = ({
  employeeId,
}) => {
  const [events, setEvents] = useState<TimelineMilestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (employeeId) {
      setIsLoading(true);
      lifecycleApi
        .getEmployeeTimeline(employeeId)
        .then((res) => {
          setEvents(res.events || []);
        })
        .catch(() => {
          setEvents([]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [employeeId]);

  const getMilestoneIcon = (type: string) => {
    switch (type) {
      case 'JOINING':
        return <Flag className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case 'CONFIRMATION':
        return <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case 'PROMOTION':
        return <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      case 'DEPARTMENT_TRANSFER':
        return <Shuffle className="h-4 w-4 text-teal-600 dark:text-teal-400" />;
      case 'MANAGER_CHANGE':
        return <UserCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      default:
        return <Award className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
    }
  };

  const getMilestoneBadgeStyle = (type: string) => {
    switch (type) {
      case 'JOINING':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
      case 'CONFIRMATION':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
      case 'PROMOTION':
        return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800';
      case 'DEPARTMENT_TRANSFER':
        return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800';
      case 'MANAGER_CHANGE':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
      default:
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800';
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center text-xs text-slate-400">
        <Clock className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-500" />
        Loading career milestone history...
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        No recorded lifecycle milestones yet for this employee.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
      {events.map((event, idx) => (
        <div key={event.id || idx} className="relative group">
          {/* Timeline Dot with Icon */}
          <div className="absolute -left-6 top-1.5 flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
            {getMilestoneIcon(event.type)}
          </div>

          {/* Milestone Content Card */}
          <div className="p-4 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 transition-colors hover:border-slate-300 dark:hover:border-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getMilestoneBadgeStyle(
                  event.type
                )}`}
              >
                {event.type.replace('_', ' ')}
              </span>
              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {event.date}
              </span>
            </div>

            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              {event.title}
            </h4>

            {event.description && (
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {event.description}
              </p>
            )}

            {/* Before / After Diff if present */}
            {event.meta && (event.meta.previousState || event.meta.newState) && (
              <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 text-[11px]">
                {event.meta.previousState?.designationTitle && event.meta.newState?.designationTitle && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Role:</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 line-through">
                      {event.meta.previousState.designationTitle}
                    </span>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                    <span className="px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-semibold">
                      {event.meta.newState.designationTitle}
                    </span>
                  </div>
                )}

                {event.meta.previousState?.departmentName && event.meta.newState?.departmentName && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Dept:</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {event.meta.previousState.departmentName}
                    </span>
                    <ArrowRight className="h-3 w-3 text-slate-400" />
                    <span className="px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 font-semibold">
                      {event.meta.newState.departmentName}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
