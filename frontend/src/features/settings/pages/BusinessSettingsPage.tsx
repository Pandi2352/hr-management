import React, { useState, useEffect } from 'react';
import {
  Mail,
  ShieldCheck,
  Send,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Key,
  Globe,
  SlidersHorizontal,
  Info,
  Sparkles,
  Zap,
  HardDrive,
  Database,
  Code2,
  Copy,
} from 'lucide-react';
import { Button, Input, Badge } from '../../../components/ui';
import { PageHeader } from '../../../components/common/PageHeader';
import { useToast } from '../../../components/ui/toast';
import { useAuth } from '../../auth/context/AuthContext';
import {
  settingsApi,
  type TestSmtpResult,
  type TestS3Result,
} from '../api/settings.api';

interface SmtpPreset {
  id: string;
  name: string;
  host: string;
  port: number;
  secure: boolean;
  hint: string;
}

const SMTP_PRESETS: SmtpPreset[] = [
  {
    id: 'gmail',
    name: 'Google Workspace / Gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    hint: 'Requires 16-character Google App Password (2-Step Verification enabled)',
  },
  {
    id: 'office365',
    name: 'Microsoft 365 / Outlook',
    host: 'smtp.office365.com',
    port: 587,
    secure: false,
    hint: 'Office 365 SMTP relay with STARTTLS enabled',
  },
  {
    id: 'custom',
    name: 'Custom SMTP Relay',
    host: '',
    port: 587,
    secure: false,
    hint: 'Connect to your private corporate mail relay or transactional provider',
  },
];

interface S3Preset {
  id: string;
  name: string;
  region: string;
  endpoint: string;
  forcePathStyle: boolean;
  hint: string;
}

const S3_PRESETS: S3Preset[] = [
  {
    id: 'aws',
    name: 'Amazon Web Services (AWS S3)',
    region: 'us-east-1',
    endpoint: '',
    forcePathStyle: false,
    hint: 'Default AWS S3 standard cloud storage bucket',
  },
  {
    id: 'r2',
    name: 'Cloudflare R2 Storage',
    region: 'auto',
    endpoint: 'https://<ACCOUNT_ID>.r2.cloudflarestorage.com',
    forcePathStyle: false,
    hint: 'Zero-egress fee S3 compatible object storage',
  },
  {
    id: 'minio',
    name: 'MinIO / LocalStack (Self-Hosted)',
    region: 'us-east-1',
    endpoint: 'http://localhost:9000',
    forcePathStyle: true,
    hint: 'Self-hosted private cloud storage (path-style routing enabled)',
  },
];

export function BusinessSettingsPage() {
  const toast = useToast();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'smtp' | 's3' | 'json'>('smtp');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [isTestingS3, setIsTestingS3] = useState(false);

  // SMTP State
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState<number>(587);
  const [smtpSecure, setSmtpSecure] = useState<boolean>(false);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [fromName, setFromName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [maskedPassword, setMaskedPassword] = useState('');
  const [hasPassword, setHasPassword] = useState(false);
  const [isSmtpConfigured, setIsSmtpConfigured] = useState(false);
  const [activeSmtpPreset, setActiveSmtpPreset] = useState<string>('');

  // SMTP Test State
  const [testRecipient, setTestRecipient] = useState('');
  const [smtpTestResult, setSmtpTestResult] = useState<{
    success: boolean;
    message: string;
    diagnostic?: TestSmtpResult;
    timestamp?: string;
  } | null>(null);

  // S3 State
  const [s3Bucket, setS3Bucket] = useState('');
  const [s3Region, setS3Region] = useState('us-east-1');
  const [s3AccessKeyId, setS3AccessKeyId] = useState('');
  const [s3SecretAccessKey, setS3SecretAccessKey] = useState('');
  const [s3MaskedSecret, setS3MaskedSecret] = useState('');
  const [s3HasSecret, setS3HasSecret] = useState(false);
  const [s3Endpoint, setS3Endpoint] = useState('');
  const [s3ForcePathStyle, setS3ForcePathStyle] = useState(false);
  const [s3PublicUrlBase, setS3PublicUrlBase] = useState('');
  const [isS3Configured, setIsS3Configured] = useState(false);
  const [activeS3Preset, setActiveS3Preset] = useState<string>('');

  // S3 Test State
  const [s3TestResult, setS3TestResult] = useState<{
    success: boolean;
    message: string;
    details?: TestS3Result;
    timestamp?: string;
  } | null>(null);

  const loadAllSettings = async () => {
    setIsLoading(true);
    try {
      const data = await settingsApi.getAllSettings();
      const s = data.smtp || ({} as any);
      setSmtpHost(s.host || '');
      setSmtpPort(s.port || 587);
      setSmtpSecure(Boolean(s.secure));
      setSmtpUser(s.user || '');
      setFromName(s.fromName || '');
      setFromEmail(s.fromEmail || s.user || '');
      setMaskedPassword(s.maskedPassword || '');
      setHasPassword(Boolean(s.hasPassword));
      setIsSmtpConfigured(Boolean(s.isConfigured));

      if (!testRecipient) {
        setTestRecipient(s.user || user?.email || '');
      }

      if (s.host?.includes('gmail.com')) {
        setActiveSmtpPreset('gmail');
      } else if (s.host?.includes('office365') || s.host?.includes('outlook')) {
        setActiveSmtpPreset('office365');
      } else if (s.host) {
        setActiveSmtpPreset('custom');
      } else {
        setActiveSmtpPreset('');
      }

      const c = data.s3_config || ({} as any);
      setS3Bucket(c.bucket || '');
      setS3Region(c.region || 'us-east-1');
      setS3AccessKeyId(c.accessKeyId || '');
      setS3MaskedSecret(c.maskedSecretAccessKey || '');
      setS3HasSecret(Boolean(c.hasSecretAccessKey));
      setS3Endpoint(c.endpoint || '');
      setS3ForcePathStyle(Boolean(c.forcePathStyle));
      setS3PublicUrlBase(c.publicUrlBase || '');
      setIsS3Configured(Boolean(c.isConfigured));

      if (c.endpoint?.includes('r2.cloudflarestorage')) {
        setActiveS3Preset('r2');
      } else if (c.endpoint?.includes('localhost') || c.endpoint?.includes('9000') || c.forcePathStyle) {
        setActiveS3Preset('minio');
      } else {
        setActiveS3Preset('aws');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load business settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllSettings();
  }, []);

  const handleApplySmtpPreset = (preset: SmtpPreset) => {
    setActiveSmtpPreset(preset.id);
    if (preset.host) {
      setSmtpHost(preset.host);
      setSmtpPort(preset.port);
      setSmtpSecure(preset.secure);
      toast.info(`Applied ${preset.name} template`);
    }
  };

  const handleApplyS3Preset = (preset: S3Preset) => {
    setActiveS3Preset(preset.id);
    setS3Region(preset.region);
    setS3Endpoint(preset.endpoint);
    setS3ForcePathStyle(preset.forcePathStyle);
    toast.info(`Applied ${preset.name} template`);
  };

  const handleSaveSmtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!smtpHost.trim()) {
      toast.error('SMTP Host is required');
      return;
    }
    if (!smtpUser.trim()) {
      toast.error('SMTP User / Email is required');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await settingsApi.updateSmtpSettings({
        host: smtpHost.trim(),
        port: Number(smtpPort),
        secure: smtpSecure,
        user: smtpUser.trim(),
        pass: smtpPass.trim() ? smtpPass.trim() : undefined,
        fromName: fromName.trim(),
        fromEmail: fromEmail.trim() || smtpUser.trim(),
      });

      setMaskedPassword(updated.maskedPassword || '');
      setHasPassword(Boolean(updated.hasPassword));
      setIsSmtpConfigured(Boolean(updated.isConfigured));
      setSmtpPass('');
      toast.success('SMTP credentials successfully saved to database');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update SMTP settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveS3 = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!s3Bucket.trim()) {
      toast.error('S3 Bucket name is required');
      return;
    }
    if (!s3AccessKeyId.trim()) {
      toast.error('AWS Access Key ID is required');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await settingsApi.updateS3Settings({
        bucket: s3Bucket.trim(),
        region: s3Region.trim() || 'us-east-1',
        accessKeyId: s3AccessKeyId.trim(),
        secretAccessKey: s3SecretAccessKey.trim() ? s3SecretAccessKey.trim() : undefined,
        endpoint: s3Endpoint.trim(),
        forcePathStyle: s3ForcePathStyle,
        publicUrlBase: s3PublicUrlBase.trim(),
      });

      setS3MaskedSecret(updated.maskedSecretAccessKey || '');
      setS3HasSecret(Boolean(updated.hasSecretAccessKey));
      setIsS3Configured(Boolean(updated.isConfigured));
      setS3SecretAccessKey('');
      toast.success('S3 cloud storage credentials securely saved to database');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update S3 settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestSmtp = async () => {
    if (!testRecipient.trim()) {
      toast.error('Please enter a recipient email address for testing');
      return;
    }

    setIsTestingSmtp(true);
    setSmtpTestResult(null);

    try {
      const res = await settingsApi.testSmtpConnection({
        toEmail: testRecipient.trim(),
        host: smtpHost.trim() || undefined,
        port: Number(smtpPort) || undefined,
        secure: smtpSecure,
        user: smtpUser.trim() || undefined,
        pass: smtpPass.trim() || undefined,
        fromName: fromName.trim() || undefined,
        fromEmail: fromEmail.trim() || undefined,
      });

      setSmtpTestResult({
        success: true,
        message: res.message || 'SMTP Gateway verified and test email delivered!',
        diagnostic: res.diagnostic,
        timestamp: new Date().toLocaleTimeString(),
      });
      setIsSmtpConfigured(true);
      toast.success('Live test email dispatched successfully!');
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'SMTP Connection failed';
      setSmtpTestResult({
        success: false,
        message: errMsg,
        timestamp: new Date().toLocaleTimeString(),
      });
      toast.error(errMsg);
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const handleTestS3 = async () => {
    if (!s3Bucket.trim()) {
      toast.error('S3 Bucket name is required for testing');
      return;
    }
    if (!s3AccessKeyId.trim()) {
      toast.error('AWS Access Key ID is required');
      return;
    }

    setIsTestingS3(true);
    setS3TestResult(null);

    try {
      const res = await settingsApi.testS3Connection({
        bucket: s3Bucket.trim(),
        region: s3Region.trim() || 'us-east-1',
        accessKeyId: s3AccessKeyId.trim(),
        secretAccessKey: s3SecretAccessKey.trim() || undefined,
        endpoint: s3Endpoint.trim() || undefined,
        forcePathStyle: s3ForcePathStyle,
      });

      setS3TestResult({
        success: true,
        message: res.message || 'S3 Bucket connection and permissions verified successfully!',
        details: res.details,
        timestamp: new Date().toLocaleTimeString(),
      });
      setIsS3Configured(true);
      toast.success('S3 Bucket connected successfully!');
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || 'S3 Connection failed';
      setS3TestResult({
        success: false,
        message: errMsg,
        timestamp: new Date().toLocaleTimeString(),
      });
      toast.error(errMsg);
    } finally {
      setIsTestingS3(false);
    }
  };

  // Live JSON structure preview
  const jsonStructure = {
    organizationId: 'default',
    smtp: {
      host: smtpHost,
      port: smtpPort,
      user: smtpUser,
      maskedPassword: maskedPassword || (smtpPass ? '••••••••••••••••' : ''),
      hasPassword: hasPassword || Boolean(smtpPass),
      fromName: fromName,
      fromEmail: fromEmail || smtpUser,
      secure: smtpSecure,
      isConfigured: isSmtpConfigured,
    },
    s3_config: {
      bucket: s3Bucket,
      region: s3Region,
      accessKeyId: s3AccessKeyId,
      maskedSecretAccessKey: s3MaskedSecret || (s3SecretAccessKey ? '••••••••••••••••' : ''),
      hasSecretAccessKey: s3HasSecret || Boolean(s3SecretAccessKey),
      endpoint: s3Endpoint,
      forcePathStyle: s3ForcePathStyle,
      publicUrlBase: s3PublicUrlBase,
      isConfigured: isS3Configured,
    },
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(jsonStructure, null, 2));
    toast.success('Business Settings JSON copied to clipboard');
  };

  if (isLoading) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="text-xs text-ink-3">Loading Enterprise Business Settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-12">
      <PageHeader
        title="Business Settings & System Gateways"
        description="Configure mission-critical credentials, live SMTP gateway, and S3 cloud storage infrastructure."
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadAllSettings}
              disabled={isSaving || isTestingSmtp || isTestingS3}
              className="flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reload
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (activeTab === 'smtp') handleSaveSmtp();
                else if (activeTab === 's3') handleSaveS3();
                else {
                  handleSaveSmtp();
                  handleSaveS3();
                }
              }}
              size="sm"
              isLoading={isSaving}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
            >
              <Save className="h-3.5 w-3.5" />
              Save Active Settings
            </Button>
          </div>
        }
      />

      {/* Gateway Status Metric Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* SMTP Status */}
        <div className="relative overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-3.5 flex items-center gap-3 ring-1 ring-emerald-500/20">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
            <Mail className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="flex h-2 w-2 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isSmtpConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isSmtpConfigured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              </span>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-none truncate">
                {isSmtpConfigured ? 'SMTP Online' : 'SMTP Unverified'}
              </p>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate">
              {smtpHost ? `${smtpHost}:${smtpPort}` : 'Not configured'}
            </p>
          </div>
        </div>

        {/* S3 Storage Status */}
        <div className="relative overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-3.5 flex items-center gap-3 ring-1 ring-blue-500/20">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            <HardDrive className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="flex h-2 w-2 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isS3Configured ? 'bg-blue-400' : 'bg-slate-400'}`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isS3Configured ? 'bg-blue-500' : 'bg-slate-400'}`} />
              </span>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-none truncate">
                {isS3Configured ? 'S3 Storage Active' : 'S3 Unconfigured'}
              </p>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate">
              {s3Bucket || 'No bucket configured'}
            </p>
          </div>
        </div>

        {/* Sender Identity */}
        <div className="relative overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-3.5 flex items-center gap-3 ring-1 ring-violet-500/20">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-purple-600 text-white">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-none truncate">
              {fromName}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate">
              {fromEmail || smtpUser || 'No From Identity'}
            </p>
          </div>
        </div>

        {/* Storage Vault Region */}
        <div className="relative overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-3.5 flex items-center gap-3 ring-1 ring-amber-500/20">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-amber-500 to-orange-500 text-white">
            <Database className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-none truncate">
              Region: {s3Region}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate">
              {s3Endpoint ? 'Custom S3 Endpoint' : 'AWS Standard'}
            </p>
          </div>
        </div>
      </div>

      {/* Modern Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('smtp')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
            activeTab === 'smtp'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Mail className="h-4 w-4" />
          <span>SMTP Mail Gateway</span>
          {isSmtpConfigured && (
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('s3')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
            activeTab === 's3'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <HardDrive className="h-4 w-4" />
          <span>S3 Cloud Storage</span>
          {isS3Configured && (
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('json')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
            activeTab === 'json'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Code2 className="h-4 w-4" />
          <span>Unified JSON Preview</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: SMTP CONFIGURATION */}
      {/* ==================================================================== */}
      {activeTab === 'smtp' && (
        <div className="space-y-6">
          {/* Provider Presets */}
          <div className="rounded-md border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  SMTP Presets
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                1-click populate host, recommended port, and TLS encryption
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {SMTP_PRESETS.map((preset) => {
                const isSelected = activeSmtpPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplySmtpPreset(preset)}
                    className={`text-left p-3.5 rounded-md border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 dark:border-indigo-500 dark:bg-indigo-950/20 ring-1 ring-indigo-600/30'
                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {preset.name}
                      </span>
                      {isSelected && (
                        <Badge variant="success" size="sm" className="px-1.5 py-0 text-[10px]">
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      {preset.hint}
                    </p>
                    {preset.host && (
                      <p className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 mt-2">
                        {preset.host}:{preset.port}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form */}
            <div className="lg:col-span-7">
              <form onSubmit={handleSaveSmtp} className="rounded-md border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950 space-y-5">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 text-white">
                    <SlidersHorizontal className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      SMTP Credentials (<code className="text-indigo-600 dark:text-indigo-400 text-xs">smtp: &#123;&#125;</code>)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Stored in MongoDB database. Used for employee onboarding passwords, OTPs, and password resets.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <Input
                      label="SMTP Host"
                      placeholder="smtp.gmail.com"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      leftIcon={<Globe className="h-4 w-4 text-slate-400" />}
                      required
                    />
                  </div>
                  <div>
                    <Input
                      label="Port"
                      type="number"
                      placeholder="587"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(Number(e.target.value))}
                      required
                    />
                  </div>
                </div>

                {/* TLS Toggle */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Transport Security Protocol
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSmtpSecure(false);
                        if (smtpPort === 465) setSmtpPort(587);
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-md border text-xs font-medium cursor-pointer transition-colors ${
                        !smtpSecure
                          ? 'border-indigo-600 bg-indigo-50/40 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/20 dark:text-indigo-300 ring-1 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <span>STARTTLS (Port 587)</span>
                      {!smtpSecure && <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSmtpSecure(true);
                        if (smtpPort === 587) setSmtpPort(465);
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-md border text-xs font-medium cursor-pointer transition-colors ${
                        smtpSecure
                          ? 'border-indigo-600 bg-indigo-50/40 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/20 dark:text-indigo-300 ring-1 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <span>SSL / TLS (Port 465)</span>
                      {smtpSecure && <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Input
                    label="SMTP Username / Account Email"
                    placeholder="e.g. notifications@company.com"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    leftIcon={<Mail className="h-4 w-4 text-slate-400" />}
                    required
                  />

                  <div className="space-y-1">
                    <Input
                      label="SMTP Password / App Secret"
                      type="password"
                      isPasswordToggle
                      placeholder={hasPassword ? '•••••••••••••••• (Leave blank to keep active password)' : 'Enter SMTP password or app secret'}
                      value={smtpPass}
                      onChange={(e) => setSmtpPass(e.target.value)}
                      leftIcon={<Key className="h-4 w-4 text-slate-400" />}
                    />
                    {maskedPassword && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        <span>Vaulted in Database:</span>
                        <code className="font-mono bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded text-indigo-600 dark:text-indigo-400 text-[10.5px]">
                          {maskedPassword}
                        </code>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Input
                    label="Sender Display Name"
                    placeholder="e.g. PeopleOS System or Acme Corp"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                  />
                  <Input
                    label="Sender Email Address"
                    placeholder="e.g. hr@company.com"
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                  />
                </div>

                <div className="pt-3 flex justify-end">
                  <Button
                    type="submit"
                    isLoading={isSaving}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2"
                  >
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    Save SMTP Settings
                  </Button>
                </div>
              </form>
            </div>

            {/* Diagnostics */}
            <div className="lg:col-span-5 space-y-5">
              <div className="rounded-md border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600 text-white">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Live SMTP Diagnostic Test
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Send a real-time diagnostic test email.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Input
                    label="Recipient Email"
                    type="email"
                    placeholder="recipient@example.com"
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                    leftIcon={<Send className="h-4 w-4 text-slate-400" />}
                  />

                  <Button
                    type="button"
                    onClick={handleTestSmtp}
                    isLoading={isTestingSmtp}
                    disabled={isSaving}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 font-semibold text-xs py-2.5"
                  >
                    <Send className="h-3.5 w-3.5 mr-2" />
                    Dispatch Test Email
                  </Button>
                </div>

                {smtpTestResult && (
                  <div
                    className={`p-4 rounded-md border text-xs space-y-2 animate-in fade-in duration-200 ${
                      smtpTestResult.success
                        ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300'
                        : 'border-rose-200 bg-rose-50/70 dark:border-rose-900 dark:bg-rose-950/20 text-rose-900 dark:text-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold">
                      {smtpTestResult.success ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                      )}
                      <span>{smtpTestResult.success ? 'SMTP Connection Verified' : 'SMTP Connection Failed'}</span>
                      {smtpTestResult.timestamp && (
                        <span className="ml-auto text-[10px] font-normal text-slate-500">
                          {smtpTestResult.timestamp}
                        </span>
                      )}
                    </div>
                    <p className="text-[11.5px] leading-relaxed">{smtpTestResult.message}</p>
                    {smtpTestResult.diagnostic?.response && (
                      <div className="font-mono text-[10.5px] text-slate-700 dark:text-slate-300 pt-1 border-t border-emerald-200/60 dark:border-emerald-900/60">
                        Server: {smtpTestResult.diagnostic.response}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: S3 CLOUD STORAGE */}
      {/* ==================================================================== */}
      {activeTab === 's3' && (
        <div className="space-y-6">
          {/* S3 Presets */}
          <div className="rounded-md border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-500" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Cloud Storage Presets
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
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
                    onClick={() => handleApplyS3Preset(preset)}
                    className={`text-left p-3.5 rounded-md border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/20 ring-1 ring-blue-600/30'
                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {preset.name}
                      </span>
                      {isSelected && (
                        <Badge variant="info" size="sm" className="px-1.5 py-0 text-[10px]">
                          Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      {preset.hint}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form */}
            <div className="lg:col-span-7">
              <form onSubmit={handleSaveS3} className="rounded-md border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950 space-y-5">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white">
                    <HardDrive className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      S3 Cloud Storage (<code className="text-blue-600 dark:text-blue-400 text-xs">s3_config: &#123;&#125;</code>)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Powers employee document vault, identity proof uploads, resumes, and enterprise avatars.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="S3 Bucket Name"
                    placeholder="e.g. peopleos-enterprise-vault"
                    value={s3Bucket}
                    onChange={(e) => setS3Bucket(e.target.value)}
                    leftIcon={<Database className="h-4 w-4 text-slate-400" />}
                    required
                  />
                  <Input
                    label="AWS Region"
                    placeholder="e.g. us-east-1"
                    value={s3Region}
                    onChange={(e) => setS3Region(e.target.value)}
                    leftIcon={<Globe className="h-4 w-4 text-slate-400" />}
                    required
                  />
                </div>

                <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Input
                    label="AWS Access Key ID"
                    placeholder="e.g. AKIAIOSFODNN7EXAMPLE"
                    value={s3AccessKeyId}
                    onChange={(e) => setS3AccessKeyId(e.target.value)}
                    leftIcon={<Key className="h-4 w-4 text-slate-400" />}
                    required
                  />

                  <div className="space-y-1">
                    <Input
                      label="AWS Secret Access Key"
                      type="password"
                      isPasswordToggle
                      placeholder={s3HasSecret ? '•••••••••••••••• (Leave blank to keep active secret)' : 'Enter AWS Secret Access Key'}
                      value={s3SecretAccessKey}
                      onChange={(e) => setS3SecretAccessKey(e.target.value)}
                      leftIcon={<Key className="h-4 w-4 text-slate-400" />}
                    />
                    {s3MaskedSecret && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                        <CheckCircle2 className="h-3 w-3 text-blue-500" />
                        <span>Vaulted in Database:</span>
                        <code className="font-mono bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400 text-[10.5px]">
                          {s3MaskedSecret}
                        </code>
                      </div>
                    )}
                  </div>
                </div>

                {/* Optional Custom Endpoint & Force Path Style */}
                <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Input
                    label="Custom S3 Endpoint (Optional)"
                    placeholder="e.g. https://<account_id>.r2.cloudflarestorage.com or http://localhost:9000"
                    value={s3Endpoint}
                    onChange={(e) => setS3Endpoint(e.target.value)}
                    helperText="Leave empty for standard AWS S3. Fill for Cloudflare R2, MinIO, or Wasabi."
                  />

                  <Input
                    label="Public CDN / Base URL (Optional)"
                    placeholder="e.g. https://cdn.peopleos.internal/vault"
                    value={s3PublicUrlBase}
                    onChange={(e) => setS3PublicUrlBase(e.target.value)}
                    helperText="Optional public domain for serving uploaded public assets."
                  />

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="forcePathStyle"
                      checked={s3ForcePathStyle}
                      onChange={(e) => setS3ForcePathStyle(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="forcePathStyle" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      Force Path-Style Addressing (<code className="text-[11px]">http://s3.local/bucket/key</code> instead of subdomain)
                    </label>
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <Button
                    type="submit"
                    isLoading={isSaving}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2"
                  >
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    Save S3 Storage Settings
                  </Button>
                </div>
              </form>
            </div>

            {/* S3 Diagnostics */}
            <div className="lg:col-span-5 space-y-5">
              <div className="rounded-md border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      S3 Connectivity Diagnostics
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Directly verifies bucket permissions & AWS credentials.
                    </p>
                  </div>
                </div>

                <div className="rounded-md bg-slate-50 dark:bg-slate-900/50 p-3 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2.5 border border-slate-100 dark:border-slate-800">
                  <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <span>
                    Executes <code className="text-[11px]">HeadBucket</code> & <code className="text-[11px]">ListObjects</code> against your S3 bucket endpoint to guarantee file vault readiness.
                  </span>
                </div>

                <Button
                  type="button"
                  onClick={handleTestS3}
                  isLoading={isTestingS3}
                  disabled={isSaving}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 font-semibold text-xs py-2.5"
                >
                  <Zap className="h-3.5 w-3.5 mr-2" />
                  Test S3 Bucket Connection
                </Button>

                {s3TestResult && (
                  <div
                    className={`p-4 rounded-md border text-xs space-y-2 animate-in fade-in duration-200 ${
                      s3TestResult.success
                        ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300'
                        : 'border-rose-200 bg-rose-50/70 dark:border-rose-900 dark:bg-rose-950/20 text-rose-900 dark:text-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold">
                      {s3TestResult.success ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                      )}
                      <span>{s3TestResult.success ? 'S3 Bucket Connected' : 'S3 Connection Failed'}</span>
                      {s3TestResult.timestamp && (
                        <span className="ml-auto text-[10px] font-normal text-slate-500">
                          {s3TestResult.timestamp}
                        </span>
                      )}
                    </div>
                    <p className="text-[11.5px] leading-relaxed">{s3TestResult.message}</p>
                    {s3TestResult.details && (
                      <div className="font-mono text-[10.5px] text-slate-700 dark:text-slate-300 pt-1 border-t border-emerald-200/60 dark:border-emerald-900/60 space-y-0.5">
                        <div>Bucket: {s3TestResult.details.bucket}</div>
                        <div>Region: {s3TestResult.details.region}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: UNIFIED JSON PREVIEW */}
      {/* ==================================================================== */}
      {activeTab === 'json' && (
        <div className="rounded-md border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-indigo-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Unified Business Settings Schema (<code className="text-xs text-indigo-600 dark:text-indigo-400">&#123; smtp: &#123;&#125;, s3_config: &#123;&#125; &#125;</code>)
              </h3>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyJson}
              className="flex items-center gap-1.5 text-xs"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy JSON
            </Button>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            This live structure represents the combined payload persisted in the MongoDB <code className="text-indigo-600 dark:text-indigo-400 font-mono">business_settings</code> collection and utilized by backend services (<code className="text-indigo-600 dark:text-indigo-400 font-mono">MailService</code> and <code className="text-indigo-600 dark:text-indigo-400 font-mono">S3Service</code>).
          </p>

          <pre className="p-4 rounded-md bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto border border-slate-800 leading-relaxed shadow-inner">
            {JSON.stringify(jsonStructure, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
export default BusinessSettingsPage;
