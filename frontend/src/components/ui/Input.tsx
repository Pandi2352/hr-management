import React, { useState } from "react";
import { Eye, EyeOff, X } from "lucide-react";
import { cn } from "../../utils/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightAction?: React.ReactNode;
  clearable?: boolean;
  onClear?: () => void;
  isPasswordToggle?: boolean;
  isLoading?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = "text",
      label,
      error,
      helperText,
      leftIcon,
      rightAction,
      clearable = false,
      onClear,
      isPasswordToggle = false,
      isLoading = false,
      id,
      required,
      disabled,
      readOnly,
      value,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);
    const [showPassword, setShowPassword] = useState<boolean>(false);

    const actualType = isPasswordToggle ? (showPassword ? "text" : "password") : type;
    const hasValue = value !== undefined && value !== null && String(value).length > 0;

    return (
      <div className="w-full space-y-1">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[11px] font-medium tracking-wide uppercase text-slate-500 dark:text-slate-400"
          >
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
        )}

        <div className="relative">
          {/* Left Icon */}
          {leftIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              {leftIcon}
            </div>
          )}

          {/* Core Input with strict rounded-md, flat border styling */}
          <input
            ref={ref}
            id={inputId}
            type={actualType}
            required={required}
            disabled={disabled || isLoading}
            readOnly={readOnly}
            value={value}
            className={cn(
              "block w-full h-9 rounded-md border bg-white px-3 text-xs text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none",
              error
                ? "border-rose-300 focus:border-rose-400 dark:border-rose-500/50 dark:focus:border-rose-400"
                : "border-slate-300 hover:border-slate-400 focus:border-[var(--primary)] dark:border-slate-800 dark:hover:border-slate-700 dark:focus:border-[var(--primary)]",
              "dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500",
              leftIcon && "pl-9",
              (clearable || isPasswordToggle || rightAction || isLoading) && "pr-9",
              disabled && "opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-800",
              readOnly && "bg-slate-50 dark:bg-slate-800/50 cursor-default",
              className
            )}
            {...props}
          />

          {/* Right Action Cluster (Loading spinner / Clear button / Password Toggle / Custom Action) */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 gap-1.5">
            {isLoading && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent dark:border-indigo-400" />
            )}

            {!isLoading && clearable && hasValue && !disabled && !readOnly && onClear && (
              <button
                type="button"
                onClick={onClear}
                className="rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title="Clear input"
                tabIndex={-1}
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {!isLoading && isPasswordToggle && (
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            )}

            {!isLoading && rightAction && rightAction}
          </div>
        </div>

        {/* Error or Helper message */}
        {error ? (
          <p className="text-xs text-rose-500 dark:text-rose-400 mt-1">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
