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
    const res = await apiClient.get<any>('/lifecycle/probation', { params });
    const payload = res.data;
    return {
      data: Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [],
      meta: payload?.meta,
    };
  },

  async getProbationById(id: string): Promise<ProbationReview> {
    const res = await apiClient.get<any>(`/lifecycle/probation/${id}`);
    return res.data?.data ?? res.data;
  },

  async evaluateProbation(
    id: string,
    payload: EvaluateProbationPayload,
  ): Promise<ProbationReview> {
    const res = await apiClient.post<any>(`/lifecycle/probation/${id}/evaluate`, payload);
    return res.data?.data ?? res.data;
  },

  async signoffProbation(
    id: string,
    payload: SignoffProbationPayload,
  ): Promise<ProbationReview> {
    const res = await apiClient.post<any>(`/lifecycle/probation/${id}/signoff`, payload);
    return res.data?.data ?? res.data;
  },

  // Transitions
  async getTransitions(params?: QueryTransitionParams): Promise<TransitionListResponse> {
    const res = await apiClient.get<any>('/lifecycle/transitions', { params });
    const payload = res.data;
    return {
      data: Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [],
      meta: payload?.meta,
    };
  },

  async createTransition(payload: CreateTransitionPayload): Promise<LifecycleTransition> {
    const res = await apiClient.post<any>('/lifecycle/transitions', payload);
    return res.data?.data ?? res.data;
  },

  async getEmployeeTimeline(employeeId: string): Promise<EmployeeTimelineResponse> {
    const res = await apiClient.get<any>(`/lifecycle/transitions/timeline/${employeeId}`);
    return res.data?.data ?? res.data;
  },
};
