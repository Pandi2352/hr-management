import { apiClient } from '../../../utils/apiClient';
import type {
  CandidateDetail,
  Interview,
  Offer,
  PipelineApplication,
  PipelineStats,
  PipelineStage,
} from '../types/pipeline.types';

export const pipelineApi = {
  stats: async (): Promise<PipelineStats> => {
    const res = await apiClient.get('/recruitment/admin/pipeline');
    return res.data.data as PipelineStats;
  },

  applications: async (params?: { search?: string; status?: string; jobId?: string }): Promise<PipelineApplication[]> => {
    const res = await apiClient.get('/recruitment/admin/applications', { params });
    const data = res.data.data;
    return (Array.isArray(data) ? data : []) as PipelineApplication[];
  },

  detail: async (id: string): Promise<CandidateDetail> => {
    const res = await apiClient.get(`/recruitment/admin/applications/${id}`);
    return res.data.data as CandidateDetail;
  },

  moveStage: async (id: string, to: PipelineStage, note?: string): Promise<PipelineApplication> => {
    const res = await apiClient.post(`/recruitment/admin/applications/${id}/move`, { to, note });
    return res.data.data as PipelineApplication;
  },

  scheduleInterview: async (
    applicationId: string,
    dto: {
      title?: string;
      interviewerName: string;
      scheduledDate: string;
      scheduledTime: string;
      mode?: string;
      location?: string;
    },
  ): Promise<Interview> => {
    const res = await apiClient.post(`/recruitment/admin/applications/${applicationId}/interviews`, dto);
    return res.data.data as Interview;
  },

  updateInterview: async (id: string, dto: Partial<Interview>): Promise<Interview> => {
    const res = await apiClient.patch(`/recruitment/admin/interviews/${id}`, dto);
    return res.data.data as Interview;
  },

  submitFeedback: async (
    id: string,
    dto: { rating?: number; recommendation: string; feedback?: string },
  ): Promise<Interview> => {
    const res = await apiClient.post(`/recruitment/admin/interviews/${id}/feedback`, dto);
    return res.data.data as Interview;
  },

  createOffer: async (
    applicationId: string,
    dto: {
      designation?: string;
      department?: string;
      salaryOffered?: string;
      joiningDate?: string;
      expiryDate?: string;
      notes?: string;
    },
  ): Promise<Offer> => {
    const res = await apiClient.post(`/recruitment/admin/applications/${applicationId}/offer`, dto);
    return res.data.data as Offer;
  },

  decideOffer: async (id: string, decision: string): Promise<Offer> => {
    const res = await apiClient.post(`/recruitment/admin/offers/${id}/decision`, { decision });
    return res.data.data as Offer;
  },

  hire: async (
    applicationId: string,
    dto: {
      departmentId?: string;
      designationId?: string;
      locationId?: string;
      employmentType?: string;
      joiningDate?: string;
    },
  ): Promise<{ applicationId: string; employee: unknown; employeeCode: string }> => {
    const res = await apiClient.post(`/recruitment/admin/applications/${applicationId}/hire`, dto);
    return res.data.data;
  },
};
