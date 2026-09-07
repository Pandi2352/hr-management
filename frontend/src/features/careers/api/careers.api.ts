import { apiClient } from '../../../utils/apiClient';
import type { PublicCompanyInfo, PublicJobItem } from '../types/careers.types';

export interface JobsResponse {
  jobs: PublicJobItem[];
  totalCount: number;
  availableDepartments: string[];
  availableLocations: string[];
}

export const careersApi = {
  getCompanyOverview: async (): Promise<PublicCompanyInfo> => {
    const res = await apiClient.get<{ data: PublicCompanyInfo }>('/recruitment/public/company');
    return (res.data as any).data || res.data;
  },

  getPublicJobs: async (params?: { search?: string; department?: string; location?: string }): Promise<JobsResponse> => {
    const res = await apiClient.get<{ data: JobsResponse }>('/recruitment/public/jobs', { params });
    return (res.data as any).data || res.data;
  },

  getJobById: async (id: string): Promise<PublicJobItem> => {
    const res = await apiClient.get<{ data: PublicJobItem }>(`/recruitment/public/jobs/${id}`);
    return (res.data as any).data || res.data;
  },

  submitApplication: async (formData: FormData): Promise<{ success: boolean; applicationId: string; message: string }> => {
    const res = await apiClient.post<{ data: { success: boolean; applicationId: string; message: string } }>(
      '/recruitment/public/apply',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return (res.data as any).data || res.data;
  },
};
