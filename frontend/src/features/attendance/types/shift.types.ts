export interface Shift {
  _id: string;
  organizationId: string;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
  breakMinutes: number;
  status: 'ACTIVE' | 'INACTIVE';
  assignedCount?: number;
}

export type RegularizationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface Regularization {
  _id: string;
  organizationId: string;
  employeeId: string;
  date: string;
  requestedCheckIn: string;
  requestedCheckOut: string;
  reason: string;
  status: RegularizationStatus;
  decidedBy?: string | null;
  decisionNote?: string;
  decidedAt?: string | null;
  employee?: {
    _id: string;
    employeeCode: string;
    displayName: string;
    avatarUrl?: string | null;
    managerId?: string | null;
  } | null;
}

export const REG_STATUS_META: Record<RegularizationStatus, { label: string; classes: string }> = {
  PENDING: {
    label: 'Pending',
    classes: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  },
  APPROVED: {
    label: 'Approved',
    classes: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  },
  REJECTED: {
    label: 'Rejected',
    classes: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
  },
  CANCELLED: {
    label: 'Cancelled',
    classes: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
  },
};
