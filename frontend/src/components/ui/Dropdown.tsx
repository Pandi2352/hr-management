import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { cn } from "../../utils/cn";

export interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right";
  placement?: "auto" | "top" | "bottom";
  className?: string;
}

export function Dropdown({
  trigger,
  children,
  align = "right",
  placement = "auto",
  className,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [effectivePlacement, setEffectivePlacement] = useState<"top" | "bottom">("bottom");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let targetPlacement: "top" | "bottom" = "bottom";
    if (placement === "top") {
      targetPlacement = "top";
    } else if (placement === "bottom") {
      targetPlacement = "bottom";
    } else {
      // Auto: if space below is tight (< 220px) and space above is greater, open above
      targetPlacement = spaceBelow < 220 && spaceAbove > spaceBelow ? "top" : "bottom";
    }
    setEffectivePlacement(targetPlacement);
  }, [placement]);

  useLayoutEffect(() => {
    if (open) {
      calculatePosition();
    }
  }, [open, calculatePosition]);

  useEffect(() => {
    if (!open) return;
    const handleWindowChange = () => {
      calculatePosition();
    };
    window.addEventListener("resize", handleWindowChange);
    window.addEventListener("scroll", handleWindowChange, true);
    return () => {
      window.removeEventListener("resize", handleWindowChange);
      window.removeEventListener("scroll", handleWindowChange, true);
    };
  }, [open, calculatePosition]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleToggle = () => {
    if (!open) {
      calculatePosition();
    }
    setOpen(!open);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div ref={triggerRef} onClick={handleToggle} className="cursor-pointer">
        {trigger}
      </div>
      {open && (
        <div
          onClick={() => setOpen(false)}
          className={cn(
            "absolute z-40 min-w-48 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl transition-all dark:border-slate-800 dark:bg-slate-900",
            effectivePlacement === "top"
              ? "bottom-full mb-2 origin-bottom animate-in fade-in slide-in-from-bottom-2"
              : "top-full mt-2 origin-top animate-in fade-in slide-in-from-top-2",
            align === "right" ? "right-0" : "left-0",
            className
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

