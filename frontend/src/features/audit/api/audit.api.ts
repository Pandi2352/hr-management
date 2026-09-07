import { apiClient } from '../../../utils/apiClient';
import type { AuditFilters, AuditLog, AuditMeta, AuditVocabulary } from '../types/audit.types';
import type {
  LoginAttempt,
  LoginHistoryFilters,
  SuspiciousIp,
} from '../types/login-history.types';

function toParams<T extends object>(filters: T) {
  const params: Record<string, string | number> = {};
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== 'ALL') {
      params[key] = value as string | number;
    }
  });
  return params;
}

export const auditApi = {
  /** Action/resource vocabulary used to populate the filter dropdowns. */
  async getVocabulary(): Promise<AuditVocabulary> {
    const res = await apiClient.get('/audit/meta');
    return res.data?.data ?? res.data;
  },

  async getLogs(filters: AuditFilters = {}): Promise<{ data: AuditLog[]; meta: AuditMeta }> {
    const res = await apiClient.get('/audit/logs', { params: toParams(filters) });
    return {
      data: res.data?.data ?? [],
      meta: res.data?.meta ?? {
        total: 0,
        page: 1,
        limit: 25,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  },

  async getLogById(id: string): Promise<AuditLog> {
    const res = await apiClient.get(`/audit/logs/${id}`);
    return res.data?.data ?? res.data;
  },

  async getLoginHistory(
    filters: LoginHistoryFilters = {},
  ): Promise<{ data: LoginAttempt[]; meta: AuditMeta }> {
    const res = await apiClient.get('/audit/login-history', { params: toParams(filters) });
    return {
      data: res.data?.data ?? [],
      meta: res.data?.meta ?? {
        total: 0,
        page: 1,
        limit: 25,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    };
  },

  async getSuspiciousLogins(): Promise<SuspiciousIp[]> {
    const res = await apiClient.get('/audit/login-history/suspicious');
    return res.data?.data ?? [];
  },

  /** Server applies the same filters to the export, then audits the export itself. */
  async exportLogs(filters: AuditFilters = {}): Promise<void> {
    const res = await apiClient.get('/audit/logs/export', {
      params: toParams(filters),
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
