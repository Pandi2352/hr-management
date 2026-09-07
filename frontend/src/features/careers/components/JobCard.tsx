import { MapPin, Briefcase, CurrencyDollar, ArrowRight, Sparkle } from '@phosphor-icons/react';
import type { PublicJobItem } from '../types/careers.types';

interface JobCardProps {
  job: PublicJobItem;
  onViewDetails: (job: PublicJobItem) => void;
  onApply: (job: PublicJobItem) => void;
}

export function JobCard({ job, onViewDetails, onApply }: JobCardProps) {
  return (
    <div className="group relative flex flex-col justify-between p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-violet-500/50 transition-all duration-200">
      <div>
        {/* Top badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {job.department}
          </span>

          {job.isFeatured && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Sparkle className="h-3 w-3" weight="fill" />
              Featured
            </span>
          )}
        </div>

        {/* Title */}
        <h3
          onClick={() => onViewDetails(job)}
          className="text-base font-bold text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors cursor-pointer"
        >
          {job.title}
        </h3>

        {/* Overview teaser */}
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
          {job.overview}
        </p>

        {/* Metadata pills */}
        <div className="mt-4 flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-slate-400" weight="bold" />
            <span>{job.location}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5 text-slate-400" weight="bold" />
            <span>{job.employmentType}</span>
          </div>

          <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
            <CurrencyDollar className="h-3.5 w-3.5 text-emerald-500" weight="bold" />
            <span>{job.salaryRange}</span>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onViewDetails(job)}
          className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 transition-colors cursor-pointer"
        >
          Role Overview
        </button>

        <button
          type="button"
          onClick={() => onApply(job)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 active:scale-98 transition-all cursor-pointer"
        >
          <span>Apply Now</span>
          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" weight="bold" />
        </button>
      </div>
    </div>
  );
}
