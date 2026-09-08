import { apiClient } from '../../../utils/apiClient';
import type {
  OnboardingListResponse,
  OnboardingSession,
  InitializeOnboardingParams,
  UpdateTaskStatusParams,
  CandidateSubmitStepParams,
} from '../types/onboarding.types';

export const onboardingApi = {
  async getOnboardings(params?: {
    status?: string;
    departmentId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<OnboardingListResponse> {
    const res = await apiClient.get<OnboardingListResponse>('/lifecycle/onboarding', { params });
    return res.data;
  },

  async getOnboardingById(id: string): Promise<OnboardingSession> {
    const res = await apiClient.get<OnboardingSession>(`/lifecycle/onboarding/${id}`);
    return res.data;
  },

  async initializeOnboarding(data: InitializeOnboardingParams): Promise<OnboardingSession> {
    const res = await apiClient.post<OnboardingSession>('/lifecycle/onboarding', data);
    return res.data;
  },

  async updateTaskStatus(
    id: string,
    taskId: string,
    data: UpdateTaskStatusParams,
  ): Promise<OnboardingSession> {
    const res = await apiClient.patch<OnboardingSession>(
      `/lifecycle/onboarding/${id}/tasks/${taskId}`,
      data,
    );
    return res.data;
  },

  async sendReminder(id: string): Promise<{ success: boolean; message: string; pendingCount: number }> {
    const res = await apiClient.post<{ success: boolean; message: string; pendingCount: number }>(
      `/lifecycle/onboarding/${id}/remind`,
    );
    return res.data;
  },

  async getCandidateOnboarding(): Promise<OnboardingSession> {
    const res = await apiClient.get<OnboardingSession>('/onboarding/candidate/me');
    return res.data;
  },

  async submitCandidateStep(
    data: CandidateSubmitStepParams,
  ): Promise<{ success: boolean; message: string; session: OnboardingSession }> {
    const res = await apiClient.post<{ success: boolean; message: string; session: OnboardingSession }>(
      '/onboarding/candidate/submit-step',
      data,
    );
    return res.data;
  },
};
