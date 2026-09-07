import { apiClient } from '../../../utils/apiClient';

export interface DepartmentHeadcount {
  departmentId: string | null;
  name: string;
  code: string;
  count: number;
}

export interface EmployeeStats {
  total: number;
  newJoinersThisMonth: number;
  departmentCount: number;
  byStatus: Record<string, number>;
  byEmploymentType: Record<string, number>;
  byDepartment: DepartmentHeadcount[];
}

export const dashboardApi = {
  async getEmployeeStats(): Promise<EmployeeStats> {
    const res = await apiClient.get('/employees/stats');
    return res.data?.data ?? res.data;
  },
};
