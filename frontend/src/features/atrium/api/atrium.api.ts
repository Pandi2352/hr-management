import { apiClient } from '../../../utils/apiClient';
import type { PaginatedResponse } from '../../../types/pagination.types';
import type {
  AtriumDirectoryParams,
  AtriumFacets,
  AtriumProfile,
  FollowResult,
  UpdateAtriumProfilePayload,
} from '../types/atrium.types';

export const atriumApi = {
  getDirectory: async (
    params: AtriumDirectoryParams = {},
  ): Promise<PaginatedResponse<AtriumProfile>> => {
    const response = await apiClient.get<{ data: AtriumProfile[]; meta: any }>(
      '/atrium/directory',
      { params },
    );
    return { data: response.data.data, meta: response.data.meta };
  },

  getFacets: async (): Promise<AtriumFacets> => {
    const response = await apiClient.get<{ data: AtriumFacets }>('/atrium/facets');
    return response.data.data;
  },

  getMyProfile: async (): Promise<AtriumProfile> => {
    const response = await apiClient.get<{ data: AtriumProfile }>('/atrium/me');
    return response.data.data;
  },

  getProfile: async (employeeId: string): Promise<AtriumProfile> => {
    const response = await apiClient.get<{ data: AtriumProfile }>(
      `/atrium/profiles/${employeeId}`,
    );
    return response.data.data;
  },

  updateMyProfile: async (payload: UpdateAtriumProfilePayload): Promise<AtriumProfile> => {
    const response = await apiClient.patch<{ data: AtriumProfile }>('/atrium/me', payload);
    return response.data.data;
  },

  uploadImage: async (kind: 'photo' | 'cover', file: File): Promise<AtriumProfile> => {
    const form = new FormData();
    form.append('image', file);
    const response = await apiClient.post<{ data: AtriumProfile }>(
      `/atrium/me/${kind}`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data.data;
  },

  removeImage: async (kind: 'photo' | 'cover'): Promise<AtriumProfile> => {
    const response = await apiClient.delete<{ data: AtriumProfile }>(`/atrium/me/${kind}`);
    return response.data.data;
  },

  getSuggestions: async (limit = 8): Promise<AtriumProfile[]> => {
    const response = await apiClient.get<{ data: AtriumProfile[] }>('/atrium/suggestions', {
      params: { limit },
    });
    return response.data.data;
  },

  follow: async (employeeId: string): Promise<FollowResult> => {
    const response = await apiClient.post<{ data: FollowResult }>(
      `/atrium/follow/${employeeId}`,
    );
    return response.data.data;
  },

  unfollow: async (employeeId: string): Promise<FollowResult> => {
    const response = await apiClient.delete<{ data: FollowResult }>(
      `/atrium/follow/${employeeId}`,
    );
    return response.data.data;
  },

  getFollowers: async (
    employeeId: string,
    params: { page?: number; pageSize?: number; search?: string } = {},
  ): Promise<PaginatedResponse<AtriumProfile>> => {
    const response = await apiClient.get<{ data: AtriumProfile[]; meta: any }>(
      `/atrium/profiles/${employeeId}/followers`,
      { params },
    );
    return { data: response.data.data, meta: response.data.meta };
  },

  getFollowing: async (
    employeeId: string,
    params: { page?: number; pageSize?: number; search?: string } = {},
  ): Promise<PaginatedResponse<AtriumProfile>> => {
    const response = await apiClient.get<{ data: AtriumProfile[]; meta: any }>(
      `/atrium/profiles/${employeeId}/following`,
      { params },
    );
    return { data: response.data.data, meta: response.data.meta };
  },
};
