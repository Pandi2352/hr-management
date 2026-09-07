export interface LoginAttempt {
  _id: string;
  email: string;
  userId: string | null;
  success: boolean;
  failureReason: string | null;
  ipAddress: string;
  userAgent: string;
  deviceType: string;
  browser: string;
  createdAt: string;
}

export interface SuspiciousIp {
  ipAddress: string;
  failures: number;
  distinctAccounts: number;
  emails: string[];
  lastAttempt: string;
  windowHours: number;
}

export interface LoginHistoryFilters {
  search?: string;
  outcome?: string;
  reason?: string;
  ipAddress?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}
