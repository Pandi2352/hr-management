import React from 'react';
import {
  Mail,
  Key,
  Globe,
  SlidersHorizontal,
  Sparkles,
  CheckCircle2,
  Send,
  Save,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { Button, Input, Badge } from '../../../components/ui';
import { SMTP_PRESETS, type SmtpPreset } from '../../../config/smtpPresets.config';

interface SmtpSettingsCardProps {
  smtpHost: string;
  setSmtpHost: (v: string) => void;
  smtpPort: number;
  setSmtpPort: (v: number) => void;
  smtpSecure: boolean;
  setSmtpSecure: (v: boolean) => void;
  smtpUser: string;
  setSmtpUser: (v: string) => void;
  smtpPass: string;
  setSmtpPass: (v: string) => void;
  fromName: string;
  setFromName: (v: string) => void;
  fromEmail: string;
  setFromEmail: (v: string) => void;
  maskedPassword: string;
  hasPassword: boolean;
  activeSmtpPreset: string;
  setActiveSmtpPreset: (v: string) => void;
  isSaving: boolean;
  onSave: (e?: React.FormEvent) => void;
  onOpenTestModal: () => void;
}

export const SmtpSettingsCard: React.FC<SmtpSettingsCardProps> = ({
  smtpHost,
  setSmtpHost,
  smtpPort,
  setSmtpPort,
  smtpSecure,
  setSmtpSecure,
  smtpUser,
  setSmtpUser,
  smtpPass,
  setSmtpPass,
  fromName,
  setFromName,
  fromEmail,
  setFromEmail,
  maskedPassword,
  hasPassword,
  activeSmtpPreset,
  setActiveSmtpPreset,
  isSaving,
  onSave,
  onOpenTestModal,
}) => {
  const handleApplyPreset = (preset: SmtpPreset) => {
    setActiveSmtpPreset(preset.id);
    if (preset.host) {
      setSmtpHost(preset.host);
      setSmtpPort(preset.port);
      setSmtpSecure(preset.secure);
    }
  };

  return (
    <div className="space-y-6">
      {/* Provider Presets */}
      <div className="rounded-md border border-hairline bg-surface p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">SMTP Presets</h3>
          </div>
          <span className="text-[11px] text-muted-foreground">
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
                onClick={() => handleApplyPreset(preset)}
                className={`text-left p-3.5 rounded-md border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                    : 'border-hairline hover:border-hairline-hover bg-surface-hover/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-foreground">{preset.name}</span>
                  {isSelected && (
                    <Badge variant="success" size="sm" className="px-1.5 py-0 text-[10px]">
                      Active
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  {preset.hint}
                </p>
                {preset.host && (
                  <p className="text-[10px] font-mono text-primary mt-2">
                    {preset.host}:{preset.port}
                  </p>
                )}
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
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <SlidersHorizontal className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  SMTP Credentials
                </h3>
                <p className="text-xs text-muted-foreground">
                  Used for system alerts, welcome emails, passwords, and password resets.
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
                  leftIcon={<Globe className="h-4 w-4 text-muted-foreground" />}
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
              <label className="text-xs font-semibold text-foreground">
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
                      ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/20'
                      : 'border-hairline text-muted-foreground hover:bg-surface-hover'
                  }`}
                >
                  <span>STARTTLS (Port 587)</span>
                  {!smtpSecure && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSmtpSecure(true);
                    if (smtpPort === 587) setSmtpPort(465);
                  }}
                  className={`flex items-center justify-between p-2.5 rounded-md border text-xs font-medium cursor-pointer transition-colors ${
                    smtpSecure
                      ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/20'
                      : 'border-hairline text-muted-foreground hover:bg-surface-hover'
                  }`}
                >
                  <span>SSL / TLS (Port 465)</span>
                  {smtpSecure && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                </button>
              </div>
            </div>

            <div className="space-y-4 pt-2 border-t border-hairline">
              <Input
                label="SMTP Username / Account Email"
                placeholder="e.g. notifications@company.com"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                leftIcon={<Mail className="h-4 w-4 text-muted-foreground" />}
                required
              />

              <div>
                <Input
                  label="SMTP Password / App Password"
                  type="password"
                  placeholder={hasPassword ? '•••••••••••••••• (saved)' : 'Enter SMTP password'}
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  leftIcon={<Key className="h-4 w-4 text-muted-foreground" />}
                />
                {hasPassword && !smtpPass && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                    ✓ Password stored securely: {maskedPassword}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-hairline">
              <Input
                label="From Display Name"
                placeholder="PeopleOS HR"
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
              />
              <Input
                label="From Email Address"
                placeholder="noreply@company.com"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
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
                <Send className="h-3.5 w-3.5 text-primary" />
                Test Mail Gateway...
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={isSaving}
                className="flex items-center gap-1.5 rounded-md"
              >
                <Save className="h-3.5 w-3.5" />
                Save SMTP Settings
              </Button>
            </div>
          </form>
        </div>

        {/* Sidebar Info Column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-md border border-hairline bg-surface p-5 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <h4 className="text-xs font-bold text-foreground">Security & Delivery</h4>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              For security reasons, your SMTP credentials are encrypted at rest in MongoDB.
              When using Google Workspace, ensure 2-Step Verification is enabled and generate an App Password.
            </p>
          </div>

          <div className="rounded-md border border-hairline bg-surface p-5 space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <Info className="h-4 w-4 text-primary" />
              <span>Recommended Ports</span>
            </div>
            <ul className="space-y-1.5 pl-4 list-disc text-[11px]">
              <li><strong>Port 587</strong>: STARTTLS (Standard RFC 3207 modern submission)</li>
              <li><strong>Port 465</strong>: SMTPS (Implicit TLS wrapping from handshake)</li>
              <li><strong>Port 25</strong>: Often blocked by cloud hosting providers to deter spam</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
