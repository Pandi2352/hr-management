import { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { SelectField } from '../../../components/ui/SelectField';
import { useToast } from '../../../components/ui/toast';
import { organizationApi } from '../api/organization.api';
import type { OrganizationProfile } from '../types/organization.types';
import { Mail, Clock, Edit2 } from 'lucide-react';

const COMMON_TIMEZONES = [
  'Asia/Kolkata',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Asia/Singapore',
  'Asia/Dubai',
  'Asia/Tokyo',
  'Australia/Sydney',
  'UTC',
];

const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD - United States Dollar' },
  { code: 'EUR', symbol: '€', label: 'EUR - Euro' },
  { code: 'GBP', symbol: '£', label: 'GBP - British Pound' },
  { code: 'INR', symbol: '₹', label: 'INR - Indian Rupee' },
  { code: 'SGD', symbol: 'S$', label: 'SGD - Singapore Dollar' },
  { code: 'AUD', symbol: 'A$', label: 'AUD - Australian Dollar' },
  { code: 'CAD', symbol: 'C$', label: 'CAD - Canadian Dollar' },
  { code: 'AED', symbol: 'د.إ', label: 'AED - United Arab Emirates Dirham' },
];

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function OrganizationProfilePage() {
  const toast = useToast();
  const [profile, setProfile] = useState<OrganizationProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<OrganizationProfile>>({});

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const data = await organizationApi.getProfile();
      setProfile(data);
      setFormData(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load organization profile');
    } finally {
      setIsLoading(false);
    }
  };

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!formData.legalName?.trim()) errors.legalName = 'Legal name is required';
    if (!formData.corporateEmail?.trim()) {
      errors.corporateEmail = 'Corporate email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.corporateEmail.trim())) {
      errors.corporateEmail = 'Please enter a valid email address';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    try {
      setIsSaving(true);
      const updated = await organizationApi.updateProfile(formData);
      setProfile(updated);
      setFormData(updated);
      setIsEditing(false);
      toast.success('Organization profile updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="h-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Organization Profile
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage legal entity credentials, global timezones, and base operating standards.
          </p>
        </div>

        {!isEditing && (
          <Button
            size="sm"
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5"
          >
            <Edit2 className="h-3.5 w-3.5" />
            Edit Profile
          </Button>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Section 1: Company Information */}
        <div className="rounded-md border border-slate-200 bg-white p-5 dark:bg-slate-950 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 shadow-sm flex items-center justify-center shrink-0">
                <img
                  src={(profile as Record<string, any>)?.logoUrl || '/branding/nexora_ai_logo.jpg'}
                  alt={profile?.tradeName || 'Organization Logo'}
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {profile?.tradeName || profile?.legalName || 'Nexora Technologies'}
                  </h2>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400">
                    Organization Logo
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  AI-driven Enterprise Brand & Legal Entity Credentials
                </p>
              </div>
            </div>
            <span className="self-start sm:self-auto inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
              Active Entity
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6">
            <div>
              <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 mb-1">
                Legal Name <span className="text-rose-500">*</span>
              </label>
              {isEditing ? (
                <Input
                  value={formData.legalName || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, legalName: e.target.value });
                    if (formErrors.legalName) setFormErrors((prev) => ({ ...prev, legalName: '' }));
                  }}
                  placeholder="e.g. PeopleOS Technologies Inc."
                  error={formErrors.legalName}
                  required
                />
              ) : (
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {profile?.legalName || '—'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 mb-1">
                Trade Name / DBA
              </label>
              {isEditing ? (
                <Input
                  value={formData.tradeName || ''}
                  onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                  placeholder="e.g. PeopleOS, PeopleOS Global"
                />
              ) : (
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {profile?.tradeName || '—'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 mb-1">
                Registration Code / CIN
              </label>
              {isEditing ? (
                <Input
                  value={formData.registrationCode || ''}
                  onChange={(e) => setFormData({ ...formData, registrationCode: e.target.value })}
                  placeholder="e.g. U72200KA2023PTC123456"
                />
              ) : (
                <p className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
                  {profile?.registrationCode || '—'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 mb-1">
                Corporate Tax ID / EIN / GSTIN
              </label>
              {isEditing ? (
                <Input
                  value={formData.taxId || ''}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                  placeholder="e.g. 29AAAAA0000A1Z5 / 12-3456789"
                />
              ) : (
                <p className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
                  {profile?.taxId || '—'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Contact Information */}
        <div className="rounded-md border border-slate-200 bg-white p-5 dark:bg-slate-950 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-4">
            <Mail className="h-4 w-4 text-[#524b6e] dark:text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Contact Information
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6">
            <div>
              <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 mb-1">
                Corporate Email <span className="text-rose-500">*</span>
              </label>
              {isEditing ? (
                <Input
                  type="email"
                  value={formData.corporateEmail || ''}
                  onChange={(e) => {
                    setFormData({ ...formData, corporateEmail: e.target.value });
                    if (formErrors.corporateEmail) setFormErrors((prev) => ({ ...prev, corporateEmail: '' }));
                  }}
                  placeholder="e.g. corporate@company.com"
                  error={formErrors.corporateEmail}
                  required
                />
              ) : (
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {profile?.corporateEmail || '—'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 mb-1">
                Phone
              </label>
              {isEditing ? (
                <Input
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. +1 (555) 234-5678"
                />
              ) : (
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {profile?.phone || '—'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 mb-1">
                Website
              </label>
              {isEditing ? (
                <Input
                  value={formData.website || ''}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="e.g. https://www.company.com"
                />
              ) : (
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {profile?.website ? (
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#524b6e] hover:underline dark:text-indigo-400 font-medium"
                    >
                      {profile.website}
                    </a>
                  ) : (
                    '—'
                  )}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Base Operating Settings */}
        <div className="rounded-md border border-slate-200 bg-white p-5 dark:bg-slate-950 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-[#524b6e] dark:text-indigo-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Base Operating Settings
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6">
            <div>
              {isEditing ? (
                <SelectField
                  label="Canonical Timezone"
                  required
                  value={formData.timezone || 'Asia/Kolkata'}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  options={COMMON_TIMEZONES.map((tz) => ({
                    value: tz,
                    label: tz,
                  }))}
                />
              ) : (
                <>
                  <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 mb-1">
                    Canonical Timezone
                  </label>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {profile?.timezone || '—'}
                  </p>
                </>
              )}
            </div>

            <div>
              {isEditing ? (
                <SelectField
                  label="Reporting Currency"
                  required
                  value={formData.currency || 'USD'}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  options={CURRENCIES.map((c) => ({
                    value: c.code,
                    label: `${c.label} (${c.symbol})`,
                  }))}
                />
              ) : (
                <>
                  <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 mb-1">
                    Reporting Currency
                  </label>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {profile?.currency || '—'}
                  </p>
                </>
              )}
            </div>

            <div>
              {isEditing ? (
                <SelectField
                  label="Fiscal Year Start Month"
                  required
                  value={formData.fiscalYearStartMonth || 'January'}
                  onChange={(e) =>
                    setFormData({ ...formData, fiscalYearStartMonth: e.target.value })
                  }
                  options={MONTHS.map((m) => ({
                    value: m,
                    label: m,
                  }))}
                />
              ) : (
                <>
                  <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 mb-1">
                    Fiscal Year Start Month
                  </label>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {profile?.fiscalYearStartMonth || '—'}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        {isEditing && (
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormData(profile || {});
                setIsEditing(false);
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving}>
              Save Changes
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
