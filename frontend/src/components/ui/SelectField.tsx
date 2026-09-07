import React, { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  disabled?: boolean;
}

export interface SelectFieldProps {
  label?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: { target: { value: string; name?: string } }) => void;
  name?: string;
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  clearable?: boolean;
  searchable?: boolean; // Enable live searchable filter
  placement?: 'auto' | 'top' | 'bottom'; // Smart positioning mode
  align?: 'auto' | 'left' | 'right';
}

export const SelectField: React.FC<SelectFieldProps> = ({
  label,
  value: controlledValue,
  defaultValue = '',
  onChange,
  name,
  options,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Search options...',
  error,
  helperText,
  required = false,
  disabled = false,
  className,
  clearable = false,
  searchable = true, // Default to searchable for enterprise-grade UX
  placement = 'auto',
  align = 'auto',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [effectivePlacement, setEffectivePlacement] = useState<'top' | 'bottom'>('bottom');
  const [effectiveAlign, setEffectiveAlign] = useState<'left' | 'right'>('left');
  const [maxListHeight, setMaxListHeight] = useState<number>(224);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerWrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isControlled = controlledValue !== undefined;
  const currentValue = isControlled ? controlledValue : internalValue;

  const selectedOption = options.find((opt) => opt.value === currentValue);

  // Dynamic positioning calculation: determines whether options open on top or bottom
  const calculatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Minimum required comfortable space below (search box + padding + minimum 3 options ~ 250px)
    const minRequiredBelow = 260;

    let targetPlacement: 'top' | 'bottom' = 'bottom';
    if (placement === 'top') {
      targetPlacement = 'top';
    } else if (placement === 'bottom') {
      targetPlacement = 'bottom';
    } else {
      // 'auto' placement: if space below is limited and space above is greater, open on TOP
      targetPlacement = (spaceBelow < minRequiredBelow && spaceAbove > spaceBelow) ? 'top' : 'bottom';
    }
    setEffectivePlacement(targetPlacement);

    // Dynamic max-height for the options list so it never bleeds beyond the viewport
    const availableVerticalSpace = targetPlacement === 'top' ? spaceAbove : spaceBelow;
    const chromeHeight = (searchable && options.length > 4 ? 46 : 0) + (placeholder ? 34 : 0) + 16;
    const dynamicListHeight = Math.max(100, Math.min(224, availableVerticalSpace - chromeHeight - 16));
    setMaxListHeight(dynamicListHeight);

    // Horizontal alignment
    if (align === 'right') {
      setEffectiveAlign('right');
    } else if (align === 'left') {
      setEffectiveAlign('left');
    } else {
      // 'auto' horizontal alignment: check if opening left-aligned would cause right-overflow
      const spaceRight = window.innerWidth - rect.left;
      setEffectiveAlign(spaceRight < 220 && rect.right >= 200 ? 'right' : 'left');
    }
  }, [placement, align, searchable, options.length, placeholder]);

  // Filter options dynamically based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(q))
    );
  }, [options, searchQuery]);

  // Calculate position immediately when opening and attach listeners
  useLayoutEffect(() => {
    if (isOpen) {
      calculatePosition();
    }
  }, [isOpen, calculatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handleWindowChange = () => {
      calculatePosition();
    };

    window.addEventListener('resize', handleWindowChange);
    window.addEventListener('scroll', handleWindowChange, true);
    return () => {
      window.removeEventListener('resize', handleWindowChange);
      window.removeEventListener('scroll', handleWindowChange, true);
    };
  }, [isOpen, calculatePosition]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen) {
      calculatePosition();
    }
    setIsOpen(!isOpen);
  };

  const handleSelect = (val: string) => {
    if (!isControlled) {
      setInternalValue(val);
    }
    if (onChange) {
      const eventPayload: any = {
        target: { value: val, name },
        currentTarget: { value: val, name },
        value: val,
        toString: () => val,
        valueOf: () => val,
      };
      onChange(eventPayload);
    }
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleSelect('');
  };

  return (
    <div className={cn('w-full space-y-1', className)} ref={containerRef}>
      {label && (
        <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-500">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Relative wrapper holding the trigger button and auto-flipping popover */}
      <div className="relative" ref={triggerWrapperRef}>
        {/* Trigger Button */}
        <button
          ref={buttonRef}
          type="button"
          disabled={disabled}
          onClick={handleToggle}
          className={cn(
            'w-full h-9 rounded-md border bg-white px-3 text-xs flex items-center justify-between transition-all text-left cursor-pointer select-none',
            disabled && 'cursor-not-allowed bg-slate-100 opacity-60 dark:bg-slate-800',
            error
              ? 'border-rose-300 dark:border-rose-500/50'
              : isOpen
              ? 'border-violet-400 dark:border-violet-400 ring-0 outline-none'
              : 'border-slate-300 hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-700'
          )}
        >
          <span
            className={cn(
              'truncate',
              selectedOption
                ? 'text-slate-900 font-medium dark:text-slate-100'
                : 'text-slate-400 dark:text-slate-500'
            )}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>

          <div className="flex items-center gap-1 shrink-0 ml-2 text-slate-400">
            {clearable && currentValue && !disabled && (
              <span
                onClick={handleClear}
                className="p-0.5 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 transition-transform duration-150',
                isOpen && (effectivePlacement === 'top' ? '-rotate-180' : 'rotate-180')
              )}
            />
          </div>
        </button>

        {/* Popover Options Menu: Auto-placed on TOP or BOTTOM based on viewport space */}
        {isOpen && (
          <div
            ref={menuRef}
            className={cn(
              'absolute z-50 w-full min-w-[200px] rounded-md border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden',
              effectivePlacement === 'top'
                ? 'bottom-full mb-1.5 origin-bottom animate-in fade-in slide-in-from-bottom-2'
                : 'top-full mt-1.5 origin-top animate-in fade-in slide-in-from-top-2',
              effectiveAlign === 'right' ? 'right-0' : 'left-0'
            )}
          >
            {/* Search Box */}
            {searchable && options.length > 4 && (
              <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                <div className="relative flex items-center">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full h-7 pl-8 pr-6 text-xs rounded border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:border-violet-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:focus:border-violet-400"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Options List with Dynamic Max-Height & Custom Scrollbar */}
            <div
              style={{ maxHeight: `${maxListHeight}px` }}
              className="overflow-y-auto custom-scrollbar py-1"
            >
              {placeholder && !searchQuery && (
                <div
                  onClick={() => handleSelect('')}
                  className={cn(
                    'px-3 py-1.5 text-xs cursor-pointer flex items-center justify-between text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60',
                    !currentValue && 'bg-violet-50/70 font-semibold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300'
                  )}
                >
                  <span>{placeholder}</span>
                  {!currentValue && <Check className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />}
                </div>
              )}

              {filteredOptions.length === 0 ? (
                <div className="px-3 py-3 text-xs text-slate-400 text-center italic">
                  No matching results found
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = opt.value === currentValue;
                  return (
                    <div
                      key={opt.value}
                      onClick={() => !opt.disabled && handleSelect(opt.value)}
                      className={cn(
                        'px-3 py-2 text-xs flex items-center justify-between transition-colors',
                        opt.disabled
                          ? 'cursor-not-allowed opacity-40 text-slate-400'
                          : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60',
                        isSelected
                          ? 'bg-violet-50/70 font-semibold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300'
                          : 'text-slate-800 dark:text-slate-200'
                      )}
                    >
                      <div className="truncate">
                        <p className="truncate leading-tight">{opt.label}</p>
                        {opt.sublabel && (
                          <span className="text-[10px] text-slate-400 block mt-0.5">{opt.sublabel}</span>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 shrink-0 text-violet-600 dark:text-violet-400 ml-2" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {error ? (
        <p className="text-[11px] font-medium text-rose-500">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-slate-400">{helperText}</p>
      ) : null}
    </div>
  );
};

