export interface S3ConfigOptions {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  publicUrlBase?: string;
  isConfigured?: boolean;
  lastVerifiedAt?: Date | null;
}

export interface S3UploadOptions {
  key: string;
  body: Buffer | Uint8Array | string;
  contentType: string;
  acl?: 'private' | 'public-read';
  metadata?: Record<string, string>;
}

export interface S3UploadResult {
  key: string;
  bucket: string;
  location?: string;
  eTag?: string;
}

/**
 * Masks an AWS Secret Access Key or Access Key ID for safe UI transmission.
 */
export function maskS3Secret(secret?: string): string {
  if (!secret) return '';
  const clean = secret.trim();
  if (clean.length > 8) {
    return `${clean.slice(0, 4)} •••• •••• ${clean.slice(-4)}`;
  }
  return '••••••••••••';
}
