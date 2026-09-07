import { apiClient } from '../../../utils/apiClient';
import type { DocumentItem, Employee, EmployeeFilterParams } from '../types/employees.types';
import type { PaginatedResponse } from '../../../types/pagination.types';

export const employeesApi = {
  getEmployees: async (params: EmployeeFilterParams = {}): Promise<PaginatedResponse<Employee>> => {
    const response = await apiClient.get<{ success: boolean; data: Employee[]; meta: any }>(
      '/employees',
      { params }
    );
    return {
      data: response.data.data,
      meta: response.data.meta,
    };
  },

  getEmployeeById: async (id: string): Promise<Employee> => {
    const response = await apiClient.get<{ success: boolean; data: Employee }>(`/employees/${id}`);
    return response.data.data;
  },

  createEmployee: async (dto: Partial<Employee>): Promise<Employee> => {
    const response = await apiClient.post<{ success: boolean; data: Employee }>('/employees', dto);
    return response.data.data;
  },

  updateEmployee: async (id: string, dto: Partial<Employee>): Promise<Employee> => {
    const response = await apiClient.patch<{ success: boolean; data: Employee }>(
      `/employees/${id}`,
      dto
    );
    return response.data.data;
  },

  deleteEmployee: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `/employees/${id}`
    );
    return response.data;
  },

  changeEmployeeStatus: async (
    id: string,
    status: string,
    reason?: string,
    effectiveDate?: string,
  ): Promise<Employee> => {
    const response = await apiClient.patch<{ success: boolean; data: Employee }>(
      `/employees/${id}/status`,
      { status, reason, effectiveDate }
    );
    return response.data.data;
  },

  resendOnboarding: async (id: string): Promise<{ success: boolean; message: string; employee?: Employee }> => {
    const response = await apiClient.post<{ success: boolean; message: string; employee?: Employee }>(
      `/employees/${id}/resend-onboarding`
    );
    return response.data;
  },

  // --- Document vault ---------------------------------------------------

  uploadDocument: async (
    employeeId: string,
    file: File,
    meta: { title: string; category: string },
    onProgress?: (percent: number) => void
  ): Promise<DocumentItem> => {
    const form = new FormData();
    form.append('file', file);
    form.append('title', meta.title);
    form.append('category', meta.category);

    const response = await apiClient.post<{ success: boolean; data: DocumentItem }>(
      `/employees/${employeeId}/documents`,
      form,
      {
        onUploadProgress: (event) => {
          if (!onProgress || !event.total) return;
          onProgress(Math.round((event.loaded * 100) / event.total));
        },
      }
    );
    return response.data.data;
  },

  /**
   * Documents sit behind an authenticated route, so they can't be linked
   * directly — fetch as a blob and hand the caller an object URL to revoke.
   */
  fetchDocumentBlobUrl: async (employeeId: string, documentId: string): Promise<string> => {
    const response = await apiClient.get(
      `/employees/${employeeId}/documents/${documentId}/download`,
      { responseType: 'blob' }
    );
    return window.URL.createObjectURL(response.data as Blob);
  },

  downloadDocument: async (employeeId: string, doc: DocumentItem) => {
    const url = await employeesApi.fetchDocumentBlobUrl(employeeId, doc.id!);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', doc.fileName || doc.title);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  reviewDocument: async (
    employeeId: string,
    documentId: string,
    payload: { status: 'VERIFIED' | 'REJECTED'; note?: string }
  ): Promise<DocumentItem> => {
    const response = await apiClient.patch<{ success: boolean; data: DocumentItem }>(
      `/employees/${employeeId}/documents/${documentId}/review`,
      payload
    );
    return response.data.data;
  },

  deleteDocument: async (
    employeeId: string,
    documentId: string
  ): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      `/employees/${employeeId}/documents/${documentId}`
    );
    return response.data;
  },

  exportEmployeesCsv: async (params: EmployeeFilterParams = {}) => {
    const response = await apiClient.get('/employees/export', {
      params,
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `employees-export-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
};
