import { apiClient } from '../../../utils/apiClient';
import type {
  LeaveBalance,
  LeaveType,
  MyLeaveSummary,
  SeedYearResult,
} from '../types/leave-balance.types';
import type { LeaveRequest } from '../types/leave-request.types';

export const leaveApi = {
  getMyBalances: async (year: number): Promise<MyLeaveSummary> => {
    const res = await apiClient.get('/leave/balances/me', { params: { year } });
    return res.data.data as MyLeaveSummary;
  },

  listBalances: async (params?: {
    employeeId?: string;
    year?: number;
    leaveTypeId?: string;
  }): Promise<LeaveBalance[]> => {
    const res = await apiClient.get('/leave/balances', { params });
    return res.data.data as LeaveBalance[];
  },

  assignBalance: async (dto: {
    employeeId: string;
    leaveTypeId: string;
    year: number;
    allocated: number;
    carriedForward?: number;
    used?: number;
    note?: string;
  }): Promise<LeaveBalance> => {
    const res = await apiClient.post('/leave/balances/assign', dto);
    return res.data.data as LeaveBalance;
  },

  seedYear: async (year: number): Promise<SeedYearResult> => {
    const res = await apiClient.post('/leave/balances/seed-year', { year });
    return res.data.data as SeedYearResult;
  },

  /** One-place global balances: defaults applied to every active employee. */
  applyDefaultsToAll: async (year: number, overwrite = false): Promise<SeedYearResult> => {
    const res = await apiClient.post('/leave/balances/apply-defaults', { year, overwrite });
    return res.data.data as SeedYearResult;
  },

  // --- Leave requests (manager → HR chain) ---

  applyLeave: async (dto: {
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    isHalfDay?: boolean;
    reason?: string;
  }): Promise<LeaveRequest> => {
    const res = await apiClient.post('/leave/requests', dto);
    return res.data.data as LeaveRequest;
  },

  myRequests: async (status?: string): Promise<LeaveRequest[]> => {
    const res = await apiClient.get('/leave/requests/me', { params: { status } });
    return res.data.data as LeaveRequest[];
  },

  approvalsInbox: async (status?: string): Promise<LeaveRequest[]> => {
    const res = await apiClient.get('/leave/requests/inbox', { params: { status } });
    return res.data.data as LeaveRequest[];
  },

  allRequests: async (params?: { status?: string; employeeId?: string }): Promise<LeaveRequest[]> => {
    const res = await apiClient.get('/leave/requests', { params });
    return res.data.data as LeaveRequest[];
  },

  managerDecide: async (id: string, approve: boolean, comments?: string): Promise<LeaveRequest> => {
    const res = await apiClient.post(`/leave/requests/${id}/${approve ? 'manager-approve' : 'manager-reject'}`, { comments });
    return res.data.data as LeaveRequest;
  },

  hrDecide: async (id: string, approve: boolean, comments?: string): Promise<LeaveRequest> => {
    const res = await apiClient.post(`/leave/requests/${id}/${approve ? 'hr-approve' : 'hr-reject'}`, { comments });
    return res.data.data as LeaveRequest;
  },

  cancelRequest: async (id: string): Promise<LeaveRequest> => {
    const res = await apiClient.post(`/leave/requests/${id}/cancel`);
    return res.data.data as LeaveRequest;
  },

  getLeaveTypes: async (status?: string): Promise<LeaveType[]> => {
    const res = await apiClient.get('/leave/types', { params: { status } });
    return res.data.data as LeaveType[];
  },

  createLeaveType: async (dto: Partial<LeaveType>): Promise<LeaveType> => {
    const res = await apiClient.post('/leave/types', dto);
    return res.data.data as LeaveType;
  },

  updateLeaveType: async (id: string, dto: Partial<LeaveType>): Promise<LeaveType> => {
    const res = await apiClient.patch(`/leave/types/${id}`, dto);
    return res.data.data as LeaveType;
  },

  toggleLeaveTypeStatus: async (id: string): Promise<LeaveType> => {
    const res = await apiClient.patch(`/leave/types/${id}/status`);
    return res.data.data as LeaveType;
  },
};
