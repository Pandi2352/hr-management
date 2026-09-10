import { useCallback, useEffect, useState } from 'react';
import { Plus, Send } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/toast';
import { ConfirmDialog } from '../../../components/overlay/ConfirmDialog';
import { PayrollSummaryChart } from '../components/PayrollSummaryChart';
import { CompanyPayDonut } from '../components/CompanyPayDonut';
import { PayrollListTable } from '../components/PayrollListTable';
import { AddPayrollModal } from '../components/AddPayrollModal';
import { payrollApi } from '../api/payroll.api';
import type { PayrollRecord, PayrollStatus, PayrollSummary } from '../types/payroll.types';

/** Component colours live here, not on the server — the API returns amounts. */
const BREAKDOWN_COLORS: Record<string, string> = {
  Basic: '#6366f1',
  Allowances: '#f59e0b',
  Bonus: '#22c55e',
  Overtime: '#f97316',
  Tax: '#ef4444',
  'Provident Fund': '#06b6d4',
};

export function PayrollPage() {
  const toast = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [summary, setSummary] = useState<PayrollSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [status, setStatus] = useState<PayrollStatus | 'ALL'>('ALL');

  const [sendingId, setSendingId] = useState<string | null>(null);
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PayrollRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // One request per pause in typing rather than one per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await payrollApi.getPayrolls({
        page,
        pageSize,
        year,
        status,
        search: debouncedSearch.trim() || undefined,
      });
      setRecords(res.data || []);
      setTotalItems(res.meta?.totalItems ?? 0);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || 'Could not load the payroll register.',
        'Payroll Unavailable',
      );
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, year, status, debouncedSearch, toast]);

  const fetchSummary = useCallback(async () => {
    try {
      setSummary(await payrollApi.getSummary(year));
    } catch {
      setSummary(null); // Charts fall back to an empty state rather than stale figures.
    }
  }, [year]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleProcessed = (record: PayrollRecord) => {
    const delivered = record.payslipEmailStatus === 'SENT';
    toast.success(
      delivered
        ? `Payroll processed and payslip emailed to ${record.employeeEmail}.`
        : `Payroll processed for ${record.employeeName}.`,
      'Payroll Processed',
    );
    // Refetched rather than prepended: the row belongs to a period and page
    // that may not be the one currently shown.
    fetchRecords();
    fetchSummary();
  };

  const handleSendPayslip = async (record: PayrollRecord) => {
    setSendingId(record._id);
    try {
      const result = await payrollApi.sendPayslip(record._id);
      if (result.sent) toast.success(result.message, 'Payslip Sent');
      else toast.error(result.message, 'Delivery Failed');
      fetchRecords();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || 'The payslip could not be sent.',
        'Delivery Failed',
      );
    } finally {
      setSendingId(null);
    }
  };

  const handleSendAll = async () => {
    const month = new Date().getMonth() + 1;
    setIsBulkSending(true);
    try {
      const result = await payrollApi.sendPayslipsForPeriod(month, year);
      if (result.failed > 0) {
        toast.error(
          `${result.sent} of ${result.total} payslips sent; ${result.failed} failed.`,
          'Partially Delivered',
        );
      } else if (result.total === 0) {
        toast.info('No processed payroll records for the current month.');
      } else {
        toast.success(`${result.sent} payslips dispatched.`, 'Payslips Sent');
      }
      fetchRecords();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || 'Payslips could not be dispatched.',
        'Delivery Failed',
      );
    } finally {
      setIsBulkSending(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const result = await payrollApi.remove(deleteTarget._id);
      toast.success(result.message, 'Record Removed');
      setDeleteTarget(null);
      fetchRecords();
      fetchSummary();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || 'The record could not be removed.',
        'Delete Failed',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExport = async () => {
    try {
      await payrollApi.exportCsv({ year, status, search: debouncedSearch.trim() || undefined });
      toast.success('Payroll register exported.', 'Export Ready');
    } catch {
      toast.error('The export could not be generated.', 'Export Failed');
    }
  };

  const breakdown = (summary?.breakdown ?? []).map((b) => ({
    ...b,
    color: BREAKDOWN_COLORS[b.name] || '#94a3b8',
  }));

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Payroll
          </h1>
          <p className="mt-0.5 text-xs text-slate-400">
            Dashboard <span className="mx-1">/</span>{' '}
            <span className="font-medium text-slate-600 dark:text-slate-300">Payroll</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleSendAll}
            isLoading={isBulkSending}
            className="gap-1.5"
          >
            <Send className="h-4 w-4" />
            Send This Month's Payslips
          </Button>
          <Button variant="primary" onClick={() => setIsAddModalOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Payroll
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12">
        <div className="flex flex-col lg:col-span-7">
          <PayrollSummaryChart data={summary?.monthly ?? []} className="h-full" />
        </div>
        <div className="flex flex-col lg:col-span-5">
          <CompanyPayDonut
            breakdown={breakdown}
            totalCount={summary?.totals.recordCount ?? 0}
            onDownloadReport={handleExport}
            className="h-full"
          />
        </div>
      </div>

      <PayrollListTable
        records={records}
        isLoading={isLoading}
        page={page}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        search={search}
        onSearchChange={setSearch}
        year={year}
        onYearChange={(y) => {
          setYear(y);
          setPage(1);
        }}
        status={status}
        onStatusChange={(s) => {
          setStatus(s);
          setPage(1);
        }}
        onDownloadReport={handleExport}
        onSendPayslip={handleSendPayslip}
        onDelete={setDeleteTarget}
        sendingId={sendingId}
      />

      <AddPayrollModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onProcessed={handleProcessed}
        defaultYear={year}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
        title="Remove payroll record"
        description={
          deleteTarget
            ? `Remove the payroll record for ${deleteTarget.employeeName}? It stays in the audit trail, and any payslip already emailed cannot be recalled.`
            : ''
        }
        confirmLabel="Remove"
        variant="danger"
      />
    </div>
  );
}

export default PayrollPage;
