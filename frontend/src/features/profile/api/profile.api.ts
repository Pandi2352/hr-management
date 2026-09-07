import { apiClient } from '../../../utils/apiClient';

export interface UserProfileData {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
  avatarUrl?: string | null;
  phone?: string | null;
  location?: string | null;
  bio?: string | null;
  department?: string;
  designation?: string;
  employeeCode?: string;
}

export const profileApi = {
  async getMyProfile(): Promise<UserProfileData> {
    const response = await apiClient.get<{ success: boolean; data: UserProfileData }>('/users/me');
    return response.data.data;
  },

  async updateMyProfile(dto: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    location?: string;
    bio?: string;
  }): Promise<{ message: string; user: UserProfileData }> {
    const response = await apiClient.patch<{ success: boolean; message: string; user: UserProfileData }>(
      '/users/me',
      dto
    );
    return response.data;
  },

  async uploadAvatar(file: File): Promise<{ avatarUrl: string }> {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await apiClient.post<{
      success: boolean;
      message: string;
      data: { avatarUrl: string };
    }>('/users/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  },

  async removeAvatar(): Promise<{ message: string }> {
    const response = await apiClient.delete<{ success: boolean; message: string }>(
      '/users/me/avatar'
    );
    return response.data;
  },
};
