import type { ReactNode } from "react";
import { Table as TableIcon, List, LayoutGrid, Map as MapIcon, Plus } from "lucide-react";
import { cn } from "../../utils/cn";

export type ViewKey = "table" | "list" | "cards" | "map";

export interface ViewToolbarProps {
  activeView: ViewKey;
  onViewChange?: (view: ViewKey) => void;
  /** Views to offer. Anything omitted is hidden rather than shown disabled. */
  availableViews?: ViewKey[];
  /** Right-aligned actions (export, filter, edit view…). */
  actions?: ReactNode;
  onAddView?: () => void;
  className?: string;
}

const VIEW_META: Record<ViewKey, { label: string; icon: typeof TableIcon }> = {
  table: { label: "Table View", icon: TableIcon },
  list: { label: "List View", icon: List },
  cards: { label: "Card View", icon: LayoutGrid },
  map: { label: "Map", icon: MapIcon },
};

/**
 * The strip that sits directly under the page header: view switcher on the
 * left, contextual actions on the right, hairline-separated from the content.
 */
export function ViewToolbar({
  activeView,
  onViewChange,
  availableViews = ["table"],
  actions,
  onAddView,
  className,
}: ViewToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-2",
        className,
      )}
    >
      <div className="flex items-center gap-0.5">
        {availableViews.map((view) => {
          const { label, icon: Icon } = VIEW_META[view];
          const isActive = view === activeView;

          return (
            <button
              key={view}
              type="button"
              onClick={() => onViewChange?.(view)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium transition-colors",
                isActive
                  ? "bg-surface-3 text-ink"
                  : "text-ink-3 hover:bg-surface-2 hover:text-ink-2",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{label}</span>
            </button>
          );
        })}

        {onAddView && (
          <button
            type="button"
            onClick={onAddView}
            className="ml-1 inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink-2"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>View</span>
          </button>
        )}
      </div>

      {actions && <div className="flex flex-wrap items-center gap-1.5">{actions}</div>}
    </div>
  );
}

/** Compact text+icon action styled to sit in the toolbar's right cluster. */
export function ToolbarAction({
  icon: Icon,
  children,
  onClick,
  disabled,
}: {
  icon: typeof TableIcon;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-hairline bg-surface px-2 py-1 text-[12px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Icon className="h-3.5 w-3.5" />
      <span>{children}</span>
    </button>
  );
}
