import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  LayoutGrid,
  Table as TableIcon,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { SearchInput } from '../ui/SearchInput';
import { Spinner } from '../ui/Spinner';
import { Pagination } from './Pagination';
import { cn } from '../../utils/cn';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T | string;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchPlaceholder?: string;
  searchKey?: keyof T | ((row: T) => string);
  statusFilterKey?: keyof T;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onAddClick?: () => void;
  addLabel?: string;
  renderCard?: (row: T) => React.ReactNode;
  enableViewToggle?: boolean;
  /**
   * Suppress the built-in search / status / view-toggle strip. Use when the page
   * supplies its own filtering — notably with server-side pagination, where the
   * built-in controls cannot filter the server's rows and would be dead UI.
   */
  hideToolbar?: boolean;
  /** Optional controlled view mode, so the switcher can live outside the table. */
  viewMode?: 'table' | 'cards';
  onViewModeChange?: (mode: 'table' | 'cards') => void;
  // Optional controlled pagination props for server-side integration
  page?: number;
  pageSize?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

export function DataTable<T extends { _id?: string; id?: string; status?: string }>({
  data,
  columns,
  searchPlaceholder = 'Search records...',
  searchKey,
  statusFilterKey = 'status' as keyof T,
  isLoading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'Get started by creating your first entry.',
  onAddClick,
  addLabel = 'Add Record',
  renderCard,
  enableViewToggle = true,
  hideToolbar = false,
  viewMode: controlledViewMode,
  onViewModeChange,
  page: controlledPage,
  pageSize: controlledPageSize,
  totalItems: controlledTotalItems,
  onPageChange: controlledOnPageChange,
  onPageSizeChange: controlledOnPageSizeChange,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [internalViewMode, setInternalViewMode] = useState<'table' | 'cards'>('table');
  const viewMode = controlledViewMode ?? internalViewMode;
  const setViewMode = (mode: 'table' | 'cards') => {
    setInternalViewMode(mode);
    onViewModeChange?.(mode);
  };
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Client-side pagination state fallback
  const [internalPage, setInternalPage] = useState<number>(1);
  const [internalPageSize, setInternalPageSize] = useState<number>(10);

  const isControlledPagination = controlledPage !== undefined && controlledOnPageChange !== undefined;

  const page = isControlledPagination ? controlledPage : internalPage;
  const pageSize = isControlledPagination ? (controlledPageSize || 10) : internalPageSize;

  const handlePageChange = (newPage: number) => {
    if (isControlledPagination) {
      controlledOnPageChange(newPage);
    } else {
      setInternalPage(newPage);
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    if (isControlledPagination && controlledOnPageSizeChange) {
      controlledOnPageSizeChange(newSize);
    } else {
      setInternalPageSize(newSize);
      setInternalPage(1);
    }
  };

  // Filter and Search (client-side fallback when not server-paginated)
  const filteredData = useMemo(() => {
    if (isControlledPagination) {
      return data;
    }

    let list = [...data];

    if (statusFilter !== 'ALL') {
      list = list.filter((item) => String(item[statusFilterKey]) === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((item) => {
        if (typeof searchKey === 'function') {
          return searchKey(item).toLowerCase().includes(q);
        }
        if (searchKey && item[searchKey]) {
          return String(item[searchKey]).toLowerCase().includes(q);
        }
        return false;
      });
    }

    if (sortField) {
      list.sort((a, b) => {
        const valA = (a as any)[sortField];
        const valB = (b as any)[sortField];
        if (valA == null) return 1;
        if (valB == null) return -1;
        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [data, search, statusFilter, statusFilterKey, searchKey, sortField, sortAsc, isControlledPagination]);

  const totalItems = isControlledPagination ? (controlledTotalItems ?? data.length) : filteredData.length;

  const paginatedData = useMemo(() => {
    if (isControlledPagination) {
      return data;
    }
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize, isControlledPagination, data]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="w-full space-y-2.5">
      {/* Toolbar: Search, Status Segments, View Mode Toggle, Add CTA */}
      <div
        className={cn(
          'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
          hideToolbar && 'hidden',
        )}
      >
        <div className="flex flex-1 items-center gap-3">
          <div className="flex-1 max-w-sm">
            <SearchInput
              value={search}
              onChange={(val) => {
                setSearch(val);
                if (!isControlledPagination) setInternalPage(1);
              }}
              onClear={() => {
                if (!isControlledPagination) setInternalPage(1);
              }}
              placeholder={searchPlaceholder}
            />
          </div>

          {/* Status Segment Filters */}
          <div className="inline-flex rounded-md border border-hairline bg-surface-2 p-0.5">
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setStatusFilter(st);
                  if (!isControlledPagination) setInternalPage(1);
                }}
                className={cn(
                  'cursor-pointer rounded-md px-2.5 py-1 text-[11.5px] font-medium transition-colors',
                  statusFilter === st
                    ? 'bg-surface font-semibold text-ink'
                    : 'text-ink-3 hover:text-ink'
                )}
              >
                {st === 'ALL' ? 'All' : st === 'ACTIVE' ? 'Active' : 'Inactive'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          {enableViewToggle && renderCard && (
            <div className="inline-flex rounded-md border border-hairline bg-surface-2 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                title="Table View"
                className={cn(
                  'cursor-pointer rounded-md p-1.5 transition-colors',
                  viewMode === 'table'
                    ? 'bg-surface text-ink'
                    : 'text-ink-3 hover:text-ink-2'
                )}
              >
                <TableIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                title="Card View"
                className={cn(
                  'cursor-pointer rounded-md p-1.5 transition-colors',
                  viewMode === 'cards'
                    ? 'bg-surface text-ink'
                    : 'text-ink-3 hover:text-ink-2'
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          )}

          {onAddClick && (
            <Button size="sm" onClick={onAddClick} className="whitespace-nowrap">
              {addLabel}
            </Button>
          )}
        </div>
      </div>

      {/* Loading State with Central Spinner */}
      {isLoading ? (
        <div className="flex w-full flex-col items-center justify-center gap-3 rounded-md border border-hairline bg-surface p-12">
          <Spinner size="lg" variant="violet" />
          <p className="animate-pulse text-xs font-medium text-ink-3">
            Loading data records...
          </p>
        </div>
      ) : paginatedData.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-hairline bg-surface p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-surface-2 text-ink-3">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-ink">
            {search.trim() ? `No matches for "${search}"` : emptyTitle}
          </h3>
          <p className="mt-1 max-w-sm text-xs text-ink-3">
            {search.trim()
              ? 'Try adjusting your search criteria or filters.'
              : emptyDescription}
          </p>
          {onAddClick && !search.trim() && (
            <div className="mt-4">
              <Button size="sm" onClick={onAddClick}>
                {addLabel}
              </Button>
            </div>
          )}
        </div>
      ) : viewMode === 'cards' && renderCard ? (
        /* Grid Card View */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {paginatedData.map((item) => (
            <React.Fragment key={item._id || item.id}>
              {renderCard(item)}
            </React.Fragment>
          ))}
        </div>
      ) : (
        /* Responsive Table View */
        <div className="overflow-hidden rounded-md border border-hairline bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-hairline bg-surface-2 text-[10.5px] font-medium uppercase tracking-[0.06em] text-ink-3">
                  <th
                    scope="col"
                    className="w-10 select-none px-3 py-2 text-right font-medium tabular-nums"
                  >
                    #
                  </th>
                  {columns.map((col, idx) => (
                    <th
                      key={idx}
                      scope="col"
                      className={cn('select-none px-3 py-2 font-medium whitespace-nowrap', col.className)}
                    >
                      {col.sortable && col.accessorKey ? (
                        <button
                          type="button"
                          onClick={() => handleSort(String(col.accessorKey))}
                          className="flex cursor-pointer items-center gap-1 transition-colors hover:text-ink"
                        >
                          <span>{col.header}</span>
                          <ArrowUpDown className="h-3 w-3 opacity-60" />
                        </button>
                      ) : (
                        col.header
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {paginatedData.map((row, rowIdx) => (
                  <tr
                    key={row._id || row.id || rowIdx}
                    className="group transition-colors hover:bg-surface-2"
                  >
                    <td className="px-3 py-2 text-right align-middle text-[11px] tabular-nums text-ink-3">
                      {(page - 1) * pageSize + rowIdx + 1}
                    </td>
                    {columns.map((col, colIdx) => (
                      <td
                        key={colIdx}
                        className={cn(
                          'px-3 py-2 align-middle text-[12.5px] text-ink-2',
                          col.className
                        )}
                      >
                        {col.cell
                          ? col.cell(row)
                          : col.accessorKey
                          ? String((row as any)[col.accessorKey] ?? '—')
                          : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Production-Grade Reusable Pagination */}
      {totalItems > 0 && (
        <div className="pt-2">
          <Pagination
            page={page}
            pageSize={pageSize}
            totalItems={totalItems}
            pageSizeOptions={[10, 25, 50, 100]}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            loading={isLoading}
          />
        </div>
      )}
    </div>
  );
}
