import { apiClient } from '../../../utils/apiClient';

export interface InvitationPreview {
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  expiresAt: string;
  invitedByName: string;
}

export interface AcceptInvitationResponse {
  user: {
    id: string;
    email: string;
    name: string;
    firstName: string;
    lastName: string;
    roles: string[];
    permissions: string[];
    organizationId: string | null;
  };
  accessToken: string;
  expiresIn: number;
}

export const invitationApi = {
  async validate(token: string): Promise<InvitationPreview> {
    const response = await apiClient.post('/invitations/validate', { token });
    return response.data.data;
  },

  async accept(payload: {
    token: string;
    password: string;
    acceptTerms: boolean;
  }): Promise<AcceptInvitationResponse> {
    const response = await apiClient.post('/invitations/accept', payload);
    return response.data.data;
  },
};
