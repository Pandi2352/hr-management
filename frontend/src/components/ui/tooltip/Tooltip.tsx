import { useState, useRef, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../../utils/cn";
import type { TooltipProps, TooltipPlacement } from "./tooltip.types";

export function Tooltip({
  content,
  children,
  placement = "top",
  delay = 150,
  disabled = false,
  className,
  arrow = true,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const tooltipId = useId();

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    let top = 0;
    let left = 0;
    const offset = 8;

    switch (placement) {
      case "right":
        top = rect.top + rect.height / 2;
        left = rect.right + offset;
        break;
      case "left":
        top = rect.top + rect.height / 2;
        left = rect.left - offset;
        break;
      case "bottom":
        top = rect.bottom + offset;
        left = rect.left + rect.width / 2;
        break;
      case "bottom-start":
        top = rect.bottom + offset;
        left = rect.left;
        break;
      case "bottom-end":
        top = rect.bottom + offset;
        left = rect.right;
        break;
      case "top-start":
        top = rect.top - offset;
        left = rect.left;
        break;
      case "top-end":
        top = rect.top - offset;
        left = rect.right;
        break;
      case "top":
      default:
        top = rect.top - offset;
        left = rect.left + rect.width / 2;
        break;
    }

    setCoords({ top, left });
  };

  const showTooltip = () => {
    if (disabled || !content) return;
    updatePosition();
    timerRef.current = window.setTimeout(() => {
      updatePosition();
      setIsVisible(true);
    }, delay);
  };

  const hideTooltip = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Keyboard accessibility: hide on Escape or scroll
  useEffect(() => {
    if (!isVisible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        hideTooltip();
      }
    };
    const handleScroll = () => {
      hideTooltip();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isVisible]);

  const transformMap: Record<TooltipPlacement, string> = {
    top: "-translate-x-1/2 -translate-y-full",
    "top-start": "-translate-y-full",
    "top-end": "-translate-x-full -translate-y-full",
    bottom: "-translate-x-1/2",
    "bottom-start": "",
    "bottom-end": "-translate-x-full",
    left: "-translate-x-full -translate-y-1/2",
    right: "-translate-y-1/2",
  };

  const arrowPlacementMap: Record<string, string> = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-900 dark:border-t-slate-800 border-x-transparent border-b-transparent border-t-[5px] border-x-[5px] border-b-0',
    'top-start': 'top-full left-3 border-t-slate-900 dark:border-t-slate-800 border-x-transparent border-b-transparent border-t-[5px] border-x-[5px] border-b-0',
    'top-end': 'top-full right-3 border-t-slate-900 dark:border-t-slate-800 border-x-transparent border-b-transparent border-t-[5px] border-x-[5px] border-b-0',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-900 dark:border-b-slate-800 border-x-transparent border-t-transparent border-b-[5px] border-x-[5px] border-t-0',
    'bottom-start': 'bottom-full left-3 border-b-slate-900 dark:border-b-slate-800 border-x-transparent border-t-transparent border-b-[5px] border-x-[5px] border-t-0',
    'bottom-end': 'bottom-full right-3 border-b-slate-900 dark:border-b-slate-800 border-x-transparent border-t-transparent border-b-[5px] border-x-[5px] border-t-0',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-900 dark:border-l-slate-800 border-y-transparent border-r-transparent border-l-[5px] border-y-[5px] border-r-0',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-slate-900 dark:border-r-slate-800 border-y-transparent border-l-transparent border-r-[5px] border-y-[5px] border-l-0',
  };

  return (
    <>
      <div
        ref={triggerRef}
        className="inline-flex items-center justify-center"
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        aria-describedby={isVisible ? tooltipId : undefined}
      >
        {children}
      </div>

      {isVisible &&
        createPortal(
          <div
            id={tooltipId}
            role="tooltip"
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
            }}
            className={cn(
              "pointer-events-none fixed z-9999 whitespace-nowrap rounded-md border border-slate-800/80 bg-slate-900 px-2.5 py-1 text-[11px] font-medium tracking-wide text-slate-100 shadow-lg dark:border-slate-700/80 dark:bg-slate-800 animate-in fade-in zoom-in-95 duration-150",
              transformMap[placement],
              className
            )}
          >
            {content}
            {arrow && (
              <span
                className={cn("absolute w-0 h-0 pointer-events-none", arrowPlacementMap[placement] || arrowPlacementMap.top)}
              />
            )}
          </div>,
          document.body
        )}
    </>
  );
}
