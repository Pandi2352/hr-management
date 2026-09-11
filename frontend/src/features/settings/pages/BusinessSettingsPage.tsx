import React, { useState, useEffect } from 'react';
import {
  Mail,
  ShieldCheck,
  RotateCcw,
  HardDrive,
  Database,
  Code2,
  Copy,
} from 'lucide-react';
import { Button } from '../../../components/ui';
import { PageHeader } from '../../../components/common/PageHeader';
import { useToast } from '../../../components/ui/toast';
import { useAuth } from '../../auth/context/AuthContext';
import {
  settingsApi,
  type TestSmtpResult,
  type TestS3Result,
} from '../api/settings.api';
import { SmtpSettingsCard } from '../components/SmtpSettingsCard';
import { S3StorageSettingsCard } from '../components/S3StorageSettingsCard';
import { TestSmtpModal } from '../components/TestSmtpModal';
import { TestS3Modal } from '../components/TestS3Modal';

export function BusinessSettingsPage() {
  const toast = useToast();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'smtp' | 's3' | 'json'>('smtp');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [isTestingS3, setIsTestingS3] = useState(false);

  // Modal open states
  const [isSmtpModalOpen, setIsSmtpModalOpen] = useState(false);
  const [isS3ModalOpen, setIsS3ModalOpen] = useState(false);

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
      toast.error(err.message || 'Failed to load business settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllSettings();
  }, []);

  const handleSaveSmtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!smtpHost) {
      toast.error('SMTP Host is required');
      return;
    }
    if (!smtpUser) {
      toast.error('SMTP User/Email is required');
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        user: smtpUser,
        fromName,
        fromEmail,
      };
      if (smtpPass) {
        payload.pass = smtpPass;
      }
      const updated = await settingsApi.updateSmtpSettings(payload);
      setMaskedPassword(updated.maskedPassword || '');
      setHasPassword(Boolean(updated.hasPassword));
      setIsSmtpConfigured(Boolean(updated.isConfigured));
      setSmtpPass('');
      toast.success('SMTP settings saved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save SMTP settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveS3 = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!s3Bucket) {
      toast.error('S3 Bucket name is required');
      return;
    }
    if (!s3AccessKeyId) {
      toast.error('S3 Access Key ID is required');
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        bucket: s3Bucket,
        region: s3Region,
        accessKeyId: s3AccessKeyId,
        endpoint: s3Endpoint || undefined,
        forcePathStyle: s3ForcePathStyle,
        publicUrlBase: s3PublicUrlBase || undefined,
      };
      if (s3SecretAccessKey) {
        payload.secretAccessKey = s3SecretAccessKey;
      }
      const updated = await settingsApi.updateS3Settings(payload);
      setS3MaskedSecret(updated.maskedSecretAccessKey || '');
      setS3HasSecret(Boolean(updated.hasSecretAccessKey));
      setIsS3Configured(Boolean(updated.isConfigured));
      setS3SecretAccessKey('');
      toast.success('S3 cloud storage configuration saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save S3 configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestSmtp = async () => {
    if (!testRecipient) {
      toast.error('Please specify a recipient email address');
      return;
    }
    setIsTestingSmtp(true);
    setSmtpTestResult(null);
    try {
      const res = await settingsApi.testSmtpConnection({ toEmail: testRecipient });
      setSmtpTestResult({
        success: true,
        message: res.message || 'Test email dispatched successfully',
        diagnostic: res.diagnostic,
        timestamp: new Date().toLocaleTimeString(),
      });
      toast.success(res.message || 'Test email dispatched');
      setIsSmtpConfigured(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'SMTP test execution failed';
      setSmtpTestResult({
        success: false,
        message: msg,
        timestamp: new Date().toLocaleTimeString(),
      });
      toast.error(msg);
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const handleTestS3 = async () => {
    setIsTestingS3(true);
    setS3TestResult(null);
    try {
      const res = await settingsApi.testS3Connection({
        bucket: s3Bucket,
        region: s3Region,
        accessKeyId: s3AccessKeyId,
        endpoint: s3Endpoint || undefined,
        forcePathStyle: s3ForcePathStyle,
      });
      setS3TestResult({
        success: true,
        message: res.message || 'S3 Bucket connection verified successfully',
        details: res.details,
        timestamp: new Date().toLocaleTimeString(),
      });
      toast.success(res.message || 'S3 Bucket connected');
      setIsS3Configured(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'S3 test failed';
      setS3TestResult({
        success: false,
        message: msg,
        timestamp: new Date().toLocaleTimeString(),
      });
      toast.error(msg);
    } finally {
      setIsTestingS3(false);
    }
  };

  const jsonStructure = {
    smtp: {
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      user: smtpUser,
      pass: hasPassword ? '********' : undefined,
      fromName,
      fromEmail,
      isConfigured: isSmtpConfigured,
    },
    s3_config: {
      bucket: s3Bucket,
      region: s3Region,
      accessKeyId: s3AccessKeyId,
      secretAccessKey: s3HasSecret ? '********' : undefined,
      endpoint: s3Endpoint || undefined,
      forcePathStyle: s3ForcePathStyle,
      publicUrlBase: s3PublicUrlBase || undefined,
      isConfigured: isS3Configured,
    },
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(jsonStructure, null, 2));
    toast.success('Configuration JSON copied to clipboard');
  };

  if (isLoading) {
    return (
      <div className="space-y-6 w-full animate-pulse">
        <div className="h-9 w-64 bg-surface-hover rounded-md" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-surface border border-hairline rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-12">
      <PageHeader
        title={
          <div className="flex items-center gap-2.5">
            <span>Business Infrastructure & Integrations</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20">
              Enterprise Gateway
            </span>
          </div>
        }
        description="Unified configuration for SMTP mail relays, S3 asset vaults, security credentials, and diagnostic test runners."
        actions={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadAllSettings}
              className="flex items-center gap-1.5 rounded-md text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reload
            </Button>
          </div>
        }
      />

      {/* Gateway Status Metric Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-md border border-hairline bg-surface p-3.5 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Mail className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${isSmtpConfigured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <p className="text-xs font-bold text-foreground truncate">
                {isSmtpConfigured ? 'SMTP Online' : 'SMTP Unverified'}
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              {smtpHost ? `${smtpHost}:${smtpPort}` : 'Not configured'}
            </p>
          </div>
        </div>

        <div className="rounded-md border border-hairline bg-surface p-3.5 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <HardDrive className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${isS3Configured ? 'bg-blue-500' : 'bg-muted-foreground'}`} />
              <p className="text-xs font-bold text-foreground truncate">
                {isS3Configured ? 'S3 Storage Active' : 'S3 Unconfigured'}
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              {s3Bucket || 'No bucket configured'}
            </p>
          </div>
        </div>

        <div className="rounded-md border border-hairline bg-surface p-3.5 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">
              {fromName || 'System Mailer'}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              {fromEmail || smtpUser || 'No From Identity'}
            </p>
          </div>
        </div>

        <div className="rounded-md border border-hairline bg-surface p-3.5 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Database className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">
              Region: {s3Region}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              {s3Endpoint ? 'Custom S3 Endpoint' : 'AWS Standard'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-hairline">
        <button
          type="button"
          onClick={() => setActiveTab('smtp')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
            activeTab === 'smtp'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Mail className="h-4 w-4" />
          <span>SMTP Mail Gateway</span>
          {isSmtpConfigured && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('s3')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
            activeTab === 's3'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <HardDrive className="h-4 w-4" />
          <span>S3 Cloud Storage</span>
          {isS3Configured && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('json')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
            activeTab === 'json'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Code2 className="h-4 w-4" />
          <span>Unified JSON Preview</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'smtp' && (
        <SmtpSettingsCard
          smtpHost={smtpHost}
          setSmtpHost={setSmtpHost}
          smtpPort={smtpPort}
          setSmtpPort={setSmtpPort}
          smtpSecure={smtpSecure}
          setSmtpSecure={setSmtpSecure}
          smtpUser={smtpUser}
          setSmtpUser={setSmtpUser}
          smtpPass={smtpPass}
          setSmtpPass={setSmtpPass}
          fromName={fromName}
          setFromName={setFromName}
          fromEmail={fromEmail}
          setFromEmail={setFromEmail}
          maskedPassword={maskedPassword}
          hasPassword={hasPassword}
          activeSmtpPreset={activeSmtpPreset}
          setActiveSmtpPreset={setActiveSmtpPreset}
          isSaving={isSaving}
          onSave={handleSaveSmtp}
          onOpenTestModal={() => setIsSmtpModalOpen(true)}
        />
      )}

      {activeTab === 's3' && (
        <S3StorageSettingsCard
          s3Bucket={s3Bucket}
          setS3Bucket={setS3Bucket}
          s3Region={s3Region}
          setS3Region={setS3Region}
          s3AccessKeyId={s3AccessKeyId}
          setS3AccessKeyId={setS3AccessKeyId}
          s3SecretAccessKey={s3SecretAccessKey}
          setS3SecretAccessKey={setS3SecretAccessKey}
          s3MaskedSecret={s3MaskedSecret}
          s3HasSecret={s3HasSecret}
          s3Endpoint={s3Endpoint}
          setS3Endpoint={setS3Endpoint}
          s3ForcePathStyle={s3ForcePathStyle}
          setS3ForcePathStyle={setS3ForcePathStyle}
          s3PublicUrlBase={s3PublicUrlBase}
          setS3PublicUrlBase={setS3PublicUrlBase}
          activeS3Preset={activeS3Preset}
          setActiveS3Preset={setActiveS3Preset}
          isSaving={isSaving}
          onSave={handleSaveS3}
          onOpenTestModal={() => setIsS3ModalOpen(true)}
        />
      )}

      {activeTab === 'json' && (
        <div className="rounded-md border border-hairline bg-surface p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">
                Unified Business Settings Schema
              </h3>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyJson}
              className="flex items-center gap-1.5 text-xs rounded-md"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy JSON
            </Button>
          </div>

          <pre className="p-4 rounded-md bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto border border-hairline leading-relaxed">
            {JSON.stringify(jsonStructure, null, 2)}
          </pre>
        </div>
      )}

      {/* Test Modals */}
      <TestSmtpModal
        isOpen={isSmtpModalOpen}
        onClose={() => setIsSmtpModalOpen(false)}
        testRecipient={testRecipient}
        setTestRecipient={setTestRecipient}
        isTesting={isTestingSmtp}
        onRunTest={handleTestSmtp}
        testResult={smtpTestResult}
      />

      <TestS3Modal
        isOpen={isS3ModalOpen}
        onClose={() => setIsS3ModalOpen(false)}
        isTesting={isTestingS3}
        onRunTest={handleTestS3}
        s3Bucket={s3Bucket}
        testResult={s3TestResult}
      />
    </div>
  );
}

export default BusinessSettingsPage;
