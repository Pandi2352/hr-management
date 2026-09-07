import type {
  EmployeeAttendanceRow,
  MonthlyAttendanceRate,
  EmployeeTypeDistribution,
  DayRecord,
} from '../types/attendance.types';

export const MOCK_ATTENDANCE_RATES: MonthlyAttendanceRate[] = [
  { month: 'Jan', onTime: 60, late: 21, absent: 19, totalEmployees: 980 },
  { month: 'Feb', onTime: 58, late: 23, absent: 19, totalEmployees: 992 },
  { month: 'Mar', onTime: 54, late: 26, absent: 20, totalEmployees: 1005 },
  { month: 'Apr', onTime: 74, late: 9, absent: 17, totalEmployees: 1012 },
  { month: 'May', onTime: 40, late: 23, absent: 37, totalEmployees: 1018 },
  { month: 'Jun', onTime: 52, late: 31, absent: 17, totalEmployees: 1024 },
  { month: 'Jul', onTime: 31, late: 47, absent: 22, totalEmployees: 1030 },
  { month: 'Aug', onTime: 66, late: 16, absent: 18, totalEmployees: 1035 },
  { month: 'Sep', onTime: 66, late: 16, absent: 18, totalEmployees: 1042 },
  { month: 'Oct', onTime: 66, late: 16, absent: 18, totalEmployees: 1048 },
  { month: 'Nov', onTime: 66, late: 16, absent: 18, totalEmployees: 1050 },
  { month: 'Dec', onTime: 66, late: 16, absent: 18, totalEmployees: 1055 },
];

export const MOCK_EMPLOYEE_DISTRIBUTION: EmployeeTypeDistribution = {
  onsite: 800,
  remote: 105,
  hybrid: 301,
  total: 1000,
};

// Helper to generate 31 days with typical enterprise pattern
function generateDayRecords(absentDays: number[], lateDays: number[]): Record<number, DayRecord> {
  const records: Record<number, DayRecord> = {};
  for (let day = 1; day <= 31; day++) {
    // Weekend logic (e.g. Saturdays & Sundays, say day 2,3, 9,10, 16,17, 23,24, 30,31)
    if (absentDays.includes(day)) {
      records[day] = {
        day,
        status: 'ABSENT',
        notes: 'Unplanned Absence / Sick',
      };
    } else if (lateDays.includes(day)) {
      records[day] = {
        day,
        status: 'LATE',
        checkIn: '09:42 AM',
        checkOut: '06:15 PM',
        hoursWorked: '8h 33m',
        notes: 'Late clock-in: +42 mins',
      };
    } else {
      records[day] = {
        day,
        status: 'PRESENT',
        checkIn: '08:55 AM',
        checkOut: '05:30 PM',
        hoursWorked: '8h 35m',
        notes: 'On Time & Shift Complete',
      };
    }
  }
  return records;
}

export const MOCK_EMPLOYEES: EmployeeAttendanceRow[] = [
  {
    id: 'emp-1',
    name: 'Anthony Thomas',
    email: 'anthony.thomas@peopleos.internal',
    department: 'Product Design',
    role: 'Lead UI/UX Designer',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    records: generateDayRecords([7, 10, 14, 21, 24, 27], []),
    leaveDays: 3,
  },
  {
    id: 'emp-2',
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@peopleos.internal',
    department: 'Engineering',
    role: 'Senior Staff Engineer',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    records: generateDayRecords([3, 17], [5, 12, 19]),
    leaveDays: 2,
  },
  {
    id: 'emp-3',
    name: 'Michael Chen',
    email: 'michael.chen@peopleos.internal',
    department: 'Finance & Ops',
    role: 'Financial Analyst Lead',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    records: generateDayRecords([15, 29], [2, 8]),
    leaveDays: 1,
  },
  {
    id: 'emp-4',
    name: 'Emily Rodriguez',
    email: 'emily.rodriguez@peopleos.internal',
    department: 'Human Resources',
    role: 'Senior Talent Partner',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80',
    records: generateDayRecords([6, 13, 20], [9, 22]),
    leaveDays: 4,
  },
  {
    id: 'emp-5',
    name: 'David Kim',
    email: 'david.kim@peopleos.internal',
    department: 'Security & DevOps',
    role: 'Infrastructure Architect',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
    records: generateDayRecords([], [4, 11, 18, 25]),
    leaveDays: 0,
  },
  {
    id: 'emp-6',
    name: 'Jessica Taylor',
    email: 'jessica.taylor@peopleos.internal',
    department: 'Legal & Compliance',
    role: 'Corporate Legal Counsel',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80',
    records: generateDayRecords([8, 22], [1, 16]),
    leaveDays: 2,
  },
  {
    id: 'emp-7',
    name: 'Alex Morgan',
    email: 'alex.morgan@peopleos.internal',
    department: 'Marketing',
    role: 'Brand Growth Director',
    avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100&auto=format&fit=crop&q=80',
    records: generateDayRecords([12, 19, 26], [7]),
    leaveDays: 3,
  },
  {
    id: 'emp-8',
    name: 'Sophia Patel',
    email: 'sophia.patel@peopleos.internal',
    department: 'Customer Success',
    role: 'Enterprise Solutions Lead',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80',
    records: generateDayRecords([10], [3, 14, 21]),
    leaveDays: 1,
  },
];
