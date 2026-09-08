import React, { useState, useMemo } from 'react';
import {
  Download,
  MoreHorizontal,
  ArrowUpDown,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Eye,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { SelectField } from '../../../components/ui/SelectField';
import { SearchInput } from '../../../components/ui/SearchInput';
import { Pagination } from '../../../components/data-table/Pagination';
import type { LeaveRecord, LeaveStatus, LeaveType } from '../types/leave.types';

interface EmployeeLeaveTableProps {
  records: LeaveRecord[];
  onDownloadReport?: () => void;
  onViewRecord?: (record: LeaveRecord) => void;
  onStatusChange?: (recordId: string, newStatus: LeaveStatus) => void;
}

export const EmployeeLeaveTable: React.FC<EmployeeLeaveTableProps> = ({
  records,
  onDownloadReport,
  onViewRecord,
  onStatusChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState('2024');
  const [leaveTypeFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [activeStatusDropdownId, setActiveStatusDropdownId] = useState<string | null>(null);
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch =
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.leaveType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.status.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = leaveTypeFilter === 'ALL' || r.leaveType === leaveTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [records, searchQuery, leaveTypeFilter]);

  // Pagination
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  // Leave Type Color Styling
  const getLeaveTypeStyle = (type: LeaveType) => {
    switch (type) {
      case 'Casual Leave':
        return 'text-emerald-600 dark:text-emerald-400 font-medium';
      case 'Maternity Leave':
      case 'Paternity Leave':
        return 'text-purple-600 dark:text-purple-400 font-medium';
      case 'Sick Leave':
        return 'text-amber-600 dark:text-amber-400 font-medium';
      case 'Annual Leave':
        return 'text-blue-600 dark:text-blue-400 font-medium';
      default:
        return 'text-slate-700 dark:text-slate-300 font-medium';
    }
  };

  // Status badge styling
  const getStatusBadge = (status: LeaveStatus) => {
    switch (status) {
      case 'New':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60';
      case 'Approved':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60';
      case 'Rejected':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60';
      case 'Pending':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60';
    }
  };

  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
      {/* Header with Search and Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Employee's Leave
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Overview of applied leaves, statuses, and scheduled workforce absences.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="w-full sm:w-56">
            <SearchInput
              value={searchQuery}
              onChange={(val) => {
                setSearchQuery(val);
                setCurrentPage(1);
              }}
              onClear={() => setSearchQuery('')}
              placeholder="Search..."
              className="h-9"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onDownloadReport}
            className="h-9 gap-1.5 shrink-0"
          >
            <Download className="h-4 w-4 text-slate-500" />
            <span>Download Report</span>
          </Button>

          <div className="w-24 shrink-0">
            <SelectField
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              options={[
                { label: '2024', value: '2024' },
                { label: '2023', value: '2023' },
              ]}
              className="h-9"
            />
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 select-none">
            <tr>
              <th className="py-3 px-4">
                <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 dark:hover:text-white">
                  <span>Name</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-4">
                <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 dark:hover:text-white">
                  <span>Leave Type</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-4">
                <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 dark:hover:text-white">
                  <span>Department</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-4">
                <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 dark:hover:text-white">
                  <span>Days</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-4">
                <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 dark:hover:text-white">
                  <span>Start</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-4">
                <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 dark:hover:text-white">
                  <span>End</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-4">
                <div className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 dark:hover:text-white">
                  <span>Status</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-4 text-right">
                <div className="flex items-center justify-end gap-1.5 cursor-pointer hover:text-slate-900 dark:hover:text-white">
                  <span>Action</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  No employee leave records found matching your filters.
                </td>
              </tr>
            ) : (
              paginatedRecords.map((record) => (
                <tr
                  key={record.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* Name with Avatar */}
                  <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={record.avatarUrl}
                        alt={record.name}
                        className="h-8 w-8 rounded-md object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                      />
                      <span className="font-semibold">{record.name}</span>
                    </div>
                  </td>

                  {/* Leave Type */}
                  <td className="py-3.5 px-4">
                    <span className={getLeaveTypeStyle(record.leaveType)}>
                      {record.leaveType}
                    </span>
                  </td>

                  {/* Department */}
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                    {record.department}
                  </td>

                  {/* Days */}
                  <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                    {record.days}
                  </td>

                  {/* Start Date */}
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                    {record.startDate}
                  </td>

                  {/* End Date */}
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                    {record.endDate}
                  </td>

                  {/* Status Pill with Dropdown */}
                  <td className="py-3.5 px-4">
                    <div className="relative inline-block text-left">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveStatusDropdownId(
                            activeStatusDropdownId === record.id ? null : record.id
                          )
                        }
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors ${getStatusBadge(
                          record.status
                        )}`}
                      >
                        <span>{record.status}</span>
                        <ChevronDown className="h-3 w-3 opacity-70" />
                      </button>

                      {/* Status Change Popover */}
                      {activeStatusDropdownId === record.id && (
                        <>
                          <div
                            className="fixed inset-0 z-20"
                            onClick={() => setActiveStatusDropdownId(null)}
                          />
                          <div className="absolute left-0 mt-1 w-32 rounded-md bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-30">
                            {(['New', 'Approved', 'Pending', 'Rejected'] as LeaveStatus[]).map(
                              (statusOption) => (
                                <button
                                  key={statusOption}
                                  type="button"
                                  onClick={() => {
                                    onStatusChange?.(record.id, statusOption);
                                    setActiveStatusDropdownId(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-between"
                                >
                                  <span>{statusOption}</span>
                                  {record.status === statusOption && (
                                    <CheckCircle2 className="h-3 w-3 text-violet-600 dark:text-violet-400" />
                                  )}
                                </button>
                              )
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </td>

                  {/* Action */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="relative inline-block text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveActionMenuId(
                            activeActionMenuId === record.id ? null : record.id
                          )
                        }
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>

                      {activeActionMenuId === record.id && (
                        <>
                          <div
                            className="fixed inset-0 z-20"
                            onClick={() => setActiveActionMenuId(null)}
                          />
                          <div className="absolute right-0 mt-1 w-36 rounded-md bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-30">
                            <button
                              type="button"
                              onClick={() => {
                                onViewRecord?.(record);
                                setActiveActionMenuId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-2"
                            >
                              <Eye className="h-3.5 w-3.5 text-slate-400" />
                              View Details
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onStatusChange?.(record.id, 'Approved');
                                setActiveActionMenuId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 text-emerald-600 dark:text-emerald-400 flex items-center gap-2"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onStatusChange?.(record.id, 'Rejected');
                                setActiveActionMenuId(null);
                              }}
                              className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 text-rose-600 dark:text-rose-400 flex items-center gap-2"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reject
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800">
        <Pagination
          page={currentPage}
          totalItems={filteredRecords.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[6, 10, 20]}
        />
      </div>
    </div>
  );
};
