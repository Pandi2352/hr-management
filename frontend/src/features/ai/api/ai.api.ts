import { apiClient } from '../../../utils/apiClient';
import type { AiProvidersState, AiProviderId, SaveProviderSettingsPayload } from '../types/ai.types';

export const aiApi = {
  providers: async (): Promise<AiProvidersState> => {
    const res = await apiClient.get('/ai/providers');
    return res.data.data as AiProvidersState;
  },

  saveProviderSettings: async (
    id: AiProviderId,
    payload: SaveProviderSettingsPayload,
  ): Promise<AiProvidersState> => {
    const res = await apiClient.put(`/ai/providers/${id}/settings`, payload);
    return res.data.data as AiProvidersState;
  },

  clearProviderSettings: async (id: AiProviderId): Promise<AiProvidersState> => {
    const res = await apiClient.delete(`/ai/providers/${id}/settings`);
    return res.data.data as AiProvidersState;
  },


  testProvider: async (id: AiProviderId): Promise<{ ok: boolean; latencyMs: number; detail: string }> => {
    const res = await apiClient.post(`/ai/providers/${id}/test`);
    return res.data.data as { ok: boolean; latencyMs: number; detail: string };
  },

};
