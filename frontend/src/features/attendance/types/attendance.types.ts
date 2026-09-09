export interface AttendanceRecord {
  _id: string;
  organizationId: string;
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut: string;
  source: 'WEB' | 'MANUAL';
  status: 'OPEN' | 'PRESENT';
  workMinutes: number;
  isLate?: boolean;
  lateMinutes?: number;
  isEarlyExit?: boolean;
  earlyExitMinutes?: number;
  overtimeMinutes?: number;
  regularized?: boolean;
  note?: string;
  employee?: {
    _id: string;
    employeeCode: string;
    displayName: string;
    avatarUrl?: string | null;
  } | null;
}

export interface AttendanceSummary {
  days: number;
  present: number;
  totalHours: number;
}

/** `HH:mm` → minutes since midnight. */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** minutes → `7h 30m`. */
export function formatWorkMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

/** `YYYY-MM-DD` → `09 Sep 2026`. */
export function formatRecordDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d).padStart(2, '0')} ${months[(m || 1) - 1]} ${y}`;
}
