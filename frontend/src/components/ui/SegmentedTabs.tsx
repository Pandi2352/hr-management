import { cn } from '../../utils/cn';

export interface SegmentedTab {
  id: string;
  label: string;
  count?: number;
}

/**
 * Shared segmented tab control — pill container with an active segment.
 * Used for holiday fixed/restricted lists, leave sections and anywhere a
 * compact in-card tab switch is needed.
 */
export function SegmentedTabs<T extends string>({
  tabs,
  active,
  onChange,
  size = 'md',
}: {
  tabs: SegmentedTab[];
  active: T;
  onChange: (id: T) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <div
      role="tablist"
      className="inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-md border border-hairline bg-surface-2 p-0.5"
    >
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(tab.id as T)}
            className={cn(
              'flex cursor-pointer items-center gap-1.5 rounded-[5px] font-semibold whitespace-nowrap transition-colors',
              size === 'sm' ? 'px-2.5 py-1 text-[11.5px]' : 'px-3.5 py-1.5 text-[12.5px]',
              isActive
                ? 'bg-surface text-ink shadow-2xs'
                : 'text-ink-3 hover:text-ink',
            )}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  'rounded px-1 text-[10px] font-bold',
                  isActive
                    ? 'bg-[var(--primary-light)] text-[var(--primary)]'
                    : 'bg-surface-3 text-ink-3',
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
