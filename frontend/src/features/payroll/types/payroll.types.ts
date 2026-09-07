export interface MonthlyPayrollSummary {
  month: string;
  grossSalary: number; // e.g. 55000
  netSalary: number;   // e.g. 25000 (stacked on top)
  taxDeduction: number;// e.g. 24000 (line overlay)
}

export interface CompanyPayBreakdown {
  name: string;
  percentage: number;
  color: string;
  amount: number;
}

export type PayrollStatus = 'Completed' | 'Pending' | 'Reject';

export interface PayrollRecord {
  id: string;
  name: string;
  avatarUrl?: string;
  department: string;
  totalDays: number;
  workingDays: number;
  totalSalary: number;
  overTime: number;
  status: PayrollStatus;
}
