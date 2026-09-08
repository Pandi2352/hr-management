import { useState, useEffect } from 'react';
import { X, Sparkles, Check } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { SelectField } from '../../../components/ui/SelectField';
import { useToast } from '../../../components/ui/toast';
import { employeesApi } from '../../employees/api/employees.api';
import { onboardingApi } from '../api/onboarding.api';
import type { Employee } from '../../employees/types/employees.types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InitializeOnboardingModal({ isOpen, onClose, onSuccess }: Props) {
  const toast = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [targetJoiningDate, setTargetJoiningDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    async function loadCandidates() {
      try {
        setIsLoadingEmployees(true);
        const res = await employeesApi.getEmployees();
        setEmployees(res.data || []);
        if (res.data && res.data.length > 0) {
          setSelectedEmployeeId(res.data[0]._id);
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to load employee list');
      } finally {
        setIsLoadingEmployees(false);
      }
    }

    loadCandidates();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) {
      toast.error('Please select an employee candidate');
      return;
    }

    try {
      setIsSubmitting(true);
      await onboardingApi.initializeOnboarding({
        employeeId: selectedEmployeeId,
        targetJoiningDate,
      });
      toast.success('Onboarding session successfully initialized with 10 tasks!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || 'Failed to initialize onboarding session',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const employeeOptions = employees.map((emp) => ({
    value: emp._id,
    label: `${emp.firstName} ${emp.lastName} (${emp.employeeCode}) - ${emp.departmentName || 'General'}`,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-outfit text-sm font-bold text-slate-900 dark:text-white">
                Initialize Digital Onboarding
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Setup collaborative checklist across HR, IT, Manager & Candidate
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Candidate Employee
            </label>
            {isLoadingEmployees ? (
              <div className="p-2 text-xs text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-md">
                Loading employees...
              </div>
            ) : (
              <SelectField
                name="employeeId"
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                options={employeeOptions}
                placeholder="Choose candidate..."
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Target Joining Date
            </label>
            <Input
              type="date"
              name="targetJoiningDate"
              value={targetJoiningDate}
              onChange={(e) => setTargetJoiningDate(e.target.value)}
              required
            />
          </div>

          {/* Checklist Template Preview Box */}
          <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
              Pre-Configured Enterprise Checklist (10 Tasks Included):
            </span>
            <ul className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 list-disc list-inside">
              <li><strong>HR:</strong> Identity, Contract, Background Verification (BGV)</li>
              <li><strong>IT:</strong> Corporate Laptop, Email & Identity SSO, Zero-Trust VPN</li>
              <li><strong>Manager:</strong> Peer Mentor Assignment, 30-Day Milestone Goals</li>
              <li><strong>Employee:</strong> Bank Credentials, Policy Acknowledgments</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Start Onboarding
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
