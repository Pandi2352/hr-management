import React from 'react';
import { Code2, Atom, Palette, Terminal } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import type { VacancyCardItem } from '../types/recruitment.types';

interface CurrentVacanciesSectionProps {
  vacancies: VacancyCardItem[];
  totalJobsAdded?: number;
  onViewJobPost?: (vacancy: VacancyCardItem) => void;
}

export const CurrentVacanciesSection: React.FC<CurrentVacanciesSectionProps> = ({
  vacancies,
  totalJobsAdded = 74,
  onViewJobPost,
}) => {
  const getIcon = (type: VacancyCardItem['iconType']) => {
    switch (type) {
      case 'figma':
        return (
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/40 text-purple-600 dark:text-purple-400">
            <Palette className="h-5 w-5" />
          </div>
        );
      case 'python':
        return (
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40 text-amber-600 dark:text-amber-400">
            <Terminal className="h-5 w-5" />
          </div>
        );
      case 'web':
        return (
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 text-blue-600 dark:text-blue-400">
            <Code2 className="h-5 w-5" />
          </div>
        );
      case 'react':
        return (
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-100 dark:border-cyan-900/40 text-cyan-600 dark:text-cyan-400">
            <Atom className="h-5 w-5" />
          </div>
        );
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Section Header */}
      <div className="flex items-center gap-2.5">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Current Vacancy</h2>
        <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50">
          {totalJobsAdded} Job Added
        </span>
      </div>

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {vacancies.map((job) => (
          <div
            key={job.id}
            className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-slate-700"
          >
            {/* Top: Icon + Title & Type */}
            <div className="flex items-start gap-3">
              {getIcon(job.iconType)}
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {job.title}
                </h3>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {job.employmentType}
                </p>
              </div>
            </div>

            {/* Middle: Applied vs New Stats */}
            <div className="grid grid-cols-2 gap-2 my-4 p-3 rounded-md bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center">
              <div className="border-r border-slate-200 dark:border-slate-700/80 pr-2">
                <p className="text-xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
                  {job.appliedCount < 10 ? `0${job.appliedCount}` : job.appliedCount}
                </p>
                <p className="text-[11px] font-medium text-slate-400 mt-0.5">Applied</p>
              </div>
              <div className="pl-2">
                <p className="text-xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
                  {job.newCount < 10 ? `0${job.newCount}` : job.newCount}
                </p>
                <p className="text-[11px] font-medium text-slate-400 mt-0.5">New</p>
              </div>
            </div>

            {/* Bottom: Salary & Location */}
            <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400">
              <div>
                <span className="text-[10px] text-slate-400 block">Salary</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{job.salary}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Location</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{job.location}</span>
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-3">
              <Button
                variant="primary"
                size="sm"
                onClick={() => onViewJobPost && onViewJobPost(job)}
                className="w-full h-9 rounded-md text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
              >
                See Job Post
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
