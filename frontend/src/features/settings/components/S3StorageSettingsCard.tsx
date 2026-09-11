import React from 'react';
import {
  HardDrive,
  Database,
  Globe,
  Key,
  Sparkles,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { Button, Input, Badge } from '../../../components/ui';

interface S3Preset {
  id: string;
  name: string;
  endpoint: string;
  forcePathStyle: boolean;
  hint: string;
}

export const S3_PRESETS: S3Preset[] = [
  {
    id: 'aws',
    name: 'Amazon Web Services S3',
    endpoint: '',
    forcePathStyle: false,
    hint: 'Standard global AWS S3 storage infrastructure',
  },
  {
    id: 'r2',
    name: 'Cloudflare R2 Storage',
    endpoint: 'https://<accountid>.r2.cloudflarestorage.com',
    forcePathStyle: false,
    hint: 'Zero-egress fee S3-compatible cloud storage',
  },
  {
    id: 'minio',
    name: 'Self-Hosted MinIO',
    endpoint: 'http://localhost:9000',
    forcePathStyle: true,
    hint: 'Local / on-premise private object storage server',
  },
];

interface S3StorageSettingsCardProps {
  s3Bucket: string;
  setS3Bucket: (v: string) => void;
  s3Region: string;
  setS3Region: (v: string) => void;
  s3AccessKeyId: string;
  setS3AccessKeyId: (v: string) => void;
  s3SecretAccessKey: string;
  setS3SecretAccessKey: (v: string) => void;
  s3MaskedSecret: string;
  s3HasSecret: boolean;
  s3Endpoint: string;
  setS3Endpoint: (v: string) => void;
  s3ForcePathStyle: boolean;
  setS3ForcePathStyle: (v: boolean) => void;
  s3PublicUrlBase: string;
  setS3PublicUrlBase: (v: string) => void;
  activeS3Preset: string;
  setActiveS3Preset: (v: string) => void;
  isSaving: boolean;
  onSave: (e?: React.FormEvent) => void;
  onOpenTestModal: () => void;
}

export const S3StorageSettingsCard: React.FC<S3StorageSettingsCardProps> = ({
  s3Bucket,
  setS3Bucket,
  s3Region,
  setS3Region,
  s3AccessKeyId,
  setS3AccessKeyId,
  s3SecretAccessKey,
  setS3SecretAccessKey,
  s3MaskedSecret,
  s3HasSecret,
  s3Endpoint,
  setS3Endpoint,
  s3ForcePathStyle,
  setS3ForcePathStyle,
  s3PublicUrlBase,
  setS3PublicUrlBase,
  activeS3Preset,
  setActiveS3Preset,
  isSaving,
  onSave,
  onOpenTestModal,
}) => {
  const handleApplyPreset = (preset: S3Preset) => {
    setActiveS3Preset(preset.id);
    setS3Endpoint(preset.endpoint);
    setS3ForcePathStyle(preset.forcePathStyle);
  };

  return (
    <div className="space-y-6">
      {/* Cloud Presets */}
      <div className="rounded-md border border-hairline bg-surface p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-foreground">
              Cloud Storage Presets
            </h3>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Quick-configure standard AWS S3, Cloudflare R2, or self-hosted MinIO
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {S3_PRESETS.map((preset) => {
            const isSelected = activeS3Preset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className={`text-left p-3.5 rounded-md border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-blue-600 bg-blue-500/10 ring-1 ring-blue-500/30'
                    : 'border-hairline hover:border-hairline-hover bg-surface-hover/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-foreground">{preset.name}</span>
                  {isSelected && (
                    <Badge variant="info" size="sm" className="px-1.5 py-0 text-[10px]">
                      Active
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  {preset.hint}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-7">
          <form
            onSubmit={onSave}
            className="rounded-md border border-hairline bg-surface p-6 space-y-5"
          >
            <div className="flex items-center gap-2.5 pb-3 border-b border-hairline">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white">
                <HardDrive className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  S3 Cloud Storage
                </h3>
                <p className="text-xs text-muted-foreground">
                  Powers the employee document vault, ID proofs, resumes, and avatar media.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="S3 Bucket Name"
                placeholder="e.g. peopleos-enterprise-vault"
                value={s3Bucket}
                onChange={(e) => setS3Bucket(e.target.value)}
                leftIcon={<Database className="h-4 w-4 text-muted-foreground" />}
                required
              />
              <Input
                label="AWS Region"
                placeholder="e.g. us-east-1"
                value={s3Region}
                onChange={(e) => setS3Region(e.target.value)}
                leftIcon={<Globe className="h-4 w-4 text-muted-foreground" />}
                required
              />
            </div>

            <div className="space-y-4 pt-2 border-t border-hairline">
              <Input
                label="AWS Access Key ID"
                placeholder="AKIAIOSFODNN7EXAMPLE"
                value={s3AccessKeyId}
                onChange={(e) => setS3AccessKeyId(e.target.value)}
                leftIcon={<Key className="h-4 w-4 text-muted-foreground" />}
                required
              />

              <div>
                <Input
                  label="AWS Secret Access Key"
                  type="password"
                  placeholder={
                    s3HasSecret
                      ? '•••••••••••••••• (saved)'
                      : 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
                  }
                  value={s3SecretAccessKey}
                  onChange={(e) => setS3SecretAccessKey(e.target.value)}
                  leftIcon={<Key className="h-4 w-4 text-muted-foreground" />}
                />
                {s3HasSecret && !s3SecretAccessKey && (
                  <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 font-mono">
                    ✓ Key stored securely: {s3MaskedSecret}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4 pt-2 border-t border-hairline">
              <Input
                label="Custom Endpoint URL (Optional)"
                placeholder="https://<accountid>.r2.cloudflarestorage.com"
                value={s3Endpoint}
                onChange={(e) => setS3Endpoint(e.target.value)}
                leftIcon={<Globe className="h-4 w-4 text-muted-foreground" />}
              />

              <div className="flex items-center justify-between p-3 rounded-md border border-hairline bg-surface-hover/30">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-foreground">
                    Force Path Style URLs
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Required for MinIO (http://endpoint/bucket) rather than virtual hosted style.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setS3ForcePathStyle(!s3ForcePathStyle)}
                  className={`h-5 w-9 rounded-full transition-colors cursor-pointer relative ${
                    s3ForcePathStyle ? 'bg-blue-600' : 'bg-surface-hover'
                  }`}
                >
                  <span
                    className={`block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                      s3ForcePathStyle ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              <Input
                label="Public CDN / URL Base (Optional)"
                placeholder="https://cdn.yourcompany.com"
                value={s3PublicUrlBase}
                onChange={(e) => setS3PublicUrlBase(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-hairline">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onOpenTestModal}
                className="flex items-center gap-1.5 rounded-md text-xs"
              >
                <HardDrive className="h-3.5 w-3.5 text-blue-500" />
                Test Bucket Connectivity...
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={isSaving}
                className="flex items-center gap-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save className="h-3.5 w-3.5" />
                Save S3 Configuration
              </Button>
            </div>
          </form>
        </div>

        {/* Sidebar Info Column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-md border border-hairline bg-surface p-5 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-blue-500" />
              <h4 className="text-xs font-bold text-foreground">Cloud Storage Architecture</h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Files uploaded to PeopleOS (resumes, avatar images, identity records) are streamed
              directly to your designated S3 bucket using presigned URLs or signed multipart chunks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
