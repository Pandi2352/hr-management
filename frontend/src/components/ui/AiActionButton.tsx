import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface AiActionButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  label: string;
  /** Shown in place of the label while the request is in flight. */
  loadingLabel?: string;
  isLoading?: boolean;
  /** One line under the label, for what the action is about to do. */
  hint?: string;
  size?: 'md' | 'lg';
}

/**
 * The button that spends an AI call.
 *
 * Deliberately not a `Button` variant. Generating costs money and takes
 * seconds, unlike every other button in the product, and it is the one action
 * on its screen — so it is bigger, it says what it is about to do, and it does
 * not look like Save sitting next to it.
 *
 * Its colour comes from `--primary`, the same token the customizer drives, so
 * it follows the active theme rather than owning a hue of its own. The sheen is
 * the only decoration, and it only moves while the request is running: a
 * permanently animated button is noise, one that animates while you wait is
 * feedback.
 */
export function AiActionButton({
  label,
  loadingLabel,
  isLoading = false,
  hint,
  size = 'md',
  className,
  disabled,
  ...rest
}: AiActionButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={cn(
        'group relative inline-flex cursor-pointer items-center gap-3 overflow-hidden rounded-md',
        'bg-primary text-white transition-colors',
        'hover:bg-primary-hover',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
        'disabled:cursor-not-allowed disabled:opacity-60',
        size === 'lg' ? 'px-6 py-3' : 'px-5 py-2.5',
        className,
      )}
      {...rest}
    >
      {/* A sheen that crosses the button while the model is working. Pointer
          events off so it never swallows the click. */}
      {isLoading && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/25 to-transparent"
        />
      )}

      <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/20">
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SparkGlyph className="h-4 w-4" />}
      </span>

      <span className="relative min-w-0 text-left">
        <span className={cn('block font-semibold', size === 'lg' ? 'text-sm' : 'text-[13px]')}>
          {isLoading ? loadingLabel || label : label}
        </span>
        {hint && <span className="block text-[11px] text-white/75">{hint}</span>}
      </span>
    </button>
  );
}

/**
 * A four-point spark, drawn rather than imported.
 *
 * The lucide sparkle is used across the product for decoration; this one marks
 * the specific act of asking a model to make something, so it needs to not be
 * that icon. Rays taper because they are drawn with curves, not strokes.
 */
function SparkGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d="M12 2.6c.6 3.6 1.6 4.6 5.2 5.2-3.6.6-4.6 1.6-5.2 5.2-.6-3.6-1.6-4.6-5.2-5.2 3.6-.6 4.6-1.6 5.2-5.2Z" />
      <path d="M18.2 13.4c.35 2 .9 2.55 2.9 2.9-2 .35-2.55.9-2.9 2.9-.35-2-.9-2.55-2.9-2.9 2-.35 2.55-.9 2.9-2.9Z" />
      <path d="M7.4 15.2c.25 1.4.65 1.8 2.05 2.05-1.4.25-1.8.65-2.05 2.05-.25-1.4-.65-1.8-2.05-2.05 1.4-.25 1.8-.65 2.05-2.05Z" />
    </svg>
  );
}
