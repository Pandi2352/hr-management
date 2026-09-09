export type LeaveRequestStatus =
  | 'PENDING_MANAGER'
  | 'PENDING_HR'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED';

export interface ApprovalStep {
  stage: string;
  approverId?: string | null;
  approverName?: string;
  action: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';
  comments?: string;
  actedAt?: string | null;
}

export interface LeaveRequest {
  _id: string;
  organizationId: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  isHalfDay: boolean;
  reason?: string;
  status: LeaveRequestStatus;
  steps: ApprovalStep[];
  createdAt?: string;
  employee?: {
    _id: string;
    employeeCode: string;
    displayName: string;
    avatarUrl?: string | null;
    managerId?: string | null;
  } | null;
  leaveType?: { _id: string; code: string; name: string } | null;
}

export const LEAVE_STATUS_META: Record<LeaveRequestStatus, { label: string; classes: string }> = {
  PENDING_MANAGER: {
    label: 'With Manager',
    classes: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  },
  PENDING_HR: {
    label: 'With HR',
    classes: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
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
