import { cn } from "../../utils/cn";

export function Loader({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeStyles = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-3",
    lg: "h-12 w-12 border-4",
  };

  return (
    <div className={cn("flex items-center justify-center p-4", className)}>
      <div
        className={cn(
          "animate-spin rounded-full border-indigo-600 border-t-transparent dark:border-indigo-400 dark:border-t-transparent",
          sizeStyles[size]
        )}
      />
    </div>
  );
}
