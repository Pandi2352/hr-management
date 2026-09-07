import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Building2, Briefcase, CalendarDays, ArrowRight, IdCard } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { Avatar } from '../../components/ui';
import { useAuth } from '../auth/context/AuthContext';
import { employeesApi } from '../employees/api/employees.api';
import type { Employee } from '../employees/types/employees.types';

/**
 * Self-service view for a signed-in employee.
 *
 * Resolves the viewer's own employee record by matching their account email;
 * if no record is linked, the page says so rather than rendering blanks.
 */
export function EmployeeDashboard() {
  const { user } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    if (!user?.email) {
      setIsLoading(false);
      return;
    }

    employeesApi
      .getEmployees({ search: user.email, pageSize: 1 })
      .then((res) => {
        if (!active) return;
        setEmployee(res.data?.[0] ?? null);
      })
      .catch(() => active && setEmployee(null))
      .finally(() => active && setIsLoading(false));

    return () => {
      active = false;
    };
  }, [user?.email]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <Spinner size="lg" variant="violet" />
        <p className="animate-pulse text-xs font-medium text-ink-3">Loading your profile…</p>
      </div>
    );
  }

  const fields = employee
    ? [
        { icon: IdCard, label: 'Employee ID', value: employee.employeeCode },
        { icon: Mail, label: 'Work Email', value: employee.workEmail },
        { icon: Building2, label: 'Department', value: (employee as any).departmentName || '—' },
        { icon: Briefcase, label: 'Designation', value: (employee as any).designationTitle || '—' },
        { icon: CalendarDays, label: 'Joined', value: employee.joiningDate || '—' },
      ]
    : [];

  return (
    <div className="w-full space-y-2.5">
      <PageHeader
        title={`Welcome back, ${user?.firstName || 'there'}`}
        description="Your profile, employment details, and self-service shortcuts."
      />

      {!employee ? (
        <div className="rounded-md border border-dashed border-hairline bg-surface p-10 text-center">
          <h3 className="text-sm font-semibold text-ink">No employee record linked</h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-ink-3">
            Your account isn't linked to an employee profile yet. Your HR administrator can link it
            from the Employee Directory.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-3">
          {/* Identity */}
          <div className="rounded-md border border-hairline bg-surface p-5 lg:col-span-2">
            <div className="flex items-center gap-3">
              <Avatar
                src={employee.avatarUrl}
                name={`${employee.firstName} ${employee.lastName}`}
                size="lg"
              />
              <div className="min-w-0">
                <h3 className="truncate text-[14px] font-semibold text-ink">
                  {employee.displayName || `${employee.firstName} ${employee.lastName}`}
                </h3>
                <p className="truncate text-[11.5px] text-ink-3">
                  {(employee as any).designationTitle || 'Team member'}
                </p>
              </div>
              <span className="ml-auto shrink-0 rounded-md bg-surface-2 px-2 py-1 text-[10.5px] font-semibold uppercase tracking-wide text-ink-2">
                {employee.status}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              {fields.map((f) => (
                <div key={f.label} className="flex items-start gap-2.5">
                  <f.icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-3" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-ink-3">
                      {f.label}
                    </p>
                    <p className="truncate text-[12px] text-ink-2">{f.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shortcuts */}
          <div className="rounded-md border border-hairline bg-surface p-5">
            <h3 className="text-[12.5px] font-semibold text-ink">Self Service</h3>
            <p className="mt-0.5 text-[11px] text-ink-3">Manage your own details</p>

            <div className="mt-4 space-y-1">
              {[
                { to: `/employees/${employee._id}`, label: 'View my full profile' },
                { to: '/profile', label: 'Account & password' },
              ].map((action) => (
                <Link
                  key={action.to}
                  to={action.to}
                  className="group flex items-center gap-2.5 rounded-md px-2 py-2 text-[11.5px] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  <span className="truncate">{action.label}</span>
                  <ArrowRight className="ml-auto h-3 w-3 shrink-0 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
