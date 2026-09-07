export type LeaveType = 
  | 'Casual Leave'
  | 'Maternity Leave'
  | 'Sick Leave'
  | 'Paternity Leave'
  | 'Annual Leave'
  | 'Bereavement Leave';

export type LeaveStatus = 'New' | 'Approved' | 'Rejected' | 'Pending';

export interface LeaveMetricItem {
  id: string;
  count: number;
  total: number;
  label: string;
  percentage: number;
  color: string;
  textColor: string;
  isHighlighted?: boolean;
}

export interface LeaveRecord {
  id: string;
  name: string;
  avatarUrl: string;
  leaveType: LeaveType;
  department: string;
  days: string;
  startDate: string;
  endDate: string;
  status: LeaveStatus;
  reason?: string;
}
