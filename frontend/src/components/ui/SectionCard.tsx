import React from 'react';
import { cn } from '../../utils/cn';

export interface SectionCardProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  title,
  description,
  icon: Icon,
  badge,
  actions,
  children,
  className,
  headerClassName,
  bodyClassName,
}) => {
  const hasHeader = Boolean(title || description || actions || Icon || badge);

  return (
    <div
      className={cn(
        'rounded-md border border-hairline bg-surface overflow-hidden',
        className,
      )}
    >
      {hasHeader && (
        <div
          className={cn(
            'flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-hairline bg-surface/50',
            headerClassName,
          )}
        >
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="flex h-8 w-8 items-center justify-center rounded-md border border-hairline bg-surface-hover/60 text-muted-foreground shrink-0">
                <Icon className="h-4 w-4" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                {typeof title === 'string' ? (
                  <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                ) : (
                  title
                )}
                {badge}
              </div>
              {description && (
                <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </div>
  );
};
