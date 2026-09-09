import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Mail,
  Building2,
  ArrowRight,
  IdCard,
  Phone,
  MapPin,
  Clock,
  ShieldCheck,
  FileText,
  Lock,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Laptop,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Spinner } from '../../components/ui/Spinner';
import { Avatar, Button } from '../../components/ui';
import { useAuth } from '../auth/context/AuthContext';
import { employeesApi } from '../employees/api/employees.api';
import type { Employee, ProfileCompletion } from '../employees/types/employees.types';
import {
  getEmploymentTypeLabel,
  getEmploymentStatusLabel,
  getEmploymentStatusBadgeClass,
} from '../employees/constants/employment.constants';

/**
 * Profile Completion Circular Gauge & Progress Breakdown Component
 */
function ProfileCompletionWidget({
  completion,
  employeeId,
}: {
  completion?: ProfileCompletion;
  employeeId: string;
}) {
  const percentage = completion?.percentage ?? 0;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // Pick color based on completion tier
  const strokeColor =
    percentage >= 100
      ? 'stroke-emerald-500'
      : percentage >= 75
      ? 'stroke-violet-500'
      : percentage >= 50
      ? 'stroke-amber-500'
      : 'stroke-rose-500';

  const textColor =
    percentage >= 100
      ? 'text-emerald-600 dark:text-emerald-400'
      : percentage >= 75
      ? 'text-violet-600 dark:text-violet-400'
      : percentage >= 50
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-rose-600 dark:text-rose-400';

  const missingFields = completion?.missingFields || [];

  return (
    <div className="rounded-md border border-hairline bg-surface p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-hairline pb-3">
        <div>
          <h3 className="text-[13px] font-bold text-ink flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-[var(--primary)]" />
            Profile Completion
          </h3>
          <p className="text-[11px] text-ink-3">Keep your employee record complete and accurate</p>
        </div>
        <span
          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
            percentage >= 100
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
          }`}
        >
          {percentage >= 100 ? 'Complete' : `${100 - percentage}% remaining`}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* Circular Chart & Score */}
        <div className="md:col-span-4 flex flex-col items-center justify-center p-3 rounded-lg bg-surface-2/40 border border-hairline">
          <div className="relative flex items-center justify-center">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle
                cx="48"
                cy="48"
                r={radius}
                className="stroke-slate-200 dark:stroke-slate-700"
                strokeWidth="7"
                fill="transparent"
              />
              <circle
                cx="48"
                cy="48"
                r={radius}
                className={`${strokeColor} transition-all duration-1000 ease-out`}
                strokeWidth="7"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className={`text-xl font-extrabold ${textColor}`}>
                {percentage}%
              </span>
              <span className="text-[9px] uppercase tracking-wider font-semibold text-ink-3">
                Score
              </span>
            </div>
          </div>
          <p className="mt-2 text-[11px] font-medium text-ink-2 text-center">
            {percentage >= 100
              ? 'All profile requirements met'
              : `${missingFields.length} field${missingFields.length === 1 ? '' : 's'} to complete`}
          </p>
        </div>

        {/* Missing Fields Checklist or All Done */}
        <div className="md:col-span-8 space-y-3">
          {percentage >= 100 ? (
            <div className="p-3.5 rounded-md bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  Profile is 100% Complete!
                </p>
                <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                  Great job! All personal, contact, emergency, employment, work info, and payroll details are documented.
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-3">
                  Missing Fields to Handle Completion
                </span>
                <Link
                  to={`/employees/${employeeId}/edit`}
                  className="text-[11px] font-semibold text-[var(--primary)] hover:underline inline-flex items-center gap-1"
                >
                  Complete Now
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {missingFields.map((field, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-surface-2/60 border border-hairline text-xs"
                  >
                    <span className="flex items-center gap-1.5 text-ink-2 truncate">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">{field}</span>
                    </span>
                    <Link
                      to={
                        field.toLowerCase().includes('document')
                          ? `/employees/${employeeId}?tab=documents`
                          : `/employees/${employeeId}/edit`
                      }
                      className="text-[10px] font-bold text-[var(--primary)] hover:underline shrink-0 ml-2"
                    >
                      Fill
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sectional Indicators */}
          {completion?.sections && (
            <div className="pt-2 border-t border-hairline">
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: 'personal', label: 'Personal' },
                  { key: 'contact', label: 'Contact & Address' },
                  { key: 'emergency', label: 'Emergency' },
                  { key: 'employment', label: 'Employment' },
                  { key: 'workInfo', label: 'Work Info' },
                  { key: 'identification', label: 'ID Proof' },
                  { key: 'payroll', label: 'Payroll' },
                ].map((s) => {
                  const isDone = Boolean((completion.sections as any)[s.key]);
                  return (
                    <span
                      key={s.key}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        isDone
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800'
                          : 'bg-surface-2 text-ink-3 border-hairline'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      )}
                      {s.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Self-service view for a signed-in employee.
 *
 * Resolves the viewer's own employee record using /employees/me,
 * showing profile completion chart, organizational details, manager info, and shortcuts.
 */
export function EmployeeDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    employeesApi
      .getMyProfile()
      .then((res) => {
        if (!active) return;
        setEmployee(res);
      })
      .catch(() => {
        if (!active) return;
        // Fallback: search by user email if getMyProfile fails
        if (user?.email) {
          employeesApi
            .getEmployees({ search: user.email, pageSize: 1 })
            .then((res) => {
              if (active) setEmployee(res.data?.[0] ?? null);
            })
            .catch(() => active && setEmployee(null));
        } else {
          setEmployee(null);
        }
      })
      .finally(() => active && setIsLoading(false));

    return () => {
      active = false;
    };
  }, [user?.email]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <Spinner size="lg" variant="violet" />
        <p className="animate-pulse text-xs font-medium text-ink-3">Loading your employee dashboard…</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <PageHeader
        title={`Welcome back, ${employee?.displayName || user?.firstName || 'there'}!`}
        description="Your Employee Self-Service (ESS) hub: personal profile, organization assignment, and document management."
      />

      {!employee ? (
        <div className="rounded-md border border-dashed border-hairline bg-surface p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-ink-3">
            <IdCard className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-ink">No employee profile linked</h3>
          <p className="mx-auto mt-1 max-w-md text-xs text-ink-3">
            Your login account ({user?.email}) hasn't been linked to an employee record yet. Your HR administrator can create or link your record from the Employee Directory.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 1. PROFILE COMPLETION CHART & MISSING FIELDS */}
          <ProfileCompletionWidget
            completion={employee.profileCompletion}
            employeeId={employee._id}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* 2. EMPLOYEE IDENTITY & EMPLOYMENT DETAILS (2 COLS) */}
            <div className="rounded-md border border-hairline bg-surface p-5 lg:col-span-2 space-y-5">
              {/* Header profile info */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3.5">
                  <Avatar
                    src={employee.avatarUrl}
                    name={employee.displayName || `${employee.firstName} ${employee.lastName}`}
                    size="xl"
                    className="border border-hairline ring-2 ring-[var(--primary)]/20"
                  />
                  <div>
                    <h3 className="text-base font-bold text-ink">
                      {employee.displayName || `${employee.firstName} ${employee.lastName}`}
                    </h3>
                    <p className="text-xs font-medium text-ink-3">
                      {(employee as any).designationTitle || employee.designation?.title || 'Team Member'}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold text-ink-2 bg-surface-2 px-1.5 py-0.5 rounded">
                        {employee.employeeCode}
                      </span>
                      <span
                        className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full border ${getEmploymentStatusBadgeClass(
                          employee.status
                        )}`}
                      >
                        {getEmploymentStatusLabel(employee.status)}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/employees/${employee._id}/edit`)}
                  className="text-xs cursor-pointer"
                >
                  Edit Profile
                </Button>
              </div>

              {/* Organizational Assignment Grid (HR-controlled details) */}
              <div className="rounded-md border border-hairline bg-surface-2/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-ink-3 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-[var(--primary)]" />
                    Organizational Alignment
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-surface px-1.5 py-0.5 rounded border border-hairline">
                    <Lock className="h-2.5 w-2.5" />
                    HR Managed
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-medium uppercase tracking-wide text-ink-3 block">Department</span>
                    <p className="font-semibold text-ink truncate">
                      {(employee as any).departmentName || employee.department?.name || 'Unassigned'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-medium uppercase tracking-wide text-ink-3 block">Designation</span>
                    <p className="font-semibold text-ink truncate">
                      {(employee as any).designationTitle || employee.designation?.title || 'Staff'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-medium uppercase tracking-wide text-ink-3 block">Office Location</span>
                    <p className="font-semibold text-ink truncate">
                      {employee.location?.name || 'Main Office'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-medium uppercase tracking-wide text-ink-3 block">Employment Type</span>
                    <p className="font-semibold text-ink">
                      {getEmploymentTypeLabel(employee.employmentType)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-medium uppercase tracking-wide text-ink-3 block">Work Type</span>
                    <p className="font-semibold text-ink flex items-center gap-1">
                      <Laptop className="h-3 w-3 text-ink-3" />
                      {employee.workType ? employee.workType.replace('_', ' ') : 'ON SITE'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-medium uppercase tracking-wide text-ink-3 block">Shift Schedule</span>
                    <p className="font-semibold text-ink flex items-center gap-1">
                      <Clock className="h-3 w-3 text-ink-3" />
                      {employee.shift || 'GENERAL'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Direct Reporting Manager Card */}
              <div className="rounded-md border border-hairline bg-surface-2/40 p-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-3 block mb-2">
                  Direct Reporting Manager
                </span>
                {employee.manager ? (
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={employee.manager.avatarUrl}
                      name={employee.manager.displayName || `${employee.manager.firstName} ${employee.manager.lastName}`}
                      size="md"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-ink truncate">
                        {employee.manager.displayName || `${employee.manager.firstName} ${employee.manager.lastName}`}
                      </p>
                      <p className="text-[11px] font-mono text-ink-3">
                        {employee.manager.employeeCode}
                      </p>
                    </div>
                    {employee.manager.workEmail && (
                      <a
                        href={`mailto:${employee.manager.workEmail}`}
                        className="ml-auto text-xs text-[var(--primary)] hover:underline inline-flex items-center gap-1"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Contact</span>
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-ink-3 italic">Reports to Executive / Board Tier</p>
                )}
              </div>

              {/* Contact Information (Editable by Employee) */}
              <div className="border-t border-hairline pt-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-3 block mb-2.5">
                  Direct Contact Information
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-ink-3 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-ink-3 block">Work Email (Organization)</span>
                      <p className="font-mono font-medium text-ink truncate">{employee.workEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-ink-3 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-ink-3 block">Personal Email (Login Gmail)</span>
                      <p className="font-mono font-medium text-ink truncate">{employee.personalEmail || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-ink-3 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-ink-3 block">Personal Mobile</span>
                      <p className="font-mono font-medium text-ink">{employee.phone || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-ink-3 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-ink-3 block">Residential Address</span>
                      <p className="font-medium text-ink truncate">
                        {employee.currentAddress?.city
                          ? `${employee.currentAddress.city}, ${employee.currentAddress.country || ''}`
                          : 'Not provided'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. SIDEBAR: SHORTCUTS & QUICK ACTIONS */}
            <div className="space-y-4">
              {/* Quick Self-Service Shortcuts */}
              <div className="rounded-md border border-hairline bg-surface p-5">
                <h3 className="text-[13px] font-bold text-ink">Self Service Actions</h3>
                <p className="text-[11px] text-ink-3 mt-0.5">Quick access to manage your profile</p>

                <div className="mt-4 space-y-1.5">
                  {[
                    {
                      to: `/employees/${employee._id}`,
                      label: 'View Full Profile & History',
                      icon: IdCard,
                    },
                    {
                      to: `/employees/${employee._id}/edit`,
                      label: 'Edit Personal Details & Photo',
                      icon: UserCheck,
                    },
                    {
                      to: `/employees/${employee._id}?tab=documents`,
                      label: 'Document Vault & Uploads',
                      icon: FileText,
                    },
                    {
                      to: '/profile',
                      label: 'Account Security & Password',
                      icon: ShieldCheck,
                    },
                  ].map((action) => (
                    <Link
                      key={action.to}
                      to={action.to}
                      className="group flex items-center gap-2.5 rounded-md p-2.5 text-xs font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink border border-transparent hover:border-hairline"
                    >
                      <action.icon className="h-4 w-4 text-[var(--primary)] shrink-0" />
                      <span className="truncate">{action.label}</span>
                      <ArrowRight className="ml-auto h-3 w-3 shrink-0 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  ))}
                </div>
              </div>

              {/* Documents Status Mini-Card */}
              <div className="rounded-md border border-hairline bg-surface p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[13px] font-bold text-ink flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-[var(--primary)]" />
                    Uploaded Documents
                  </h3>
                  <Link
                    to={`/employees/${employee._id}?tab=documents`}
                    className="text-[11px] font-semibold text-[var(--primary)] hover:underline"
                  >
                    View All
                  </Link>
                </div>
                <p className="text-[11px] text-ink-3">
                  {(employee.documents || []).length} document{(employee.documents || []).length === 1 ? '' : 's'} registered in your vault.
                </p>

                <div className="mt-3 space-y-2">
                  {(employee.documents || []).slice(0, 3).map((doc, i) => (
                    <div
                      key={doc.id || i}
                      className="flex items-center justify-between p-2 rounded bg-surface-2/60 border border-hairline text-xs"
                    >
                      <span className="truncate font-medium text-ink-2 max-w-[140px]">
                        {doc.title || doc.documentName || 'Document'}
                      </span>
                      <span
                        className={`text-[9.5px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          doc.verificationStatus === 'VERIFIED'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : doc.verificationStatus === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                        }`}
                      >
                        {doc.verificationStatus || 'PENDING'}
                      </span>
                    </div>
                  ))}

                  <Link
                    to={`/employees/${employee._id}?tab=documents`}
                    className="block text-center mt-2 p-2 rounded border border-dashed border-hairline hover:bg-surface-2 text-xs font-medium text-[var(--primary)] transition-colors"
                  >
                    + Upload New Document
                  </Link>
                </div>
              </div>

              {/* Profile Access Rules Notice */}
              <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  <Lock className="h-3.5 w-3.5 text-slate-500" />
                  Profile Access Rules
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Employees may edit personal contact details, residential address, and profile photo anytime. Structural organizational data (department, role, salary, payroll) are managed strictly by HR Administration.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
