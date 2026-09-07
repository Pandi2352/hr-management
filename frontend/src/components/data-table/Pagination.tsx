import { useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { SelectField } from '../ui/SelectField';
import type { PaginationProps } from '../../types/pagination.types';

export function Pagination({
  page,
  pageSize,
  totalItems,
  pageSizeOptions = [10, 25, 50, 100],
  onPageChange,
  onPageSizeChange,
  disabled = false,
  loading = false,
}: PaginationProps) {
  const totalPages = Math.ceil(totalItems / pageSize) || 0;
  const isZeroRecords = totalItems === 0;

  // Safe valid page boundaries
  const currentPage = isZeroRecords ? 1 : Math.min(Math.max(1, page), Math.max(1, totalPages));

  // Calculate start & end record index
  const startRecord = isZeroRecords ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = isZeroRecords ? 0 : Math.min(currentPage * pageSize, totalItems);

  // Generate responsive pagination page range with ellipses
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | '...')[] = [];

    if (currentPage <= 4) {
      // Near beginning: 1 2 3 4 5 ... 10
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push('...');
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 3) {
      // Near end: 1 ... 6 7 8 9 10
      pages.push(1);
      pages.push('...');
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      // In middle: 1 ... 4 5 6 ... 10
      pages.push(1);
      pages.push('...');
      pages.push(currentPage - 1);
      pages.push(currentPage);
      pages.push(currentPage + 1);
      pages.push('...');
      pages.push(totalPages);
    }

    return pages;
  }, [currentPage, totalPages]);

  const canGoPrev = !disabled && !loading && currentPage > 1;
  const canGoNext = !disabled && !loading && currentPage < totalPages;

  return (
    <nav
      aria-label="Pagination Navigation"
      className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-1 text-xs text-slate-600 dark:text-slate-400 select-none"
    >
      {/* Left: Result Counter & Page Size Selector */}
      <div className="flex flex-wrap items-center gap-4">
        <span className="font-medium text-slate-700 dark:text-slate-300">
          Showing <strong className="text-slate-900 dark:text-slate-100">{startRecord}</strong>–
          <strong className="text-slate-900 dark:text-slate-100">{endRecord}</strong> of{' '}
          <strong className="text-slate-900 dark:text-slate-100">{totalItems}</strong>
        </span>

        {pageSizeOptions && pageSizeOptions.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 whitespace-nowrap">Rows:</span>
            <div className="w-20">
              <SelectField
                value={String(pageSize)}
                disabled={disabled || loading}
                onChange={(e) => {
                  const newSize = Number(e.target.value);
                  onPageSizeChange(newSize);
                  onPageChange(1); // Reset to page 1
                }}
                options={pageSizeOptions.map((opt) => ({
                  value: String(opt),
                  label: String(opt),
                }))}
              />
            </div>
          </div>
        )}
      </div>

      {/* Right: Navigation Controls with Page Numbers */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={!canGoPrev}
          aria-label="Go to first page"
          title="First page"
          className="hidden sm:flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 cursor-pointer disabled:cursor-not-allowed"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canGoPrev}
          aria-label="Go to previous page"
          className="flex h-8 items-center gap-1 px-2.5 rounded-md border border-slate-200 bg-white font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 cursor-pointer disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        {/* Page Numbers (Desktop) */}
        <div className="hidden sm:flex items-center gap-1 mx-1">
          {pageNumbers.map((p, idx) =>
            p === '...' ? (
              <span key={`ellipsis-${idx}`} className="px-1.5 text-slate-400 select-none">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p as number)}
                disabled={disabled || loading}
                aria-current={currentPage === p ? 'page' : undefined}
                className={`h-8 min-w-[32px] px-2 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
                  currentPage === p
                    ? 'bg-[var(--primary)] text-white shadow-xs border-[var(--primary)]'
                    : 'border border-transparent hover:bg-slate-100 text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900'
                }`}
              >
                {p}
              </button>
            )
          )}
        </div>

        {/* Mobile Current Page Indicator */}
        <div className="flex sm:hidden items-center px-2 font-medium text-slate-700 dark:text-slate-300">
          Page {currentPage} of {Math.max(1, totalPages)}
        </div>

        {/* Next Page */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canGoNext}
          aria-label="Go to next page"
          className="flex h-8 items-center gap-1 px-2.5 rounded-md border border-slate-200 bg-white font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 cursor-pointer disabled:cursor-not-allowed"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={!canGoNext}
          aria-label="Go to last page"
          title="Last page"
          className="hidden sm:flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 cursor-pointer disabled:cursor-not-allowed"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
