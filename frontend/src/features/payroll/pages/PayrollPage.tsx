import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/toast';
import { PayrollSummaryChart } from '../components/PayrollSummaryChart';
import { CompanyPayDonut } from '../components/CompanyPayDonut';
import { PayrollListTable } from '../components/PayrollListTable';
import { AddPayrollModal } from '../components/AddPayrollModal';
import {
  MOCK_PAYROLL_SUMMARY,
  MOCK_COMPANY_PAY,
  MOCK_PAYROLL_RECORDS,
} from '../data/mockPayrollData';
import type { PayrollRecord } from '../types/payroll.types';

export function PayrollPage() {
  const toast = useToast();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>(MOCK_PAYROLL_RECORDS);

  const handleDownloadReport = () => {
    toast.success('Payroll summary and disbursement reports downloaded successfully', 'Export Ready');
  };

  const handleAddPayroll = (newRecord: PayrollRecord) => {
    setPayrollRecords([newRecord, ...payrollRecords]);
    toast.success(`Payroll processed successfully for ${newRecord.name}`, 'Payroll Added');
  };

  const handleViewRecord = (record: PayrollRecord) => {
    toast.info(`Viewing payroll details & payslip for ${record.name} (${record.department})`);
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Header matching Screenshot */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Payroll
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Dashboard <span className="mx-1">/</span>{' '}
            <span className="text-slate-600 dark:text-slate-300 font-medium">Payroll</span>
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsAddModalOpen(true)}
          className="gap-1.5 shadow-xs"
        >
          <Plus className="h-4 w-4" />
          Add Payroll
        </Button>
      </div>

      {/* Top Row: Equal-height chart cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left: Payroll Summary (60% / 7 cols) */}
        <div className="lg:col-span-7 flex flex-col">
          <PayrollSummaryChart
            data={MOCK_PAYROLL_SUMMARY}
            className="h-full"
          />
        </div>

        {/* Right: Company Pay Donut (40% / 5 cols) */}
        <div className="lg:col-span-5 flex flex-col">
          <CompanyPayDonut
            breakdown={MOCK_COMPANY_PAY}
            totalCount={7433}
            onDownloadReport={handleDownloadReport}
            className="h-full"
          />
        </div>
      </div>

      {/* Bottom Section: Payroll List Table */}
      <PayrollListTable
        records={payrollRecords}
        onDownloadReport={handleDownloadReport}
        onViewRecord={handleViewRecord}
      />

      {/* Add Payroll Modal */}
      <AddPayrollModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddPayroll={handleAddPayroll}
      />
    </div>
  );
}

export default PayrollPage;
