import { apiClient } from '../../../utils/apiClient';
import type {
  ProbationReview,
  ProbationMetrics,
  QueryProbationParams,
  EvaluateProbationPayload,
  SignoffProbationPayload,
  LifecycleTransition,
  TransitionMetrics,
  QueryTransitionParams,
  CreateTransitionPayload,
  EmployeeTimelineResponse,
} from '../types/lifecycle.types';

export interface ProbationListResponse {
  data: ProbationReview[];
  meta?: {
    metrics: ProbationMetrics;
    total: number;
    page: number;
    pageSize: number;
  };
}

export interface TransitionListResponse {
  data: LifecycleTransition[];
  meta?: {
    metrics: TransitionMetrics;
    total: number;
    page: number;
    pageSize: number;
  };
}

export const lifecycleApi = {
  // Probation
  async getProbations(params?: QueryProbationParams): Promise<ProbationListResponse> {
    const res = await apiClient.get<ProbationReview[]>('/lifecycle/probation', { params });
    return {
      data: res.data || [],
      meta: (res as any).meta,
    };
  },

  async getProbationById(id: string): Promise<ProbationReview> {
    const res = await apiClient.get<ProbationReview>(`/lifecycle/probation/${id}`);
    return res.data;
  },

  async evaluateProbation(
    id: string,
    payload: EvaluateProbationPayload,
  ): Promise<ProbationReview> {
    const res = await apiClient.post<ProbationReview>(`/lifecycle/probation/${id}/evaluate`, payload);
    return res.data;
  },

  async signoffProbation(
    id: string,
    payload: SignoffProbationPayload,
  ): Promise<ProbationReview> {
    const res = await apiClient.post<ProbationReview>(`/lifecycle/probation/${id}/signoff`, payload);
    return res.data;
  },

  // Transitions
  async getTransitions(params?: QueryTransitionParams): Promise<TransitionListResponse> {
    const res = await apiClient.get<LifecycleTransition[]>('/lifecycle/transitions', { params });
    return {
      data: res.data || [],
      meta: (res as any).meta,
    };
  },

  async createTransition(payload: CreateTransitionPayload): Promise<LifecycleTransition> {
    const res = await apiClient.post<LifecycleTransition>('/lifecycle/transitions', payload);
    return res.data;
  },

  async getEmployeeTimeline(employeeId: string): Promise<EmployeeTimelineResponse> {
    const res = await apiClient.get<EmployeeTimelineResponse>(`/lifecycle/transitions/timeline/${employeeId}`);
    return res.data;
  },
};
