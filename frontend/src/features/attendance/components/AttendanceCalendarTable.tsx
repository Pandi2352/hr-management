import React, { useState, useMemo } from 'react';
import {
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpDown,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { SelectField } from '../../../components/ui/SelectField';
import { SearchInput } from '../../../components/ui/SearchInput';
import { Pagination } from '../../../components/data-table/Pagination';
import type { EmployeeAttendanceRow, DayRecord } from '../types/attendance.types';

interface AttendanceCalendarTableProps {
  employees: EmployeeAttendanceRow[];
  onDownloadReport?: () => void;
}

export const AttendanceCalendarTable: React.FC<AttendanceCalendarTableProps> = ({
  employees,
  onDownloadReport,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState('2024');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Days in month: 31 for March
  const totalDays = 31;
  const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);

  // Filter and sort
  const filteredEmployees = useMemo(() => {
    let list = employees.filter(
      (emp) =>
        emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    list.sort((a, b) => {
      const cmp = a.name.localeCompare(b.name);
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [employees, searchQuery, sortOrder]);

  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const toggleSort = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
      {/* Table Header Bar */}
      <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Employee Attendance</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Daily clock-in logs, punctuality records & monthly leave audit
          </p>
        </div>

        {/* Right Controls: Common SearchInput, Download Button, Year SelectField */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Common SearchInput */}
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

          {/* Download Report Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onDownloadReport}
            className="h-9 rounded-md text-xs font-semibold border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-xs shrink-0"
          >
            <Download className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
            Download Report
          </Button>

          {/* Common SelectField */}
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

      {/* Grid Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left min-w-[950px]">
          {/* Table Head */}
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold">
              <th
                scope="col"
                className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200 sticky left-0 bg-slate-50/95 dark:bg-slate-800/95 backdrop-blur-xs z-10 w-56 cursor-pointer select-none"
                onClick={toggleSort}
              >
                <div className="flex items-center gap-1.5">
                  <span>Employee Name</span>
                  <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>

              {/* Day Columns 1 to 31 */}
              {daysArray.map((day) => (
                <th
                  key={day}
                  scope="col"
                  className="py-3 px-1.5 text-center font-medium text-[11px] text-slate-500 dark:text-slate-400 min-w-[28px]"
                >
                  {day}
                </th>
              ))}

              {/* Leave Column */}
              <th
                scope="col"
                className="py-3 px-4 text-center font-semibold text-slate-800 dark:text-slate-200 w-24 whitespace-nowrap"
              >
                Leave
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {paginatedEmployees.length === 0 ? (
              <tr>
                <td colSpan={totalDays + 2} className="py-12 text-center text-xs text-slate-400">
                  No employee records matched your search criteria.
                </td>
              </tr>
            ) : (
              paginatedEmployees.map((employee) => (
                <tr
                  key={employee.id}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                >
                  {/* Column 1: Employee Avatar & Name */}
                  <td className="py-3 px-4 sticky left-0 bg-white/95 dark:bg-slate-900/95 group-hover:bg-slate-50/95 dark:group-hover:bg-slate-800/95 backdrop-blur-xs z-10 shadow-[1px_0_3px_rgba(0,0,0,0.03)] dark:shadow-[1px_0_3px_rgba(0,0,0,0.2)]">
                    <div className="flex items-center gap-2.5">
                      {employee.avatarUrl ? (
                        <img
                          src={employee.avatarUrl}
                          alt={employee.name}
                          className="h-8 w-8 rounded-md object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                          {employee.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {employee.name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {employee.role}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Day Status Icons 1 to 31 */}
                  {daysArray.map((day) => {
                    const record: DayRecord | undefined = employee.records[day];
                    const status = record?.status ?? 'PRESENT';

                    return (
                      <td key={day} className="py-3 px-1 text-center align-middle">
                        <div className="flex items-center justify-center">
                          {status === 'PRESENT' && (
                            <div
                              title={`Day ${day}: On Time · ${record?.checkIn || '09:00 AM'} - ${record?.checkOut || '05:30 PM'}`}
                              className="cursor-pointer group/icon"
                            >
                              <CheckCircle2 className="h-4 w-4 text-blue-500 hover:scale-110 transition-transform stroke-[2]" />
                            </div>
                          )}

                          {status === 'ABSENT' && (
                            <div
                              title={`Day ${day}: Absent · ${record?.notes || 'Unexcused'}`}
                              className="cursor-pointer group/icon"
                            >
                              <XCircle className="h-4 w-4 text-rose-500 hover:scale-110 transition-transform stroke-[2]" />
                            </div>
                          )}

                          {status === 'LATE' && (
                            <div
                              title={`Day ${day}: Late Arrival · ${record?.checkIn || '09:45 AM'}`}
                              className="cursor-pointer group/icon"
                            >
                              <Clock className="h-4 w-4 text-amber-500 hover:scale-110 transition-transform stroke-[2]" />
                            </div>
                          )}

                          {status === 'WEEKEND' && (
                            <div
                              title={`Day ${day}: Weekend`}
                              className="h-1.5 w-1.5 rounded-full bg-slate-200 dark:bg-slate-700 mx-auto"
                            />
                          )}
                        </div>
                      </td>
                    );
                  })}

                  {/* Leave Days Count */}
                  <td className="py-3 px-4 text-center align-middle whitespace-nowrap">
                    <span
                      className={`inline-block text-xs font-bold ${
                        employee.leaveDays > 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {employee.leaveDays} Day
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer using common reusable Pagination component */}
      <div className="p-3 border-t border-slate-100 dark:border-slate-800">
        <Pagination
          page={currentPage}
          pageSize={pageSize}
          totalItems={filteredEmployees.length}
          pageSizeOptions={[8, 16, 24, 32]}
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
