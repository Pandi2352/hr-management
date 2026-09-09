import { apiClient } from "../../../utils/apiClient";
import type { PasswordPolicy } from "../validation/password.validation";

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthUser {
  id: string; // UUID
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
  organizationId: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  location?: string | null;
  bio?: string | null;
  linkedEmployeeId?: string | null;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  expiresIn: number;
}

export const authApi = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const response = await apiClient.post('/auth/login', payload);
    return response.data.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  async getMe(): Promise<AuthUser> {
    const response = await apiClient.get('/auth/me');
    return response.data.data;
  },

  async forgotPassword(email: string): Promise<{ message: string; expiresIn?: number }> {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return {
      message: response.data.message,
      expiresIn: response.data.data?.expiresIn,
    };
  },

  async resetPassword(payload: { email: string; otp: string; newPassword: string }): Promise<{ message: string }> {
    const response = await apiClient.post('/auth/reset-password', payload);
    return {
      message: response.data.message,
    };
  },

  async validateResetToken(token: string): Promise<{ valid: boolean; email?: string }> {
    const response = await apiClient.post('/auth/reset-password/validate', { token });
    return response.data.data;
  },

  async resetPasswordWithToken(payload: { token: string; password: string }): Promise<{ message: string }> {
    const response = await apiClient.post('/auth/reset-password-with-token', payload);
    return {
      message: response.data.message,
    };
  },

  async changePassword(payload: { currentPassword: string; newPassword: string }): Promise<{ message: string }> {
    const response = await apiClient.post('/auth/change-password', payload);
    return {
      message: response.data.message,
    };
  },

  async getPasswordPolicy(): Promise<PasswordPolicy> {
    const response = await apiClient.get('/auth/password-policy');
    return response.data.data;
  },
};
