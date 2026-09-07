import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "../../utils/cn";

export type DeltaDirection = "up" | "down" | "flat";

export interface StatTileProps {
  /** Small caption above the value, e.g. "Headcount". */
  label: string;
  /** The headline figure. Rendered in ink, never in an accent colour. */
  value: ReactNode;
  /** Trailing qualifier beside the value, e.g. "Employees". */
  unit?: string;
  /** Identity swatch colour (a Tailwind bg-* class) shown beside the value. */
  swatch?: string;
  delta?: {
    /** Already-formatted magnitude, e.g. "16.5%". The sign is added for you. */
    value: string;
    direction: DeltaDirection;
    /** Optional context, e.g. "vs last quarter". */
    caption?: string;
  };
  className?: string;
}

/*
 * Direction carries meaning through the arrow + explicit sign, so the tile stays
 * readable without colour (CVD, print, forced-colors). Colour only reinforces.
 */
const DELTA_STYLES: Record<
  DeltaDirection,
  { icon: typeof ArrowUpRight; sign: string; className: string }
> = {
  up: {
    icon: ArrowUpRight,
    sign: "+",
    className:
      "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-900",
  },
  down: {
    icon: ArrowDownRight,
    sign: "−",
    className:
      "text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-950/40 dark:border-rose-900",
  },
  flat: {
    icon: Minus,
    sign: "",
    className: "text-ink-2 bg-surface-2 border-hairline",
  },
};

export function StatTile({ label, value, unit, swatch, delta, className }: StatTileProps) {
  const deltaStyle = delta ? DELTA_STYLES[delta.direction] : null;
  const DeltaIcon = deltaStyle?.icon;

  return (
    <div className={cn("rounded-md border border-hairline bg-surface px-3 py-2.5", className)}>
      <p className="text-[11px] font-medium text-ink-3">{label}</p>

      <div className="mt-1.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {swatch && (
            <span className={cn("h-2.5 w-2.5 shrink-0 rounded-sm", swatch)} aria-hidden="true" />
          )}
          <span className="truncate text-[15px] font-semibold tabular-nums text-ink">{value}</span>
          {unit && <span className="truncate text-[11px] text-ink-3">{unit}</span>}
        </div>

        {delta && deltaStyle && DeltaIcon && (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums",
              deltaStyle.className,
            )}
            title={delta.caption}
          >
            <DeltaIcon className="h-3 w-3" aria-hidden="true" />
            {deltaStyle.sign}
            {delta.value}
          </span>
        )}
      </div>

      {delta?.caption && <p className="mt-1 truncate text-[10px] text-ink-3">{delta.caption}</p>}
    </div>
  );
}

export function StatTileRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-2.5 lg:grid-cols-4", className)}>{children}</div>
  );
}
