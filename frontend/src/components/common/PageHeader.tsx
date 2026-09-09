import type { ReactNode } from "react";
import { cn } from "../../utils/cn";
import pageHeaderLightBg from "../../assets/page_header_light_bg.jpg";
import pageHeaderDarkBg from "../../assets/page_header_dark_bg.jpg";

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Rendered to the left of the title/description stack, e.g. a back button. */
  leading?: ReactNode;
  /** Rendered on the right, e.g. action buttons. */
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, leading, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 py-4 sm:px-6 sm:py-4.5 transition-colors shadow-none",
        className
      )}
    >
      {/* Light Mode Banner Background */}
      <img
        src={pageHeaderLightBg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-right opacity-70 pointer-events-none select-none dark:hidden"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-transparent pointer-events-none dark:hidden" />

      {/* Dark Mode Banner Background */}
      <img
        src={pageHeaderDarkBg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-right opacity-60 pointer-events-none select-none hidden dark:block"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/85 to-transparent pointer-events-none hidden dark:block" />

      {/* Content Layer */}
      <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5 min-w-0">
          {leading}
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 truncate">
              {title}
            </h1>
            {description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                {description}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

export default PageHeader;
