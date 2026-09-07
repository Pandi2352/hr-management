import React, { useRef } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
  wrapperClassName?: string;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      label,
      value,
      onChange,
      onClear,
      placeholder = 'Search...',
      className,
      wrapperClassName,
      disabled,
      ...props
    },
    ref
  ) => {
    const internalRef = useRef<HTMLInputElement>(null);
    const inputRef = (ref || internalRef) as React.RefObject<HTMLInputElement | null>;

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange('');
      if (onClear) onClear();
      if (inputRef && 'current' in inputRef && inputRef.current) {
        inputRef.current.focus();
      }
    };

    const hasValue = Boolean(value && value.length > 0);

    return (
      <div className={cn('w-full space-y-1', wrapperClassName)}>
        {label && (
          <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-500">
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          {/* Left Search Icon */}
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none select-none" />

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            placeholder={placeholder}
            className={cn(
              'w-full h-9 rounded-md border bg-white pl-9 pr-8 text-xs text-slate-900 placeholder:text-slate-400 transition-colors',
              'border-slate-300 hover:border-slate-400 focus:outline-none focus:border-violet-400',
              'dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-slate-700 dark:focus:border-violet-400',
              disabled && 'opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-800',
              className
            )}
            {...props}
          />

          {/* Clear X Button */}
          {hasValue && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Clear search"
              aria-label="Clear search"
              tabIndex={-1}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
