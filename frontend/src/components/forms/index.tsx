import React from "react";
import { cn } from "../../utils/cn";

interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
}

export function Form({ children, className, ...props }: FormProps) {
  return (
    <form noValidate className={cn("space-y-4", className)} {...props}>
      {children}
    </form>
  );
}

interface FormFieldProps {
  children: React.ReactNode;
  className?: string;
}

export function FormField({ children, className }: FormFieldProps) {
  return <div className={cn("w-full space-y-1", className)}>{children}</div>;
}

interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  children: React.ReactNode;
}

export function FormLabel({ children, required, className, ...props }: FormLabelProps) {
  return (
    <label
      className={cn(
        "block text-xs font-medium text-slate-700 dark:text-slate-300",
        className
      )}
      {...props}
    >
      {children} {required && <span className="text-rose-500">*</span>}
    </label>
  );
}

interface FormErrorProps {
  message?: string;
  className?: string;
}

export function FormError({ message, className }: FormErrorProps) {
  if (!message) return null;
  return <p className={cn("text-xs text-rose-600 dark:text-rose-400 mt-1", className)}>{message}</p>;
}

interface FormHelperTextProps {
  children: React.ReactNode;
  className?: string;
}

export function FormHelperText({ children, className }: FormHelperTextProps) {
  return (
    <p className={cn("text-[11px] text-slate-500 dark:text-slate-400 mt-0.5", className)}>
      {children}
    </p>
  );
}
