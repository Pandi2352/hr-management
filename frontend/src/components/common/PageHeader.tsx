import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

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
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-5",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {leading}
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {title}
          </h1>
          {description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>
          )}
        </div>
      </div>

      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
