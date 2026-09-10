import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { SelectField } from '../../../components/ui/SelectField';
import { Form, FormField } from '../../../components/forms';
import { useToast } from '../../../components/ui/toast';
import { Calendar, Clock, DollarSign, Mail, Loader2 } from 'lucide-react';
import { payrollApi } from '../api/payroll.api';
import type {
  CreatePayrollPayload,
  PayrollEligibleEmployee,
  PayrollRecord,
  PayrollStatus,
} from '../types/payroll.types';

interface AddPayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProcessed: (record: PayrollRecord) => void;
  defaultMonth?: number;
  defaultYear?: number;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const money = (value: string) => Math.max(0, parseFloat(value) || 0);

export const AddPayrollModal: React.FC<AddPayrollModalProps> = ({
  isOpen,
  onClose,
  onProcessed,
  defaultMonth,
  defaultYear,
}) => {
  const toast = useToast();
  const now = new Date();

  const [month, setMonth] = useState(String(defaultMonth ?? now.getMonth() + 1));
  const [year, setYear] = useState(String(defaultYear ?? now.getFullYear()));

  const [employees, setEmployees] = useState<PayrollEligibleEmployee[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [employeeId, setEmployeeId] = useState('');

  const [totalDays, setTotalDays] = useState('30');
  const [workingDays, setWorkingDays] = useState('30');
  const [basicSalary, setBasicSalary] = useState('');
  const [allowances, setAllowances] = useState('0');
  const [bonus, setBonus] = useState('0');
  const [overtimeAmount, setOvertimeAmount] = useState('0');
  const [taxDeduction, setTaxDeduction] = useState('0');
  const [providentFund, setProvidentFund] = useState('0');
  const [otherDeductions, setOtherDeductions] = useState('0');
  const [status, setStatus] = useState<PayrollStatus>('COMPLETED');
  const [remarks, setRemarks] = useState('');
  const [sendPayslip, setSendPayslip] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selected = employees.find((e) => e._id === employeeId);

  /*
   * Days default to the real length of the selected month rather than a fixed
   * 30 — proration is basic ÷ totalDays, so a hardcoded 30 quietly overpays in
   * February and underpays in a 31-day month.
   */
  useEffect(() => {
    if (!isOpen) return;
    const days = new Date(Number(year), Number(month), 0).getDate();
    setTotalDays(String(days));
    setWorkingDays((prev) => (Number(prev) > days ? String(days) : prev || String(days)));
  }, [isOpen, month, year]);

  // Re-fetched per period: whether someone is already processed depends on it.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    (async () => {
      setIsLoadingEmployees(true);
      try {
        const list = await payrollApi.getEligibleEmployees(Number(month), Number(year));
        if (!cancelled) setEmployees(list);
      } catch (err: any) {
        if (!cancelled) {
          toast.error(
            err?.response?.data?.message || 'Could not load the employee list.',
            'Employees Unavailable',
          );
        }
      } finally {
        if (!cancelled) setIsLoadingEmployees(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, month, year, toast]);

  // Clear a selection that became invalid after the period changed.
  useEffect(() => {
    if (employeeId && selected?.alreadyProcessed) setEmployeeId('');
  }, [employeeId, selected]);

  const employeeOptions = useMemo(
    () =>
      employees.map((e) => ({
        value: e._id,
        label: e.alreadyProcessed ? `${e.name} — already processed` : e.name,
        sublabel: [e.employeeCode, e.designationTitle || e.departmentName]
          .filter(Boolean)
          .join(' · '),
        disabled: e.alreadyProcessed,
      })),
    [employees],
  );

  // Mirrors PayrollService.calculate() so the preview matches what is stored.
  const preview = useMemo(() => {
    const total = Number(totalDays) || 0;
    const worked = Math.min(Number(workingDays) || 0, total);
    const earnedBasic = total > 0 ? (money(basicSalary) * worked) / total : 0;
    const gross =
      earnedBasic + money(allowances) + money(bonus) + money(overtimeAmount);
    const deductions = money(taxDeduction) + money(providentFund) + money(otherDeductions);
    return {
      earnedBasic,
      gross,
      deductions,
      net: Math.max(0, gross - deductions),
      lop: Math.max(0, total - worked),
    };
  }, [totalDays, workingDays, basicSalary, allowances, bonus, overtimeAmount, taxDeduction, providentFund, otherDeductions]);

  const reset = () => {
    setEmployeeId('');
    setBasicSalary('');
    setAllowances('0');
    setBonus('0');
    setOvertimeAmount('0');
    setTaxDeduction('0');
    setProvidentFund('0');
    setOtherDeductions('0');
    setRemarks('');
    setStatus('COMPLETED');
    setSendPayslip(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      toast.error('Select the employee this payroll run is for.', 'Employee Required');
      return;
    }
    if (Number(workingDays) > Number(totalDays)) {
      toast.error('Working days cannot exceed the days in the cycle.', 'Check the Days');
      return;
    }
    if (money(basicSalary) <= 0) {
      toast.error('Enter the basic salary for this cycle.', 'Salary Required');
      return;
    }

    const payload: CreatePayrollPayload = {
      employeeId,
      month: Number(month),
      year: Number(year),
      totalDays: Number(totalDays),
      workingDays: Number(workingDays),
      basicSalary: money(basicSalary),
      allowances: money(allowances),
      bonus: money(bonus),
      overtimeAmount: money(overtimeAmount),
      taxDeduction: money(taxDeduction),
      providentFund: money(providentFund),
      otherDeductions: money(otherDeductions),
      status,
      remarks: remarks.trim() || undefined,
      sendPayslip,
    };

    setIsSubmitting(true);
    try {
      const record = await payrollApi.create(payload);
      onProcessed(record);
      reset();
      onClose();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || 'Payroll could not be processed.',
        'Processing Failed',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const currency = selected ? 'USD' : 'USD';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Process Payroll" className="max-w-2xl">
      <Form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Salary is prorated by attendance. Gross, deductions and net pay are calculated on the
          server from the amounts below.
        </p>

        {/* Period first: it decides who is still eligible */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField>
            <SelectField
              label="Pay Period Month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))}
            />
          </FormField>
          <FormField>
            <SelectField
              label="Pay Period Year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              options={Array.from({ length: 5 }, (_, i) => {
                const y = now.getFullYear() - 2 + i;
                return { value: String(y), label: String(y) };
              })}
            />
          </FormField>
        </div>

        <FormField>
          <SelectField
            label="Employee"
            required
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            placeholder={isLoadingEmployees ? 'Loading employees…' : 'Search and select an employee'}
            searchPlaceholder="Search by name, code or role…"
            disabled={isLoadingEmployees}
            options={employeeOptions}
          />
          {selected && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="font-mono">{selected.employeeCode}</span>
              {selected.designationTitle && <span>{selected.designationTitle}</span>}
              {selected.departmentName && <span>{selected.departmentName}</span>}
              <span
                className={
                  selected.workEmail
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                }
              >
                {selected.workEmail || 'No work email — payslip cannot be sent'}
              </span>
            </div>
          )}
          {!isLoadingEmployees && employees.length === 0 && (
            <p className="mt-1.5 text-[11px] text-amber-600 dark:text-amber-400">
              No active employees found. Add an employee before processing payroll.
            </p>
          )}
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField>
            <Input
              label="Days in Cycle"
              type="number"
              min={1}
              max={31}
              leftIcon={<Calendar className="h-4 w-4 text-slate-400" />}
              value={totalDays}
              onChange={(e) => setTotalDays(e.target.value)}
              required
            />
          </FormField>
          <FormField>
            <Input
              label="Days Worked"
              type="number"
              min={0}
              max={Number(totalDays) || 31}
              leftIcon={<Clock className="h-4 w-4 text-slate-400" />}
              value={workingDays}
              onChange={(e) => setWorkingDays(e.target.value)}
              required
            />
          </FormField>
          <FormField>
            <SelectField
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as PayrollStatus)}
              options={[
                { value: 'COMPLETED', label: 'Completed' },
                { value: 'PENDING', label: 'Pending' },
                { value: 'REJECTED', label: 'Rejected' },
              ]}
            />
          </FormField>
        </div>

        {/* Earnings */}
        <div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Earnings
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FormField>
              <Input
                label="Basic Salary"
                type="number"
                min={0}
                step={100}
                leftIcon={<DollarSign className="h-4 w-4 text-slate-400" />}
                value={basicSalary}
                onChange={(e) => setBasicSalary(e.target.value)}
                placeholder="0"
                required
              />
            </FormField>
            <FormField>
              <Input
                label="Allowances"
                type="number"
                min={0}
                step={50}
                value={allowances}
                onChange={(e) => setAllowances(e.target.value)}
              />
            </FormField>
            <FormField>
              <Input
                label="Bonus"
                type="number"
                min={0}
                step={50}
                value={bonus}
                onChange={(e) => setBonus(e.target.value)}
              />
            </FormField>
            <FormField>
              <Input
                label="Overtime"
                type="number"
                min={0}
                step={50}
                value={overtimeAmount}
                onChange={(e) => setOvertimeAmount(e.target.value)}
              />
            </FormField>
          </div>
        </div>

        {/* Deductions */}
        <div>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
            Deductions
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField>
              <Input
                label="Income Tax"
                type="number"
                min={0}
                step={50}
                value={taxDeduction}
                onChange={(e) => setTaxDeduction(e.target.value)}
              />
            </FormField>
            <FormField>
              <Input
                label="Provident Fund"
                type="number"
                min={0}
                step={50}
                value={providentFund}
                onChange={(e) => setProvidentFund(e.target.value)}
              />
            </FormField>
            <FormField>
              <Input
                label="Other Deductions"
                type="number"
                min={0}
                step={50}
                value={otherDeductions}
                onChange={(e) => setOtherDeductions(e.target.value)}
              />
            </FormField>
          </div>
        </div>

        <FormField>
          <Input
            label="Remarks (optional)"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Includes Q1 performance bonus"
          />
        </FormField>

        {/* Live breakdown, matching the server calculation */}
        <div className="space-y-1.5 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/60">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span>
              Earned basic
              {preview.lop > 0 && (
                <span className="ml-1 text-amber-600 dark:text-amber-400">
                  ({preview.lop} LOP {preview.lop === 1 ? 'day' : 'days'})
                </span>
              )}
            </span>
            <span className="font-medium tabular-nums text-slate-700 dark:text-slate-200">
              {currency} {preview.earnedBasic.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span>Gross earnings</span>
            <span className="font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
              {currency} {preview.gross.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span>Total deductions</span>
            <span className="font-medium tabular-nums text-rose-600 dark:text-rose-400">
              − {currency} {preview.deductions.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 pt-1.5 dark:border-slate-700">
            <span className="font-semibold text-slate-700 dark:text-slate-200">Net pay</span>
            <span className="text-sm font-bold tabular-nums text-violet-600 dark:text-violet-400">
              {currency} {preview.net.toFixed(2)}
            </span>
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-slate-200 p-3 dark:border-slate-800">
          <input
            type="checkbox"
            checked={sendPayslip}
            onChange={(e) => setSendPayslip(e.target.checked)}
            disabled={!selected?.workEmail}
            className="mt-0.5 h-3.5 w-3.5 cursor-pointer accent-violet-600"
          />
          <span className="text-xs">
            <span className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100">
              <Mail className="h-3.5 w-3.5 text-violet-500" />
              Email the payslip once processed
            </span>
            <span className="mt-0.5 block text-slate-500 dark:text-slate-400">
              {selected?.workEmail
                ? `Sends to ${selected.workEmail}. It can also be sent later from the payroll list.`
                : 'Select an employee with a work email to enable this.'}
            </span>
          </span>
        </label>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting} disabled={!employeeId}>
            {isLoadingEmployees && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Process Payroll
          </Button>
        </div>
      </Form>
    </Modal>
  );
};
