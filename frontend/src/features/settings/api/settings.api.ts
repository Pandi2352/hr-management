import { apiClient } from '../../../utils/apiClient';

export interface SmtpSettings {
  host: string;
  port: number;
  user: string;
  maskedPassword?: string;
  hasPassword?: boolean;
  fromName: string;
  fromEmail: string;
  secure: boolean;
  isConfigured: boolean;
}

export interface S3Settings {
  bucket: string;
  region: string;
  accessKeyId: string;
  maskedSecretAccessKey?: string;
  hasSecretAccessKey?: boolean;
  endpoint?: string;
  forcePathStyle?: boolean;
  publicUrlBase?: string;
  isConfigured: boolean;
  lastVerifiedAt?: string | null;
}

export interface BusinessSettingsData {
  organizationId: string;
  smtp: SmtpSettings;
  s3_config: S3Settings;
}

export interface UpdateSmtpPayload {
  host: string;
  port: number;
  user: string;
  pass?: string;
  fromName?: string;
  fromEmail?: string;
  secure?: boolean;
}

export interface TestSmtpPayload {
  toEmail: string;
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  fromName?: string;
  fromEmail?: string;
  secure?: boolean;
}

export interface TestSmtpResult {
  messageId?: string;
  response?: string;
  accepted?: string[];
}

export interface UpdateS3Payload {
  bucket: string;
  region?: string;
  accessKeyId: string;
  secretAccessKey?: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  publicUrlBase?: string;
}

export interface TestS3Payload {
  bucket?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
  forcePathStyle?: boolean;
}

export interface TestS3Result {
  bucket?: string;
  region?: string;
  endpoint?: string;
  verifiedAt?: string;
}

export const settingsApi = {
  // Unified Settings
  getAllSettings: async (): Promise<BusinessSettingsData> => {
    const res = await apiClient.get('/business-settings');
    return res.data.data as BusinessSettingsData;
  },

  updateAllSettings: async (payload: { smtp?: UpdateSmtpPayload; s3_config?: UpdateS3Payload }): Promise<BusinessSettingsData> => {
    const res = await apiClient.put('/business-settings', payload);
    return res.data.data as BusinessSettingsData;
  },

  // SMTP Gateway
  getSmtpSettings: async (): Promise<SmtpSettings> => {
    const res = await apiClient.get('/business-settings/smtp');
    return res.data.data as SmtpSettings;
  },

  updateSmtpSettings: async (payload: UpdateSmtpPayload): Promise<SmtpSettings> => {
    const res = await apiClient.put('/business-settings/smtp', payload);
    return res.data.data as SmtpSettings;
  },

  testSmtpConnection: async (payload: TestSmtpPayload): Promise<{ diagnostic: TestSmtpResult; message: string }> => {
    const res = await apiClient.post('/business-settings/smtp/test', payload);
    return {
      diagnostic: res.data.data as TestSmtpResult,
      message: res.data.message as string,
    };
  },

  // S3 Cloud Storage
  getS3Settings: async (): Promise<S3Settings> => {
    const res = await apiClient.get('/business-settings/s3');
    return res.data.data as SmtpSettings as any;
  },

  updateS3Settings: async (payload: UpdateS3Payload): Promise<S3Settings> => {
    const res = await apiClient.put('/business-settings/s3', payload);
    return res.data.data as S3Settings;
  },

  testS3Connection: async (payload: TestS3Payload): Promise<{ details: TestS3Result; message: string }> => {
    const res = await apiClient.post('/business-settings/s3/test', payload);
    return {
      details: res.data.data as TestS3Result,
      message: res.data.message as string,
    };
  },
};
