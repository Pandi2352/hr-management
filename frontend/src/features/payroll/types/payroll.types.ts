export type PayrollStatus = 'PENDING' | 'COMPLETED' | 'REJECTED';
export type PayslipEmailStatus = 'NOT_SENT' | 'SENT' | 'FAILED';

/** Human labels for the status pills; the wire values stay uppercase. */
export const PAYROLL_STATUS_LABEL: Record<PayrollStatus, string> = {
  COMPLETED: 'Completed',
  PENDING: 'Pending',
  REJECTED: 'Rejected',
};

/** A processed payroll run for one employee in one month. */
export interface PayrollRecord {
  _id: string;
  organizationId: string;
  employeeId: string;

  employeeName: string;
  employeeCode: string;
  employeeEmail: string;
  departmentName: string;
  designationTitle: string;

  month: number;
  year: number;
  totalDays: number;
  workingDays: number;
  lopDays: number;

  basicSalary: number;
  allowances: number;
  bonus: number;
  overtimeAmount: number;

  taxDeduction: number;
  providentFund: number;
  otherDeductions: number;

  /** All four are computed server-side and are read-only to the client. */
  earnedBasic: number;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;

  currency: string;
  status: PayrollStatus;
  remarks?: string;

  payslipEmailStatus: PayslipEmailStatus;
  payslipSentAt?: string | null;
  payslipSendCount: number;

  paidOn?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** An option in the "select employee" dropdown. */
export interface PayrollEligibleEmployee {
  _id: string;
  name: string;
  employeeCode: string;
  workEmail: string;
  avatarUrl?: string;
  departmentName: string;
  designationTitle: string;
  /** Already has payroll for the chosen period — offered but not selectable. */
  alreadyProcessed: boolean;
}

export interface CreatePayrollPayload {
  employeeId: string;
  month: number;
  year: number;
  totalDays: number;
  workingDays: number;
  basicSalary: number;
  allowances?: number;
  bonus?: number;
  overtimeAmount?: number;
  taxDeduction?: number;
  providentFund?: number;
  otherDeductions?: number;
  status?: PayrollStatus;
  remarks?: string;
  sendPayslip?: boolean;
}

export interface MonthlyPayrollSummary {
  month: string;
  grossSalary: number;
  netSalary: number;
  taxDeduction: number;
}

export interface CompanyPayBreakdown {
  name: string;
  amount: number;
  percentage: number;
  /** Assigned on the client so the palette stays a presentation concern. */
  color?: string;
}

export interface PayrollSummary {
  year: number;
  monthly: MonthlyPayrollSummary[];
  breakdown: CompanyPayBreakdown[];
  totals: {
    grossPayout: number;
    netPayout: number;
    totalDeductions: number;
    recordCount: number;
  };
  byStatus: Partial<Record<PayrollStatus, number>>;
}

export interface SendPayslipResult {
  sent: boolean;
  email: string;
  message: string;
}
