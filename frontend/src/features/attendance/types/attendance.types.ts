export type DayStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'WEEKEND' | 'HOLIDAY' | 'LEAVE';

export interface DayRecord {
  day: number;
  status: DayStatus;
  checkIn?: string;
  checkOut?: string;
  hoursWorked?: string;
  notes?: string;
}

export interface EmployeeAttendanceRow {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  avatarUrl?: string;
  records: Record<number, DayRecord>;
  leaveDays: number;
}

export interface MonthlyAttendanceRate {
  month: string;
  onTime: number; // percentage e.g. 60
  late: number;   // percentage e.g. 20
  absent: number; // percentage e.g. 20
  totalEmployees: number;
}

export interface EmployeeTypeDistribution {
  onsite: number;
  remote: number;
  hybrid: number;
  total: number;
}
