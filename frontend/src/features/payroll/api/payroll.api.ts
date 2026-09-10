import { apiClient } from '../../../utils/apiClient';
import type { PaginatedResponse } from '../../../types/pagination.types';
import type {
  CreatePayrollPayload,
  PayrollEligibleEmployee,
  PayrollRecord,
  PayrollStatus,
  PayrollSummary,
  SendPayslipResult,
} from '../types/payroll.types';

export interface PayrollFilterParams {
  search?: string;
  status?: PayrollStatus | 'ALL';
  month?: number;
  year?: number;
  page?: number;
  pageSize?: number;
}

export const payrollApi = {
  getPayrolls: async (params: PayrollFilterParams = {}): Promise<PaginatedResponse<PayrollRecord>> => {
    const response = await apiClient.get<{ data: PayrollRecord[]; meta: any }>('/payroll', {
      params,
    });
    return { data: response.data.data, meta: response.data.meta };
  },

  getById: async (id: string): Promise<PayrollRecord> => {
    const response = await apiClient.get<{ data: PayrollRecord }>(`/payroll/${id}`);
    return response.data.data;
  },

  /**
   * Employees selectable for a period. Records already processed come back
   * flagged rather than filtered out, so the dropdown can show *why* a name is
   * unavailable instead of silently omitting it.
   */
  getEligibleEmployees: async (month: number, year: number): Promise<PayrollEligibleEmployee[]> => {
    const response = await apiClient.get<{ data: PayrollEligibleEmployee[] }>(
      '/payroll/employees',
      { params: { month, year } },
    );
    return response.data.data;
  },

  getSummary: async (year: number): Promise<PayrollSummary> => {
    const response = await apiClient.get<{ data: PayrollSummary }>('/payroll/summary', {
      params: { year },
    });
    return response.data.data;
  },

  create: async (payload: CreatePayrollPayload): Promise<PayrollRecord> => {
    const response = await apiClient.post<{ data: PayrollRecord }>('/payroll', payload);
    return response.data.data;
  },

  update: async (id: string, payload: Partial<CreatePayrollPayload>): Promise<PayrollRecord> => {
    const response = await apiClient.patch<{ data: PayrollRecord }>(`/payroll/${id}`, payload);
    return response.data.data;
  },

  remove: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/payroll/${id}`);
    return response.data;
  },

  sendPayslip: async (id: string, email?: string): Promise<SendPayslipResult> => {
    const response = await apiClient.post<{ data: SendPayslipResult }>(
      `/payroll/${id}/send-payslip`,
      email ? { email } : {},
    );
    return response.data.data;
  },

  sendPayslipsForPeriod: async (
    month: number,
    year: number,
  ): Promise<{ total: number; sent: number; failed: number }> => {
    const response = await apiClient.post<{
      data: { total: number; sent: number; failed: number };
    }>('/payroll/send-payslips', { month, year });
    return response.data.data;
  },

  exportCsv: async (params: PayrollFilterParams = {}) => {
    const response = await apiClient.get('/payroll/export', { params, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data as BlobPart]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `payroll-register-${params.year ?? new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
