import React from 'react';
import { Download, Mail, MailCheck, MailX, Loader2, Trash2, ArrowUpDown } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { SelectField } from '../../../components/ui/SelectField';
import { SearchInput } from '../../../components/ui/SearchInput';
import { Pagination } from '../../../components/data-table/Pagination';
import { Tooltip } from '../../../components/ui/tooltip';
import {
  PAYROLL_STATUS_LABEL,
  type PayrollRecord,
  type PayrollStatus,
} from '../types/payroll.types';

interface PayrollListTableProps {
  records: PayrollRecord[];
  isLoading?: boolean;

  /** Server-driven paging: the table renders the page it is given. */
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;

  search: string;
  onSearchChange: (value: string) => void;
  year: number;
  onYearChange: (year: number) => void;
  status: PayrollStatus | 'ALL';
  onStatusChange: (status: PayrollStatus | 'ALL') => void;

  onDownloadReport?: () => void;
  onSendPayslip?: (record: PayrollRecord) => void;
  onDelete?: (record: PayrollRecord) => void;
  sendingId?: string | null;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function statusPill(status: PayrollStatus): string {
  switch (status) {
    case 'COMPLETED':
      return 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60';
    case 'REJECTED':
      return 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60';
    case 'PENDING':
      return 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60';
    default:
      return 'bg-slate-50 text-slate-600 border-slate-200';
  }
}

const currencyFormat = (amount: number, currency: string) =>
  `${currency === 'USD' ? '$' : `${currency} `}${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

export const PayrollListTable: React.FC<PayrollListTableProps> = ({
  records,
  isLoading = false,
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  search,
  onSearchChange,
  year,
  onYearChange,
  status,
  onStatusChange,
  onDownloadReport,
  onSendPayslip,
  onDelete,
  sendingId,
}) => {
  const currentYear = new Date().getFullYear();

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Payroll Register</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Salary disbursements, deductions and payslip delivery status
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="w-48 sm:w-60">
            <SearchInput
              value={search}
              onChange={onSearchChange}
              onClear={() => onSearchChange('')}
              placeholder="Search name, code or department…"
            />
          </div>

          <div className="w-36 shrink-0">
            <SelectField
              value={status}
              onChange={(e) => onStatusChange(e.target.value as PayrollStatus | 'ALL')}
              options={[
                { value: 'ALL', label: 'All statuses' },
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'REJECTED', label: 'Rejected' },
              ]}
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onDownloadReport}
            className="h-9 shrink-0 rounded-md border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Download className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
            Export CSV
          </Button>

          <div className="w-28 shrink-0">
            <SelectField
              value={String(year)}
              onChange={(e) => onYearChange(Number(e.target.value))}
              options={Array.from({ length: 5 }, (_, i) => {
                const y = currentYear - 2 + i;
                return { value: String(y), label: String(y) };
              })}
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
              {['Employee', 'Department', 'Period', 'Days', 'Gross', 'Deductions', 'Net Pay', 'Status', 'Payslip'].map(
                (label) => (
                  <th key={label} scope="col" className="px-4 py-3">
                    <div className="flex select-none items-center gap-1.5">
                      <span>{label}</span>
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    </div>
                  </th>
                ),
              )}
              <th scope="col" className="w-24 px-4 py-3 text-center">
                Action
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-400">
                  <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                  Loading payroll register…
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-400">
                  No payroll records for this period. Use <strong>Add Payroll</strong> to process one.
                </td>
              </tr>
            ) : (
              records.map((row) => (
                <tr
                  key={row._id}
                  className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {row.employeeName
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-900 dark:text-slate-100">
                          {row.employeeName}
                        </div>
                        <div className="truncate font-mono text-[10px] text-slate-400">
                          {row.employeeCode}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {row.departmentName || '—'}
                  </td>

                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {MONTHS[row.month - 1]} {row.year}
                  </td>

                  <td className="px-4 py-3 tabular-nums text-slate-600 dark:text-slate-300">
                    {row.workingDays}/{row.totalDays}
                    {row.lopDays > 0 && (
                      <span className="ml-1 text-[10px] text-amber-600 dark:text-amber-400">
                        {row.lopDays} LOP
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 tabular-nums text-slate-700 dark:text-slate-200">
                    {currencyFormat(row.grossEarnings, row.currency)}
                  </td>

                  <td className="px-4 py-3 tabular-nums text-rose-600 dark:text-rose-400">
                    {row.totalDeductions > 0
                      ? `− ${currencyFormat(row.totalDeductions, row.currency)}`
                      : '—'}
                  </td>

                  <td className="px-4 py-3 font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {currencyFormat(row.netPay, row.currency)}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-block min-w-[84px] rounded-md border px-3 py-1 text-center text-xs font-semibold ${statusPill(
                        row.status,
                      )}`}
                    >
                      {PAYROLL_STATUS_LABEL[row.status]}
                    </span>
                  </td>

                  {/* Delivery state is its own column: "processed" and "the
                      employee was told" are different facts. */}
                  <td className="px-4 py-3">
                    {row.payslipEmailStatus === 'SENT' ? (
                      <Tooltip
                        content={`Sent ${row.payslipSentAt ? new Date(row.payslipSentAt).toLocaleString() : ''}${
                          row.payslipSendCount > 1 ? ` · ${row.payslipSendCount} times` : ''
                        }`}
                      >
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <MailCheck className="h-3.5 w-3.5" />
                          Sent
                        </span>
                      </Tooltip>
                    ) : row.payslipEmailStatus === 'FAILED' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                        <MailX className="h-3.5 w-3.5" />
                        Failed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                        <Mail className="h-3.5 w-3.5" />
                        Not sent
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <Tooltip
                        content={
                          row.employeeEmail
                            ? row.payslipEmailStatus === 'SENT'
                              ? 'Resend payslip'
                              : 'Send payslip'
                            : 'No work email on file'
                        }
                      >
                        <button
                          type="button"
                          onClick={() => onSendPayslip?.(row)}
                          disabled={!row.employeeEmail || sendingId === row._id}
                          className="cursor-pointer rounded-md p-1.5 text-slate-400 transition-colors hover:bg-violet-50 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-violet-950/40 dark:hover:text-violet-400"
                          aria-label={`Send payslip to ${row.employeeName}`}
                        >
                          {sendingId === row._id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Mail className="h-4 w-4" />
                          )}
                        </button>
                      </Tooltip>

                      <Tooltip content="Remove payroll record">
                        <button
                          type="button"
                          onClick={() => onDelete?.(row)}
                          className="cursor-pointer rounded-md p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                          aria-label={`Remove payroll for ${row.employeeName}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-slate-100 p-3 dark:border-slate-800">
        <Pagination
          page={page}
          pageSize={pageSize}
          totalItems={totalItems}
          pageSizeOptions={[5, 10, 20, 50]}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </div>
    </div>
  );
};
