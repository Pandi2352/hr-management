import { apiClient } from '../../../utils/apiClient';
import type { Role, SecurityPolicy, Invitation, UserMetrics } from '../types/security.types';

export const securityApi = {
  // --- USERS ---
  getUsers: async (params?: {
    search?: string;
    role?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const res = await apiClient.get<any>('/users', { params });
    const payload = res.data?.data !== undefined ? res.data.data : res.data;
    return {
      data: Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [],
      total: payload?.total || 0,
      page: payload?.page || 1,
      pageSize: payload?.pageSize || 20,
      totalPages: payload?.totalPages || 1,
    };
  },

  updateUserStatus: async (userId: string, status: string) => {
    const res = await apiClient.patch<any>(`/users/${userId}/status`, { status });
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  unlockUser: async (userId: string) => {
    const res = await apiClient.post<any>(`/users/${userId}/unlock`);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  assignRoles: async (userId: string, roles: string[], departmentScope?: string[]) => {
    const res = await apiClient.patch<any>(`/users/${userId}/roles`, {
      roles,
      ...(departmentScope !== undefined ? { departmentScope } : {}),
    });
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  sendPasswordReset: async (userId: string) => {
    const res = await apiClient.post<any>(`/users/${userId}/reset-password`);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  terminateSessions: async (userId: string) => {
    const res = await apiClient.post<any>(`/users/${userId}/terminate-sessions`);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  getMetrics: async (): Promise<UserMetrics> => {
    const res = await apiClient.get<any>('/users/metrics');
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  // --- INVITATIONS (Admin) ---
  getInvitations: async (params?: {
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }) => {
    const res = await apiClient.get<any>('/users/invitations', { params });
    const payload = res.data?.data !== undefined ? res.data.data : res.data;
    return {
      data: Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [],
      total: payload?.total || 0,
      page: payload?.page || 1,
      pageSize: payload?.pageSize || 20,
      totalPages: payload?.totalPages || 1,
    };
  },

  createInvitation: async (payload: {
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
    expiryHours?: number;
  }): Promise<Invitation> => {
    const res = await apiClient.post<any>('/users/invitations', payload);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  resendInvitation: async (id: string) => {
    const res = await apiClient.post<any>(`/users/invitations/${id}/resend`);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  revokeInvitation: async (id: string) => {
    const res = await apiClient.delete<any>(`/users/invitations/${id}`);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  // --- ROLES & PERMISSIONS ---
  getRoles: async (): Promise<Role[]> => {
    const res = await apiClient.get<any>('/users/roles');
    const data = res.data?.data !== undefined ? res.data.data : res.data;
    return Array.isArray(data) ? data : [];
  },

  getRoleById: async (roleId: string): Promise<Role> => {
    const res = await apiClient.get<any>(`/users/roles/${roleId}`);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  createRole: async (payload: {
    name: string;
    code: string;
    description?: string;
    permissions: string[];
  }): Promise<Role> => {
    const res = await apiClient.post<any>('/users/roles', payload);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  updateRole: async (
    roleId: string,
    payload: {
      name?: string;
      description?: string;
      permissions?: string[];
    },
  ): Promise<Role> => {
    const res = await apiClient.patch<any>(`/users/roles/${roleId}`, payload);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  deleteRole: async (roleId: string) => {
    const res = await apiClient.delete<any>(`/users/roles/${roleId}`);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  // --- SECURITY POLICY ---
  getSecurityPolicy: async (): Promise<SecurityPolicy> => {
    const res = await apiClient.get<any>('/users/security-policy');
    return res.data?.data !== undefined ? res.data.data : res.data;
  },

  updateSecurityPolicy: async (payload: Partial<SecurityPolicy>): Promise<SecurityPolicy> => {
    const res = await apiClient.put<any>('/users/security-policy', payload);
    return res.data?.data !== undefined ? res.data.data : res.data;
  },
};
