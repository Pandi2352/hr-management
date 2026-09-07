import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { SelectField } from '../../../components/ui/SelectField';
import { Form, FormField } from '../../../components/forms';
import { DollarSign, User, Calendar, Clock } from 'lucide-react';
import type { PayrollRecord, PayrollStatus } from '../types/payroll.types';

interface AddPayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPayroll: (record: PayrollRecord) => void;
}

export const AddPayrollModal: React.FC<AddPayrollModalProps> = ({
  isOpen,
  onClose,
  onAddPayroll,
}) => {
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Back-End Developer');
  const [totalDays, setTotalDays] = useState('30');
  const [workingDays, setWorkingDays] = useState('26');
  const [totalSalary, setTotalSalary] = useState('22250');
  const [overTime, setOverTime] = useState('1500');
  const [status, setStatus] = useState<PayrollStatus>('Completed');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      const newRecord: PayrollRecord = {
        id: `pay-${Date.now()}`,
        name: name.trim(),
        avatarUrl: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 1000000)}?w=100&auto=format&fit=crop&q=80`,
        department,
        totalDays: parseInt(totalDays, 10) || 30,
        workingDays: parseInt(workingDays, 10) || 26,
        totalSalary: parseFloat(totalSalary) || 20000,
        overTime: parseFloat(overTime) || 0,
        status,
      };

      onAddPayroll(newRecord);
      setIsSubmitting(false);
      setName('');
      onClose();
    }, 400);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Payroll Record" className="max-w-xl">
      <Form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Process and issue payroll breakdown for an employee for the current billing cycle.
        </p>

        <FormField>
          <Input
            label="Employee Name"
            required
            autoFocus
            leftIcon={<User className="h-4 w-4 text-slate-400" />}
            placeholder="e.g. Sarah Jenkins"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField>
            <SelectField
              label="Department / Designation"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              options={[
                { label: 'Back-End Developer', value: 'Back-End Developer' },
                { label: 'Full-Stack Developer', value: 'Full-Stack Developer' },
                { label: 'Mobile App Developer', value: 'Mobile App Developer' },
                { label: 'UI/UX Designer', value: 'UI/UX Designer' },
                { label: 'DevOps Engineer', value: 'DevOps Engineer' },
                { label: 'HR Executive', value: 'HR Executive' },
                { label: 'Product Manager', value: 'Product Manager' },
              ]}
            />
          </FormField>

          <FormField>
            <SelectField
              label="Payroll Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as PayrollStatus)}
              options={[
                { label: 'Completed', value: 'Completed' },
                { label: 'Pending', value: 'Pending' },
                { label: 'Reject', value: 'Reject' },
              ]}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField>
            <Input
              label="Total Days in Cycle"
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
              label="Actual Working Days"
              type="number"
              min={0}
              max={31}
              leftIcon={<Clock className="h-4 w-4 text-slate-400" />}
              value={workingDays}
              onChange={(e) => setWorkingDays(e.target.value)}
              required
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField>
            <Input
              label="Total Base Salary ($)"
              type="number"
              min={0}
              step={100}
              leftIcon={<DollarSign className="h-4 w-4 text-slate-400" />}
              value={totalSalary}
              onChange={(e) => setTotalSalary(e.target.value)}
              required
            />
          </FormField>

          <FormField>
            <Input
              label="Overtime Allowance ($)"
              type="number"
              min={0}
              step={50}
              leftIcon={<DollarSign className="h-4 w-4 text-slate-400" />}
              value={overTime}
              onChange={(e) => setOverTime(e.target.value)}
            />
          </FormField>
        </div>

        {/* Calculated preview */}
        <div className="rounded-md bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Estimated Net Pay:</span>
          <span className="font-bold text-violet-600 dark:text-violet-400 text-sm">
            ${((parseFloat(totalSalary) || 0) + (parseFloat(overTime) || 0)).toLocaleString()}
          </span>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Submit Payroll
          </Button>
        </div>
      </Form>
    </Modal>
  );
};
