import { apiClient } from '../../../utils/apiClient';
import type { AiProvidersState, AiProviderId } from '../types/ai.types';

export const aiApi = {
  providers: async (): Promise<AiProvidersState> => {
    const res = await apiClient.get('/ai/providers');
    return res.data.data as AiProvidersState;
  },

  scoreCandidate: async <T>(applicationId: string, provider?: AiProviderId): Promise<T> => {
    const res = await apiClient.post(`/ai/applications/${applicationId}/score`, { provider });
    return res.data.data as T;
  },

  testProvider: async (id: AiProviderId): Promise<{ ok: boolean; latencyMs: number; detail: string }> => {
    const res = await apiClient.post(`/ai/providers/${id}/test`);
    return res.data.data as { ok: boolean; latencyMs: number; detail: string };
  },

  ask: async (question: string): Promise<{ answer: string; provider: string; contextUsed: string[] }> => {
    const res = await apiClient.post('/ai/ask', { question });
    return res.data.data as { answer: string; provider: string; contextUsed: string[] };
  },
};
