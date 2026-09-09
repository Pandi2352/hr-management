export interface EmploymentOption {
  value: string;
  label: string;
  badgeClass?: string;
  description?: string;
}

export const EMPLOYMENT_TYPE_OPTIONS: EmploymentOption[] = [
  { value: 'FULL_TIME', label: 'Full-time', description: 'Standard permanent corporate employment' },
  { value: 'PART_TIME', label: 'Part-time', description: 'Reduced hours schedule' },
  { value: 'CONTRACT', label: 'Contract', description: 'Fixed-term independent contractor' },
  { value: 'TEMPORARY', label: 'Temporary', description: 'Project-based interim assignment' },
  { value: 'INTERN', label: 'Intern', description: 'Student or graduate training role' },
  { value: 'CONSULTANT', label: 'Consultant', description: 'Specialized advisory retainer' },
];

export const EMPLOYMENT_STATUS_OPTIONS: EmploymentOption[] = [
  {
    value: 'ACTIVE',
    label: 'Active',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800',
  },
  {
    value: 'PROBATION',
    label: 'Probation',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
  },
  {
    value: 'ON_NOTICE',
    label: 'On Notice',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800',
  },
  {
    value: 'SUSPENDED',
    label: 'Suspended',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800',
  },
  {
    value: 'INACTIVE',
    label: 'Inactive',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  },
  {
    value: 'TERMINATED',
    label: 'Terminated',
    badgeClass: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900',
  },
];

export function getEmploymentTypeLabel(type?: string | null): string {
  if (!type) return 'Not Specified';
  const found = EMPLOYMENT_TYPE_OPTIONS.find((o) => o.value === type);
  if (found) return found.label;
  // Format fallback e.g. FULL_TIME -> Full-time
  return type
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('-');
}

export function getEmploymentStatusLabel(status?: string | null): string {
  if (!status) return 'Active';
  if (status === 'NOTICE_PERIOD') return 'On Notice';
  const found = EMPLOYMENT_STATUS_OPTIONS.find((o) => o.value === status);
  if (found) return found.label;
  return status
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function getEmploymentStatusBadgeClass(status?: string | null): string {
  if (status === 'NOTICE_PERIOD') status = 'ON_NOTICE';
  const found = EMPLOYMENT_STATUS_OPTIONS.find((o) => o.value === status);
  return (
    found?.badgeClass ||
    'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
  );
}
