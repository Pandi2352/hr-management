import React, { useState, useMemo } from 'react';
import {
  Download,
  MoreHorizontal,
  ArrowUpDown,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { SelectField } from '../../../components/ui/SelectField';
import { SearchInput } from '../../../components/ui/SearchInput';
import { Pagination } from '../../../components/data-table/Pagination';
import type { PayrollRecord, PayrollStatus } from '../types/payroll.types';

interface PayrollListTableProps {
  records: PayrollRecord[];
  onDownloadReport?: () => void;
  onViewRecord?: (record: PayrollRecord) => void;
}

export const PayrollListTable: React.FC<PayrollListTableProps> = ({
  records,
  onDownloadReport,
  onViewRecord,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState('2024');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const filteredRecords = useMemo(() => {
    return records.filter(
      (r) =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.status.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [records, searchQuery]);

  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedRecords.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedRecords.map((r) => r.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const getStatusPill = (status: PayrollStatus) => {
    switch (status) {
      case 'Completed':
        return 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60';
      case 'Reject':
        return 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60';
      case 'Pending':
        return 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
      {/* Table Header Bar */}
      <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Payroll List</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Individual salary disbursement schedules, overtime allowances & settlement statuses
          </p>
        </div>

        {/* Right Controls: SearchInput, Download Button, Year SelectField */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-48 sm:w-60">
            <SearchInput
              value={searchQuery}
              onChange={(val) => {
                setSearchQuery(val);
                setCurrentPage(1);
              }}
              onClear={() => {
                setSearchQuery('');
                setCurrentPage(1);
              }}
              placeholder="Search..."
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onDownloadReport}
            className="h-9 rounded-md text-xs font-semibold border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-xs shrink-0"
          >
            <Download className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
            Download Report
          </Button>

          <div className="w-28 shrink-0">
            <SelectField
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              options={[
                { value: '2024', label: '2024' },
                { value: '2025', label: '2025' },
                { value: '2026', label: '2026' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs min-w-[850px]">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
              <th scope="col" className="py-3 px-4 w-10 text-center">
                <input
                  type="checkbox"
                  checked={
                    paginatedRecords.length > 0 &&
                    selectedIds.length === paginatedRecords.length
                  }
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
                />
              </th>
              <th scope="col" className="py-3 px-4">
                <div className="flex items-center gap-1.5 cursor-pointer select-none">
                  <span>Name</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th scope="col" className="py-3 px-4">
                <div className="flex items-center gap-1.5 cursor-pointer select-none">
                  <span>Department</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th scope="col" className="py-3 px-4">
                <div className="flex items-center gap-1.5 cursor-pointer select-none">
                  <span>Total Days</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th scope="col" className="py-3 px-4">
                <div className="flex items-center gap-1.5 cursor-pointer select-none">
                  <span>Working Day</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th scope="col" className="py-3 px-4">
                <div className="flex items-center gap-1.5 cursor-pointer select-none">
                  <span>Total Salary</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th scope="col" className="py-3 px-4">
                <div className="flex items-center gap-1.5 cursor-pointer select-none">
                  <span>Over Time</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th scope="col" className="py-3 px-4">
                <div className="flex items-center gap-1.5 cursor-pointer select-none">
                  <span>Status</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th scope="col" className="py-3 px-4 text-center w-20">
                <div className="flex items-center justify-center gap-1.5 cursor-pointer select-none">
                  <span>Action</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-400">
                  No payroll records match your search query.
                </td>
              </tr>
            ) : (
              paginatedRecords.map((row) => {
                const isSelected = selectedIds.includes(row.id);

                return (
                  <tr
                    key={row.id}
                    className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${
                      isSelected ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(row.id)}
                        className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-0 cursor-pointer"
                      />
                    </td>

                    {/* Employee Identity with Avatar */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        {row.avatarUrl ? (
                          <img
                            src={row.avatarUrl}
                            alt={row.name}
                            className="h-8 w-8 rounded-md object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-md bg-slate-100 dark:bg-slate-800 font-bold text-xs flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                            {row.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </div>
                        )}
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {row.name}
                        </span>
                      </div>
                    </td>

                    {/* Department / Role */}
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {row.department}
                    </td>

                    {/* Total Days */}
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 tabular-nums">
                      {row.totalDays} Days
                    </td>

                    {/* Working Days */}
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 tabular-nums">
                      {row.workingDays} Days
                    </td>

                    {/* Total Salary */}
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                      ${row.totalSalary.toLocaleString()}
                    </td>

                    {/* Over Time */}
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 tabular-nums">
                      ${row.overTime.toLocaleString()}
                    </td>

                    {/* Status Pill Badge */}
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-md text-xs font-semibold border text-center min-w-[84px] ${getStatusPill(
                          row.status
                        )}`}
                      >
                        {row.status}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => onViewRecord && onViewRecord(row)}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Payroll Details"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Standard Reusable Pagination Component */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800">
        <Pagination
          page={currentPage}
          pageSize={pageSize}
          totalItems={filteredRecords.length}
          pageSizeOptions={[5, 10, 20]}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </div>
    </div>
  );
};
