import { useState, useEffect } from 'react';
import {
  Lock,
  Clock,
  ShieldAlert,
  Save,
  RotateCcw,
  Check,
  Info,
  Ruler,
  Timer,
  KeyRound,
  Ban,
} from 'lucide-react';
import { Button, SelectField, Badge } from '../../../components/ui';
import { PageHeader } from '../../../components/common/PageHeader';
import { useToast } from '../../../components/ui/toast';
import { securityApi } from '../api/security.api';
import type { SecurityPolicy } from '../types/security.types';

const RULE_ACCENTS = [
  {
    id: 'passwordRequireUppercase' as const,
    label: 'Require Uppercase Letter',
    desc: 'At least one A-Z character',
    tag: 'A-Z',
    ring: 'border-sky-400 dark:border-sky-400',
    tint: 'bg-sky-50/60 dark:bg-sky-950/20',
    chip: 'bg-sky-500 border-sky-500',
    tagText: 'text-sky-600 dark:text-sky-400',
  },
  {
    id: 'passwordRequireLowercase' as const,
    label: 'Require Lowercase Letter',
    desc: 'At least one a-z character',
    tag: 'a-z',
    ring: 'border-teal-400 dark:border-teal-400',
    tint: 'bg-teal-50/60 dark:bg-teal-950/20',
    chip: 'bg-teal-500 border-teal-500',
    tagText: 'text-teal-600 dark:text-teal-400',
  },
  {
    id: 'passwordRequireNumbers' as const,
    label: 'Require Numeric Digits',
    desc: 'At least one 0-9 number',
    tag: '0-9',
    ring: 'border-violet-400 dark:border-violet-400',
    tint: 'bg-violet-50/60 dark:bg-violet-950/20',
    chip: 'bg-violet-500 border-violet-500',
    tagText: 'text-violet-600 dark:text-violet-400',
  },
  {
    id: 'passwordRequireSymbols' as const,
    label: 'Require Special Symbols',
    desc: 'At least one special char (!@#$)',
    tag: '!@#',
    ring: 'border-fuchsia-400 dark:border-fuchsia-400',
    tint: 'bg-fuchsia-50/60 dark:bg-fuchsia-950/20',
    chip: 'bg-fuchsia-500 border-fuchsia-500',
    tagText: 'text-fuchsia-600 dark:text-fuchsia-400',
  },
];

function getPolicyStrength(policy: SecurityPolicy) {
  let score = 0;
  if (policy.passwordMinLength >= 8) score += 1;
  if (policy.passwordMinLength >= 12) score += 1;
  if (policy.passwordRequireUppercase) score += 1;
  if (policy.passwordRequireLowercase) score += 1;
  if (policy.passwordRequireNumbers) score += 1;
  if (policy.passwordRequireSymbols) score += 1;

  const levels = [
    { label: 'Weak', color: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' },
    { label: 'Weak', color: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' },
    { label: 'Basic', color: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
    { label: 'Fair', color: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
    { label: 'Strong', color: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400' },
    { label: 'Very Strong', color: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
    { label: 'Excellent', color: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  ];

  return { score, max: 6, ...levels[score] };
}

export function SecuritySettingsPage() {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [policy, setPolicy] = useState<SecurityPolicy>({
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumbers: true,
    passwordRequireSymbols: true,
    sessionTimeoutMinutes: 60,
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 30,
  });

  const loadPolicy = async () => {
    try {
      setIsLoading(true);
      const data = await securityApi.getSecurityPolicy();
      if (data) setPolicy(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load security policies');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPolicy();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const updated = await securityApi.updateSecurityPolicy(policy);
      setPolicy(updated);
      toast.success('Security policies updated successfully');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save security policy');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="h-64 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800" />
      </div>
    );
  }

  const strength = getPolicyStrength(policy);

  const durationLabel = (mins: number) => {
    if (mins >= 1440) return 'Permanent';
    if (mins >= 60) return `${mins / 60}h`;
    return `${mins}m`;
  };

  return (
    <div className="space-y-6 w-full">
      <PageHeader
        title="Platform Security & Governance Policies"
        description="Configure password strength mandates, session timeout durations, and account lockout thresholds."
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadPolicy}
              disabled={isSaving}
              className="flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Defaults
            </Button>
            <Button
              onClick={handleSave}
              size="sm"
              isLoading={isSaving}
              className="flex items-center gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              Save Security Policy
            </Button>
          </>
        }
      />

      {/* Quick-Glance Colorful Stat Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Min Password Length',
            value: `${policy.passwordMinLength} chars`,
            icon: Ruler,
            from: 'from-blue-500',
            to: 'to-sky-500',
            ring: 'ring-blue-500/20',
          },
          {
            label: 'Session Timeout',
            value: durationLabel(policy.sessionTimeoutMinutes),
            icon: Timer,
            from: 'from-violet-500',
            to: 'to-purple-500',
            ring: 'ring-violet-500/20',
          },
          {
            label: 'Lockout Threshold',
            value: `${policy.maxFailedAttempts} attempts`,
            icon: KeyRound,
            from: 'from-amber-500',
            to: 'to-orange-500',
            ring: 'ring-amber-500/20',
          },
          {
            label: 'Lockout Duration',
            value: durationLabel(policy.lockoutDurationMinutes),
            icon: Ban,
            from: 'from-rose-500',
            to: 'to-pink-500',
            ring: 'ring-rose-500/20',
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`relative overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 p-3.5 flex items-center gap-3 ring-1 ${stat.ring}`}
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br ${stat.from} ${stat.to} text-white`}
            >
              <stat.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold text-slate-900 dark:text-slate-100 leading-none truncate">
                {stat.value}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 truncate">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* SECTION 1: PASSWORD COMPLEXITY ENFORCEMENT */}
        <div className="rounded-md border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950 space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Password Complexity Requirements
                </h2>
                <p className="text-xs text-slate-400">
                  Mandates enforced when employees set or reset portal passwords.
                </p>
              </div>
            </div>

            {/* Live Policy Strength Gauge */}
            <div className="flex items-center gap-2 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 pl-3 pr-1 py-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Policy Strength
              </span>
              <div className="flex gap-0.5">
                {Array.from({ length: strength.max }).map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-2 w-2 rounded-md transition-colors ${
                      idx < strength.score ? strength.color : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  />
                ))}
              </div>
              <Badge
                size="sm"
                className={`${strength.text} bg-transparent font-bold px-1.5`}
              >
                {strength.label}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Minimum Length Slider */}
            <div className="space-y-2 rounded-md border border-blue-200/70 bg-gradient-to-br from-blue-50/80 to-sky-50/40 p-4 dark:border-blue-900/40 dark:from-blue-950/30 dark:to-sky-950/10">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Minimum Password Length: <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">{policy.passwordMinLength} characters</span>
                </label>
                <Badge
                  size="sm"
                  variant={policy.passwordMinLength < 8 ? 'warning' : policy.passwordMinLength <= 12 ? 'info' : 'success'}
                >
                  {policy.passwordMinLength < 8 ? 'Basic' : policy.passwordMinLength <= 12 ? 'Standard Enterprise' : 'High Security'}
                </Badge>
              </div>

              <input
                type="range"
                min="6"
                max="24"
                step="1"
                value={policy.passwordMinLength}
                onChange={(e) => setPolicy({ ...policy, passwordMinLength: Number(e.target.value) })}
                className="w-full accent-blue-500 cursor-pointer"
              />

              <div className="flex justify-between text-[11px] font-medium text-slate-400">
                <span>6 Chars</span>
                <span>12 Chars</span>
                <span>24 Chars (Max)</span>
              </div>
            </div>

            {/* Character Set Toggles — each rule gets its own accent color */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {RULE_ACCENTS.map((item) => {
                const isActive = !!policy[item.id];
                return (
                  <div
                    key={item.id}
                    onClick={() =>
                      setPolicy((prev) => ({
                        ...prev,
                        [item.id]: !prev[item.id],
                      }))
                    }
                    className={`p-3 rounded-md border text-left cursor-pointer transition-all flex items-start justify-between gap-2 ${
                      isActive
                        ? `${item.ring} ${item.tint}`
                        : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-md text-[9px] font-black tracking-tight ${
                            isActive ? `${item.tagText} bg-white dark:bg-slate-900` : 'text-slate-400 bg-slate-100 dark:bg-slate-800'
                          }`}
                        >
                          {item.tag}
                        </span>
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {item.label}
                        </p>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        {item.desc}
                      </p>
                    </div>

                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition-colors mt-0.5 ${
                        isActive
                          ? `${item.chip} text-white`
                          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                      }`}
                    >
                      {isActive && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* SECTION 2: SESSION INACTIVITY & TIMEOUT */}
        <div className="rounded-md border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950 space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-purple-600 text-white">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Session Lifecycle & Inactivity Logout
              </h2>
              <p className="text-xs text-slate-400">
                Automatic termination of idle portal sessions to prevent unauthorized device access.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="rounded-md border border-violet-200/70 bg-gradient-to-br from-violet-50/80 to-purple-50/40 p-4 dark:border-violet-900/40 dark:from-violet-950/30 dark:to-purple-950/10 md:col-span-1">
              <SelectField
                label="Inactivity Session Expiry"
                value={String(policy.sessionTimeoutMinutes)}
                onChange={(e) => setPolicy({ ...policy, sessionTimeoutMinutes: Number(e.target.value) })}
                options={[
                  { value: '15', label: '15 minutes of idle time' },
                  { value: '30', label: '30 minutes of idle time' },
                  { value: '60', label: '1 hour (Standard Enterprise)' },
                  { value: '120', label: '2 hours of idle time' },
                  { value: '480', label: '8 hours (Full working day)' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: BRUTE-FORCE PROTECTION & ACCOUNT LOCKOUT */}
        <div className="rounded-md border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950 space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br from-amber-500 to-rose-600 text-white">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Brute-Force Defense & Account Lockout
              </h2>
              <p className="text-xs text-slate-400">
                Protect user credentials from password spray and credential stuffing attacks.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="rounded-md border border-amber-200/70 bg-gradient-to-br from-amber-50/80 to-orange-50/40 p-4 dark:border-amber-900/40 dark:from-amber-950/30 dark:to-orange-950/10">
              <SelectField
                label="Max Failed Attempts Before Lockout"
                value={String(policy.maxFailedAttempts)}
                onChange={(e) => setPolicy({ ...policy, maxFailedAttempts: Number(e.target.value) })}
                options={[
                  { value: '3', label: '3 consecutive failed attempts' },
                  { value: '5', label: '5 consecutive failed attempts (Recommended)' },
                  { value: '10', label: '10 consecutive failed attempts' },
                ]}
              />
            </div>

            <div className="rounded-md border border-rose-200/70 bg-gradient-to-br from-rose-50/80 to-pink-50/40 p-4 dark:border-rose-900/40 dark:from-rose-950/30 dark:to-pink-950/10">
              <SelectField
                label="Temporary Lockout Duration"
                value={String(policy.lockoutDurationMinutes)}
                onChange={(e) => setPolicy({ ...policy, lockoutDurationMinutes: Number(e.target.value) })}
                options={[
                  { value: '15', label: '15 minutes temporary lockout' },
                  { value: '30', label: '30 minutes temporary lockout' },
                  { value: '60', label: '1 hour lockout' },
                  { value: '1440', label: 'Permanent until HR Admin unlocks' },
                ]}
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-md bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200/70 dark:from-indigo-950/30 dark:to-blue-950/20 dark:border-indigo-900/40 text-xs text-indigo-800 dark:text-indigo-300">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-500 text-white">
              <Info className="h-3.5 w-3.5" />
            </span>
            <span>
              HR Administrators can unlock an account at any time before the lockout timer expires via the Users Roster.
            </span>
          </div>
        </div>
      </form>
    </div>
  );
}
