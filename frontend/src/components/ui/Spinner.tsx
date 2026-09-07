import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'violet' | 'white' | 'muted';
  className?: string;
  label?: string;
}

const sizeClasses = {
  xs: 'h-3.5 w-3.5 stroke-[2.5]',
  sm: 'h-4 w-4 stroke-[2.2]',
  md: 'h-6 w-6 stroke-[2]',
  lg: 'h-8 w-8 stroke-[1.8]',
  xl: 'h-10 w-10 stroke-[1.5]',
};

const variantClasses = {
  primary: 'text-[#524b6e] dark:text-violet-400',
  violet: 'text-violet-600 dark:text-violet-400',
  white: 'text-white',
  muted: 'text-slate-400 dark:text-slate-500',
};

export function Spinner({
  size = 'md',
  variant = 'violet',
  className,
  label,
}: SpinnerProps) {
  return (
    <div className={cn('inline-flex items-center gap-2', className)} role="status">
      <Loader2 className={cn('animate-spin shrink-0', sizeClasses[size], variantClasses[variant])} />
      {label && (
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300 select-none">
          {label}
        </span>
      )}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export interface LoadingOverlayProps {
  message?: string;
  blur?: boolean;
  className?: string;
}

export function LoadingOverlay({
  message = 'Processing request...',
  blur = true,
  className,
}: LoadingOverlayProps) {
  return (
    <div
      className={cn(
        'absolute inset-0 z-50 flex flex-col items-center justify-center rounded-md bg-white/70 dark:bg-slate-950/70 p-4 transition-all duration-200',
        blur && 'backdrop-blur-[2px]',
        className
      )}
    >
      <div className="flex flex-col items-center gap-3 rounded-lg border border-slate-200/80 bg-white p-5 shadow-lg dark:border-slate-800 dark:bg-slate-900">
        <Spinner size="lg" variant="violet" />
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 animate-pulse">
          {message}
        </p>
      </div>
    </div>
  );
}
