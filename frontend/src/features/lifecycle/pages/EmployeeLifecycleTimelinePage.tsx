import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { Avatar } from '../../../components/ui/Avatar';
import { EmployeeLifecycleTimeline } from '../components/EmployeeLifecycleTimeline';
import { employeesApi } from '../../employees/api/employees.api';
import type { Employee } from '../../employees/types/employees.types';

export function EmployeeLifecycleTimelinePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      setIsLoading(true);
      employeesApi
        .getEmployeeById(id)
        .then((data) => setEmployee(data))
        .catch(() => setEmployee(null))
        .finally(() => setIsLoading(false));
    }
  }, [id]);

  if (isLoading) {
    return (
      <div className="py-20 text-center text-xs text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-500" />
        Loading employee lifecycle history...
      </div>
    );
  }

  if (!employee || !id) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        Employee record not found.
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Employee Profile</span>
      </button>

      {/* Header Profile Summary */}
      <div className="p-5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Avatar
            src={employee.avatarUrl}
            name={employee.displayName || `${employee.firstName} ${employee.lastName}`}
            size="lg"
            shape="rounded"
          />
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {employee.displayName || `${employee.firstName} ${employee.lastName}`}
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              {employee.employeeCode} • {employee.designation?.title || 'Staff'} • {employee.department?.name || 'General'}
            </p>
          </div>
        </div>

        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400">
          {employee.status}
        </span>
      </div>

      {/* Career Milestones Timeline */}
      <div className="p-6 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Career Milestone Timeline
        </h3>
        <p className="text-xs text-slate-500 -mt-2">
          Comprehensive historical log of onboarding, probation confirmation, promotions, and organizational movements.
        </p>
        <div className="pt-2">
          <EmployeeLifecycleTimeline employeeId={id} />
        </div>
      </div>
    </div>
  );
}
