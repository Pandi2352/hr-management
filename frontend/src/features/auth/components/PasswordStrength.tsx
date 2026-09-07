import { cn } from "../../../utils/cn";
import type { PasswordStrengthResult } from "../validation/password.validation";

interface PasswordStrengthProps {
  strength: PasswordStrengthResult;
  showDetails?: boolean;
  className?: string;
}

export function PasswordStrength({
  strength,
  showDetails = true,
  className,
}: PasswordStrengthProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {/* Label and Score Text */}
      {showDetails && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Password strength:
          </span>
          <span
            className={cn(
              "text-[11px] font-bold tracking-tight",
              strength.score <= 1
                ? "text-rose-600 dark:text-rose-400"
                : strength.score <= 3
                ? "text-amber-600 dark:text-amber-400"
                : "text-emerald-600 dark:text-emerald-400"
            )}
          >
            {strength.label}
          </span>
        </div>
      )}

      {/* Segmented Progress Bars (5 Segments) */}
      <div className="flex gap-1 h-1.5 w-full">
        {[1, 2, 3, 4, 5].map((segmentIndex) => {
          const isFilled = strength.score >= segmentIndex;
          return (
            <div
              key={segmentIndex}
              className={cn(
                "h-full flex-1 rounded-xs transition-all duration-300",
                isFilled ? strength.color : "bg-slate-200 dark:bg-slate-800"
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
