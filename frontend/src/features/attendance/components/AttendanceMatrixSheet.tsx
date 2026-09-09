import { useState, useMemo } from 'react';
import {
  Search,
  Download,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  Palmtree,
  Minus,
  Calendar,
  X,
  ArrowUpDown,
} from 'lucide-react';

export interface DayStatusInfo {
  status: 'ON_TIME' | 'LATE' | 'HALF_DAY' | 'ABSENT' | 'LEAVE' | 'WEEKEND' | 'FUTURE';
  checkIn?: string;
  checkOut?: string;
  workMinutes?: number;
  isHalfDay?: boolean;
  isLate?: boolean;
  note?: string;
}

export interface SheetEmployee {
  employeeId: string;
  employeeCode: string;
  name: string;
  avatarUrl?: string | null;
  department?: string;
  designation?: string;
  workType?: string;
  halfDaysCount?: number;
  leaveDaysCount: number;
  days: Record<number, DayStatusInfo>;
}

interface Props {
  employees: SheetEmployee[];
  daysInMonth: number;
  month: string; // YYYY-MM
  departments: Array<{ _id: string; name: string }>;
  onMonthChange: (month: string) => void;
  onRecordManualClick?: () => void;
  isLoading?: boolean;
}

export function AttendanceMatrixSheet({
  employees,
  daysInMonth,
  month,
  departments,
  onMonthChange,
  onRecordManualClick,
  isLoading,
}: Props) {
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedCell, setSelectedCell] = useState<{
    employee: SheetEmployee;
    day: number;
    info: DayStatusInfo;
  } | null>(null);

  // Generate day numbers array: [1, 2, ..., daysInMonth]
  const dayNumbers = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  // Filter and sort employees
  const filteredEmployees = useMemo(() => {
    let result = [...employees];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.employeeCode.toLowerCase().includes(q) ||
          (e.department && e.department.toLowerCase().includes(q))
      );
    }

    if (selectedDept) {
      result = result.filter((e) => e.department === selectedDept);
    }

    result.sort((a, b) => {
      const cmp = a.name.localeCompare(b.name);
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [employees, search, selectedDept, sortAsc]);

  // CSV Report Exporter
  const handleDownloadCsv = () => {
    const headers = ['Employee Code', 'Employee Name', 'Department', 'Work Type'];
    for (let d = 1; d <= daysInMonth; d++) {
      headers.push(`Day ${d}`);
    }
    headers.push('Half Days', 'Total Leave Days');

    const rows = filteredEmployees.map((emp) => {
      const row = [
        `"${emp.employeeCode}"`,
        `"${emp.name.replace(/"/g, '""')}"`,
        `"${(emp.department || '').replace(/"/g, '""')}"`,
        `"${emp.workType || 'Onsite'}"`,
      ];

      for (let d = 1; d <= daysInMonth; d++) {
        const info = emp.days[d];
        if (!info) {
          row.push('""');
        } else if (info.status === 'ON_TIME') {
          row.push(`"On Time (${info.checkIn || ''} - ${info.checkOut || ''})"`);
        } else if (info.status === 'LATE') {
          row.push(`"Late (${info.checkIn || ''} - ${info.checkOut || ''})"`);
        } else if (info.status === 'HALF_DAY') {
          const hoursStr = info.workMinutes ? ` ${Math.floor(info.workMinutes / 60)}h ${info.workMinutes % 60}m` : '';
          row.push(`"Half Day (${info.checkIn || ''} - ${info.checkOut || ''}${hoursStr})"`);
        } else if (info.status === 'ABSENT') {
          row.push('"Absent"');
        } else if (info.status === 'LEAVE') {
          row.push('"Leave"');
        } else if (info.status === 'WEEKEND') {
          row.push('"Weekend"');
        } else {
          row.push('""');
        }
      }

      row.push(`"${emp.halfDaysCount || 0}"`, `"${emp.leaveDaysCount}"`);
      return row.join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `attendance_report_${month}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
      {/* Card Header & Controls matching screenshot */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Employee Attendance
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Daily logs, punch records, and monthly leave tally
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search bar */}
          <div className="relative w-48 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee..."
              className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Department Filter */}
          {departments.length > 0 && (
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          )}

          {/* Month / Year Selector */}
          <div className="relative inline-flex items-center">
            <input
              type="month"
              value={month}
              onChange={(e) => onMonthChange(e.target.value)}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Download Report Button */}
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Download Report
          </button>

          {/* Record Attendance Button */}
          {onRecordManualClick && (
            <button
              type="button"
              onClick={onRecordManualClick}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Record Punch
            </button>
          )}
        </div>
      </div>

      {/* Matrix Table with Horizontal Scroll */}
      <div className="overflow-x-auto rounded-md border border-slate-200/80 dark:border-slate-800">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
              {/* Sticky Employee Name Column */}
              <th className="sticky left-0 z-20 bg-slate-50 dark:bg-slate-800 px-4 py-3 min-w-[200px] border-r border-slate-200 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => setSortAsc(!sortAsc)}
                  className="inline-flex items-center gap-1.5 hover:text-blue-600 transition-colors font-bold"
                >
                  Employee Name
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
              </th>

              {/* Day numbers 1 to 31 */}
              {dayNumbers.map((d) => (
                <th
                  key={d}
                  className="px-1.5 py-3 text-center min-w-[34px] font-bold text-slate-600 dark:text-slate-300"
                >
                  {d}
                </th>
              ))}

              {/* Leave Column */}
              <th className="px-3 py-3 text-center font-bold text-slate-600 dark:text-slate-300 min-w-[70px]">
                Leave
              </th>

              {/* Half Day Column */}
              <th className="px-3 py-3 text-center font-bold text-slate-600 dark:text-slate-300 min-w-[70px]">
                Half Day
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td
                  colSpan={daysInMonth + 3}
                  className="py-12 text-center text-slate-400"
                >
                  Loading attendance matrix...
                </td>
              </tr>
            ) : filteredEmployees.length === 0 ? (
              <tr>
                <td
                  colSpan={daysInMonth + 3}
                  className="py-12 text-center text-slate-400"
                >
                  No employee records found for this period.
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp) => (
                <tr
                  key={emp.employeeId}
                  className="hover:bg-slate-50/75 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* Sticky Employee Name Cell */}
                  <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-slate-50 px-4 py-2.5 border-r border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      {emp.avatarUrl ? (
                        <img
                          src={emp.avatarUrl}
                          alt={emp.name}
                          className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                          {emp.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800 dark:text-slate-100 truncate text-[13px]">
                          {emp.name}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                          {emp.employeeCode} {emp.department ? `· ${emp.department}` : ''}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Day circles matching screenshot */}
                  {dayNumbers.map((d) => {
                    const info = emp.days[d] || { status: 'FUTURE' };

                    return (
                      <td key={d} className="px-1 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedCell({ employee: emp, day: d, info })}
                          className="w-6 h-6 mx-auto flex items-center justify-center rounded-full transition-transform hover:scale-115 focus:outline-none"
                          title={`Day ${d}: ${info.status}`}
                        >
                          {info.status === 'ON_TIME' && (
                            <span className="w-5 h-5 rounded-full border border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </span>
                          )}

                          {info.status === 'HALF_DAY' && (
                            <span className="w-5 h-5 rounded-full border border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-300 flex items-center justify-center font-bold text-[10px]">
                              ½
                            </span>
                          )}

                          {info.status === 'LATE' && (
                            <span className="w-5 h-5 rounded-full border border-orange-500 bg-orange-50 dark:bg-orange-950/60 text-orange-500 dark:text-orange-400 flex items-center justify-center">
                              <Clock className="w-3 h-3" />
                            </span>
                          )}

                          {info.status === 'ABSENT' && (
                            <span className="w-5 h-5 rounded-full border border-rose-400 bg-rose-50 dark:bg-rose-950/60 text-rose-500 dark:text-rose-400 flex items-center justify-center">
                              <XCircle className="w-3.5 h-3.5" />
                            </span>
                          )}

                          {info.status === 'LEAVE' && (
                            <span className="w-5 h-5 rounded-full border border-purple-400 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 flex items-center justify-center">
                              <Palmtree className="w-3 h-3" />
                            </span>
                          )}

                          {info.status === 'WEEKEND' && (
                            <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 flex items-center justify-center text-[10px]">
                              <Minus className="w-3 h-3" />
                            </span>
                          )}

                          {info.status === 'FUTURE' && (
                            <span className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800" />
                          )}
                        </button>
                      </td>
                    );
                  })}

                  {/* Leave Column */}
                  <td className="px-3 py-2.5 text-center font-bold text-orange-500 dark:text-orange-400 text-xs whitespace-nowrap">
                    {emp.leaveDaysCount > 0 ? `${emp.leaveDaysCount} Day` : '0 Day'}
                  </td>

                  {/* Half Day Column */}
                  <td className="px-3 py-2.5 text-center font-bold text-sky-600 dark:text-sky-400 text-xs whitespace-nowrap">
                    {(emp.halfDaysCount || 0) > 0 ? `${emp.halfDaysCount} Day` : '0 Day'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Legend under sheet */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 text-xs">
        <div className="flex flex-wrap items-center gap-4 text-slate-600 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full border border-blue-500 bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-3 h-3" />
            </span>
            On Time
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full border border-sky-500 bg-sky-50 text-sky-600 font-bold text-[9px] flex items-center justify-center">
              ½
            </span>
            Half Day (4h - 8h)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full border border-orange-500 bg-orange-50 text-orange-500 flex items-center justify-center">
              <Clock className="w-2.5 h-2.5" />
            </span>
            Late
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full border border-rose-400 bg-rose-50 text-rose-500 flex items-center justify-center">
              <XCircle className="w-3 h-3" />
            </span>
            Absent
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full border border-purple-400 bg-purple-50 text-purple-600 flex items-center justify-center">
              <Palmtree className="w-2.5 h-2.5" />
            </span>
            Leave
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
              <Minus className="w-2.5 h-2.5" />
            </span>
            Weekend
          </span>
        </div>

        <div className="text-slate-400 dark:text-slate-500 text-[11px]">
          Showing {filteredEmployees.length} of {employees.length} employees
        </div>
      </div>

      {/* Detail Popover / Modal when clicking any day cell */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                  Punch Detail · Day {selectedCell.day}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Employee:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedCell.employee.name} ({selectedCell.employee.employeeCode})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Status:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedCell.info.status === 'HALF_DAY' ? 'Half Day (4h - 8h)' : selectedCell.info.status}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Punch In:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedCell.info.checkIn || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Punch Out:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedCell.info.checkOut || '—'}
                </span>
              </div>
              {selectedCell.info.workMinutes !== undefined && (
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Hours Worked:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {Math.floor(selectedCell.info.workMinutes / 60)}h {selectedCell.info.workMinutes % 60}m
                  </span>
                </div>
              )}
              {selectedCell.info.note && (
                <div className="py-1">
                  <span className="text-slate-400 block mb-1">Note:</span>
                  <span className="italic text-slate-600 dark:text-slate-300">
                    "{selectedCell.info.note}"
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                className="w-full py-2 text-xs font-semibold rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
