import { apiClient } from '../../../utils/apiClient';
import type {
  LeaveBalance,
  LeaveType,
  MyLeaveSummary,
  SeedYearResult,
} from '../types/leave-balance.types';

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
