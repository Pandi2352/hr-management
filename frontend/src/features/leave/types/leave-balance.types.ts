export interface LeaveType {
  _id: string;
  organizationId: string;
  code: string;
  name: string;
  description?: string;
  defaultAllocation: number;
  carryForwardAllowed: boolean;
  maxCarryForward: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface LeaveBalance {
  _id: string;
  organizationId: string;
  employeeId: string;
  leaveTypeId: string;
  year: number;
  allocated: number;
  carriedForward: number;
  used: number;
  pending: number;
  /** Server-computed: allocated + carriedForward − used − pending. */
  available: number;
  note?: string;
  employee?: {
    _id: string;
    employeeCode: string;
    displayName: string;
    workEmail: string;
    avatarUrl?: string | null;
  } | null;
  leaveType?: {
    _id: string;
    code: string;
    name: string;
    carryForwardAllowed: boolean;
    maxCarryForward: number;
  } | null;
}

export interface MyLeaveSummary {
  employee: { _id: string; employeeCode: string; displayName: string };
  year: number;
  balances: LeaveBalance[];
  restricted: {
    limit: number;
    availed: number;
    remaining: number;
    availedHolidayIds: string[];
  };
}

export interface SeedYearResult {
  created: number;
  updated?: number;
  carriedTotal: number;
  employees: number;
  leaveTypes: number;
  year: number;
}
