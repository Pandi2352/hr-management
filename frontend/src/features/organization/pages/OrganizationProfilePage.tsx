import { useState, useEffect, useRef } from 'react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { SelectField } from '../../../components/ui/SelectField';
import { useToast } from '../../../components/ui/toast';
import { organizationApi } from '../api/organization.api';
import type { OrganizationProfile } from '../types/organization.types';
import { PageHeader } from '../../../components/common/PageHeader';
import {
  Building2,
  Mail,
  Clock,
  MapPin,
  Upload,
  Trash2,
  CheckCircle2,
  Copy,
  ExternalLink,
  Edit2,
  Sparkles,
  ShieldCheck,
  Briefcase,
} from 'lucide-react';

const COMMON_TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST · UTC+05:30)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT · UTC-05:00)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT · UTC-08:00)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST/CDT · UTC-06:00)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST · UTC+00:00)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET/CEST · UTC+01:00)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET/CEST · UTC+01:00)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT · UTC+08:00)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST · UTC+04:00)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST · UTC+09:00)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT · UTC+10:00)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time · UTC+00:00)' },
];

const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD - US Dollar ($)', sample: '$125,000.00' },
  { code: 'EUR', symbol: '€', label: 'EUR - Euro (€)', sample: '€115,000.00' },
  { code: 'GBP', symbol: '£', label: 'GBP - British Pound (£)', sample: '£98,000.00' },
  { code: 'INR', symbol: '₹', label: 'INR - Indian Rupee (₹)', sample: '₹12,50,000.00' },
  { code: 'SGD', symbol: 'S$', label: 'SGD - Singapore Dollar (S$)', sample: 'S$165,000.00' },
  { code: 'AUD', symbol: 'A$', label: 'AUD - Australian Dollar (A$)', sample: 'A$175,000.00' },
  { code: 'CAD', symbol: 'C$', label: 'CAD - Canadian Dollar (C$)', sample: 'C$160,000.00' },
  { code: 'AED', symbol: 'د.إ', label: 'AED - UAE Dirham (د.إ)', sample: 'د.إ 450,000.00' },
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

const ORGANIZATION_TYPES = [
  'Private Limited Company (Pvt Ltd)',
  'Public Limited Company (Ltd)',
  'Limited Liability Company (LLC)',
  'Corporation (C-Corp / S-Corp)',
  'Partnership Firm',
  'Sole Proprietorship',
  'Non-Profit / NGO (501(c)(3))',
  'Government / Public Entity',
];

const COUNTRIES = [
  'United States',
  'India',
  'United Kingdom',
  'Singapore',
  'United Arab Emirates',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'Netherlands',
  'Japan',
  'Ireland',
];

const DAYS_OF_WEEK = [
  { key: 'Monday', short: 'Mon' },
  { key: 'Tuesday', short: 'Tue' },
  { key: 'Wednesday', short: 'Wed' },
  { key: 'Thursday', short: 'Thu' },
  { key: 'Friday', short: 'Fri' },
  { key: 'Saturday', short: 'Sat' },
  { key: 'Sunday', short: 'Sun' },
];

export function OrganizationProfilePage() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [profile, setProfile] = useState<OrganizationProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<OrganizationProfile>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<string>('all');

  // Logo upload preview state
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [logoDimensions, setLogoDimensions] = useState<{ width: number; height: number } | null>(null);
  const [logoFileSize, setLogoFileSize] = useState<string>('');
  const [isCopiedAddress, setIsCopiedAddress] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const data = await organizationApi.getProfile();
      setProfile(data);
      setFormData(data);
      const activeLogo = data.logoUrl || '/branding/nexora_ai_logo.jpg';
      const activeName = data.tradeName || data.legalName || 'Nexora Technologies';
      setLogoPreview(activeLogo);
      localStorage.setItem('organization_logo', activeLogo);
      localStorage.setItem('organization_name', activeName);
      window.dispatchEvent(new CustomEvent('organization_profile_updated', {
        detail: { logoUrl: activeLogo, name: activeName }
      }));
    } catch (err: any) {
      toast.error(err.message || 'Failed to load organization profile');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Logo file selection & validation
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. File type validation
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload PNG, JPG, WebP, or SVG.');
      return;
    }

    // 2. File size validation (Max 2MB)
    const maxBytes = 2 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(`File size exceeds 2MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).`);
      return;
    }

    const sizeKb = Math.round(file.size / 1024);
    setLogoFileSize(`${sizeKb} KB`);

    // 3. Read & parse dimensions
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        setLogoDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        setLogoPreview(result);
        setFormData((prev) => ({ ...prev, logoUrl: result }));
        localStorage.setItem('organization_logo', result);
        window.dispatchEvent(new CustomEvent('organization_profile_updated', {
          detail: { logoUrl: result }
        }));
        toast.success(`Logo loaded: ${img.naturalWidth}×${img.naturalHeight}px (${sizeKb} KB)`);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    const defaultLogo = '/branding/nexora_ai_logo.jpg';
    setLogoPreview(defaultLogo);
    setFormData((prev) => ({ ...prev, logoUrl: '' }));
    setLogoDimensions(null);
    setLogoFileSize('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    localStorage.setItem('organization_logo', defaultLogo);
    window.dispatchEvent(new CustomEvent('organization_profile_updated', {
      detail: { logoUrl: defaultLogo }
    }));
    toast.info('Logo reset to default brand insignia.');
  };

  // Toggle Working Days
  const handleToggleWorkingDay = (day: string) => {
    const current = formData.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    let updated: string[];
    if (current.includes(day)) {
      if (current.length === 1) {
        toast.warning('At least one working day must be active.');
        return;
      }
      updated = current.filter((d) => d !== day);
    } else {
      updated = [...current, day];
    }
    setFormData({ ...formData, workingDays: updated });
  };

  // Form Submission
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formData.legalName?.trim()) {
      errors.legalName = 'Legal Name is required';
    } else if (formData.legalName.trim().length < 2) {
      errors.legalName = 'Legal Name must be at least 2 characters';
    }

    if (!formData.corporateEmail?.trim()) {
      errors.corporateEmail = 'Corporate Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.corporateEmail.trim())) {
      errors.corporateEmail = 'Please enter a valid email address';
    }

    if (formData.supportEmail?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.supportEmail.trim())) {
      errors.supportEmail = 'Please enter a valid support email address';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('Please resolve the highlighted validation errors.');
      return;
    }

    setFormErrors({});
    try {
      setIsSaving(true);
      const { _id, __v, status, createdAt, updatedAt, isDeleted, ...payload } = formData as any;
      const updated = await organizationApi.updateProfile(payload);
      setProfile(updated);
      setFormData(updated);
      setIsEditing(false);
      const activeLogo = updated.logoUrl || '/branding/nexora_ai_logo.jpg';
      const activeName = updated.tradeName || updated.legalName || 'Nexora Technologies';
      localStorage.setItem('organization_logo', activeLogo);
      localStorage.setItem('organization_name', activeName);
      window.dispatchEvent(new CustomEvent('organization_profile_updated', {
        detail: { logoUrl: activeLogo, name: activeName }
      }));
      toast.success('Organization profile updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update organization profile');
    } finally {
      setIsSaving(false);
    }
  };

  // Format full physical address string
  const formattedAddress = [
    formData.addressLine1 || profile?.addressLine1,
    formData.addressLine2 || profile?.addressLine2,
    formData.city || profile?.city,
    formData.state || profile?.state,
    formData.postalCode || profile?.postalCode,
    formData.country || profile?.country || 'United States',
  ]
    .filter(Boolean)
    .join(', ');

  const handleCopyAddress = () => {
    if (!formattedAddress) return;
    navigator.clipboard.writeText(formattedAddress);
    setIsCopiedAddress(true);
    toast.success('Formatted address copied to clipboard');
    setTimeout(() => setIsCopiedAddress(false), 2500);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 w-full animate-pulse">
        <div className="h-9 w-72 bg-slate-200 dark:bg-slate-800 rounded-md" />
        <div className="h-32 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md" />
          <div className="h-64 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md" />
        </div>
      </div>
    );
  }

  const workingDays = formData.workingDays || profile?.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const currencyObj = CURRENCIES.find((c) => c.code === (formData.currency || profile?.currency)) || CURRENCIES[0];

  return (
    <div className="space-y-6 w-full pb-12">
      {/* Header Bar */}
      <PageHeader
        title={
          <div className="flex items-center gap-2.5">
            <span className="font-heading">Organization Profile</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active Legal Entity
            </span>
          </div>
        }
        description="Global configuration for enterprise identity, statutory registrations, branding insignia, regional localization, and operational shifts."
        actions={
          !isEditing ? (
            <Button
              size="sm"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5"
            >
              <Edit2 className="h-3.5 w-3.5" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setFormData(profile || {});
                  setLogoPreview(profile?.logoUrl || '/branding/nexora_ai_logo.jpg');
                  setFormErrors({});
                  setIsEditing(false);
                }}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                isLoading={isSaving}
                className="flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Save Changes
              </Button>
            </div>
          )
        }
      />

      {/* Quick Filter Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100 dark:border-slate-800/60">
        {[
          { id: 'all', label: 'All Sections' },
          { id: 'branding', label: 'Branding & Logo' },
          { id: 'identity', label: 'Legal Identity' },
          { id: 'contacts', label: 'Corporate Contacts' },
          { id: 'address', label: 'Headquarters Address' },
          { id: 'regional', label: 'Regional & Financial' },
          { id: 'workplace', label: 'Workplace & Shifts' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[var(--primary)] text-white'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* ========================================================================= */}
        {/* 1. BRANDING & LOGO STUDIO */}
        {/* ========================================================================= */}
        {(activeTab === 'all' || activeTab === 'branding') && (
          <div className="rounded-md border border-slate-200 bg-white p-5 dark:bg-slate-950 dark:border-slate-800">
            <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#524b6e] dark:text-violet-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Organization Branding & Insignia
                </h2>
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                Propagates to Sidebar, Login, Offer Letters & Careers Portal
              </span>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Logo Preview Frame */}
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div className="h-28 w-28 rounded-md overflow-hidden border border-slate-300 dark:border-slate-700 bg-slate-900 flex items-center justify-center relative group">
                  <img
                    src={logoPreview || '/branding/nexora_ai_logo.jpg'}
                    alt="Organization Logo"
                    className="h-full w-full object-cover"
                  />
                  {isEditing && (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white cursor-pointer transition-opacity"
                    >
                      <Upload className="h-5 w-5 mb-1 text-violet-300" />
                      <span className="text-[10px] font-semibold">Change Logo</span>
                    </div>
                  )}
                </div>

                {logoDimensions && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    {logoDimensions.width} × {logoDimensions.height} px
                  </span>
                )}
                {logoFileSize && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                    {logoFileSize}
                  </span>
                )}
              </div>

              {/* Logo Controls */}
              <div className="flex-1 space-y-3.5">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Official Corporate Insignia
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                    Upload your official company emblem. Recommended dimensions: <strong>512 × 512 px</strong>. Supported formats: <strong>PNG, SVG, WebP, JPG</strong>. Max file size: <strong>2 MB</strong>.
                  </p>
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/webp, image/svg+xml"
                      onChange={handleLogoFileChange}
                      className="hidden"
                    />

                    <div className="flex flex-wrap items-center gap-2.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 rounded-md border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                      >
                        <Upload className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                        {formData.logoUrl ? 'Replace Logo' : 'Upload Logo'}
                      </Button>

                      {formData.logoUrl && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleRemoveLogo}
                          className="flex items-center gap-1.5 rounded-md border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove Logo
                        </Button>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1">
                        Or enter direct asset URL
                      </label>
                      <Input
                        value={formData.logoUrl || ''}
                        onChange={(e) => {
                          setFormData({ ...formData, logoUrl: e.target.value });
                          setLogoPreview(e.target.value || '/branding/nexora_ai_logo.jpg');
                        }}
                        placeholder="https://cdn.yourcompany.com/assets/logo.png"
                        className="font-mono text-xs rounded-md"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                      Logo synced across navigation rails & headers
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. LEGAL IDENTITY & REGISTRATION */}
        {/* ========================================================================= */}
        {(activeTab === 'all' || activeTab === 'identity') && (
          <div className="rounded-md border border-slate-200 bg-white p-5 dark:bg-slate-950 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <Building2 className="h-4 w-4 text-[#524b6e] dark:text-violet-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Corporate Entity & Legal Identity
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6">
              <div>
                <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 mb-1">
                  Legal Company Name <span className="text-rose-500">*</span>
                </label>
                {isEditing ? (
                  <Input
                    value={formData.legalName || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, legalName: e.target.value });
                      if (formErrors.legalName) setFormErrors((prev) => ({ ...prev, legalName: '' }));
                    }}
                    placeholder="e.g. Nexora Technologies Inc."
                    error={formErrors.legalName}
                    required
                    className="rounded-md"
                  />
                ) : (
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 font-heading">
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
                    placeholder="e.g. Nexora AI, Nexora Global"
                    className="rounded-md"
                  />
                ) : (
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {profile?.tradeName || '—'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 mb-1">
                  Organization Entity Type
                </label>
                {isEditing ? (
                  <SelectField
                    value={formData.organizationType || 'Private Limited Company (Pvt Ltd)'}
                    onChange={(e) => setFormData({ ...formData, organizationType: e.target.value })}
                    options={ORGANIZATION_TYPES.map((type) => ({ value: type, label: type }))}
                    className="rounded-md"
                  />
                ) : (
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {profile?.organizationType || 'Private Limited Company (Pvt Ltd)'}
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
                    placeholder="e.g. U72200KA2023PTC123456 / REG-HQ01"
                    className="rounded-md font-mono text-xs"
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
                    className="rounded-md font-mono text-xs"
                  />
                ) : (
                  <p className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
                    {profile?.taxId || '—'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 mb-1">
                  Country of Registration
                </label>
                {isEditing ? (
                  <SelectField
                    value={formData.registrationCountry || 'United States'}
                    onChange={(e) => setFormData({ ...formData, registrationCountry: e.target.value })}
                    options={COUNTRIES.map((c) => ({ value: c, label: c }))}
                    className="rounded-md"
                  />
                ) : (
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {profile?.registrationCountry || 'United States'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 mb-1">
                  Incorporation / Registration Date
                </label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={formData.registrationDate || ''}
                    onChange={(e) => setFormData({ ...formData, registrationDate: e.target.value })}
                    className="rounded-md text-xs font-mono"
                  />
                ) : (
                  <p className="text-xs font-mono text-slate-700 dark:text-slate-300">
                    {profile?.registrationDate || '—'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 mb-1">
                  Employee ID Prefix
                </label>
                {isEditing ? (
                  <div>
                    <Input
                      value={formData.employeeIdPrefix || ''}
                      onChange={(e) => setFormData({ ...formData, employeeIdPrefix: e.target.value.toUpperCase() })}
                      placeholder="e.g. EMP, NEX, ACME"
                      maxLength={10}
                      className="rounded-md font-mono text-xs uppercase"
                    />
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                      Prefix used for generating sequential Employee IDs (e.g. {(formData.employeeIdPrefix || 'EMP').trim() || 'EMP'}-00001)
                    </p>
                  </div>
                ) : (
                  <div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-mono font-bold bg-[var(--primary-light)] text-[var(--primary)] border border-[var(--primary)]/20">
                      {profile?.employeeIdPrefix || 'EMP'}
                    </span>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                      Sample Employee ID: {(profile?.employeeIdPrefix || 'EMP')}-00001
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. CORPORATE CONTACTS & CHANNELS */}
        {/* ========================================================================= */}
        {(activeTab === 'all' || activeTab === 'contacts') && (
          <div className="rounded-md border border-slate-200 bg-white p-5 dark:bg-slate-950 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <Mail className="h-4 w-4 text-[#524b6e] dark:text-violet-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Corporate Contacts & Communication Channels
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6">
              <div>
                <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 mb-1">
                  Official Corporate Email <span className="text-rose-500">*</span>
                </label>
                {isEditing ? (
                  <Input
                    type="email"
                    value={formData.corporateEmail || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, corporateEmail: e.target.value });
                      if (formErrors.corporateEmail) setFormErrors((prev) => ({ ...prev, corporateEmail: '' }));
                    }}
                    placeholder="corporate@nexoratech.com"
                    error={formErrors.corporateEmail}
                    required
                    className="rounded-md"
                  />
                ) : (
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {profile?.corporateEmail || '—'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 mb-1">
                  Corporate Phone
                </label>
                {isEditing ? (
                  <Input
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 234-5678"
                    className="rounded-md"
                  />
                ) : (
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {profile?.phone || '—'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 mb-1">
                  Official Website
                </label>
                {isEditing ? (
                  <Input
                    value={formData.website || ''}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="https://nexoratech.com"
                    className="rounded-md"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {profile?.website || '—'}
                    </p>
                    {profile?.website && (
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-600 hover:text-violet-700 dark:text-violet-400"
                        title="Open external website"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 mb-1">
                  Primary Contact Person
                </label>
                {isEditing ? (
                  <Input
                    value={formData.primaryContactPerson || ''}
                    onChange={(e) => setFormData({ ...formData, primaryContactPerson: e.target.value })}
                    placeholder="e.g. Jane Doe (Head of People Ops)"
                    className="rounded-md"
                  />
                ) : (
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {profile?.primaryContactPerson || '—'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 mb-1">
                  Support & Helpdesk Email
                </label>
                {isEditing ? (
                  <Input
                    type="email"
                    value={formData.supportEmail || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, supportEmail: e.target.value });
                      if (formErrors.supportEmail) setFormErrors((prev) => ({ ...prev, supportEmail: '' }));
                    }}
                    placeholder="support@nexoratech.com"
                    error={formErrors.supportEmail}
                    className="rounded-md"
                  />
                ) : (
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {profile?.supportEmail || '—'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 mb-1">
                  Support Phone / Hotline
                </label>
                {isEditing ? (
                  <Input
                    value={formData.supportPhone || ''}
                    onChange={(e) => setFormData({ ...formData, supportPhone: e.target.value })}
                    placeholder="+1 (800) 123-4567"
                    className="rounded-md"
                  />
                ) : (
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {profile?.supportPhone || '—'}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. HEADQUARTERS & PHYSICAL ADDRESS */}
        {/* ========================================================================= */}
        {(activeTab === 'all' || activeTab === 'address') && (
          <div className="rounded-md border border-slate-200 bg-white p-5 dark:bg-slate-950 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <MapPin className="h-4 w-4 text-[#524b6e] dark:text-violet-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Headquarters & Registered Address
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Input Columns */}
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-5">
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 mb-1">
                    Address Line 1 (Street / Building)
                  </label>
                  {isEditing ? (
                    <Input
                      value={formData.addressLine1 || ''}
                      onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                      placeholder="e.g. 500 Quantum Horizon Blvd, Suite 400"
                      className="rounded-md"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {profile?.addressLine1 || '—'}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 mb-1">
                    Address Line 2 (Floor / Landmark / Unit)
                  </label>
                  {isEditing ? (
                    <Input
                      value={formData.addressLine2 || ''}
                      onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                      placeholder="e.g. Tech Park Phase II, Tower Alpha"
                      className="rounded-md"
                    />
                  ) : (
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {profile?.addressLine2 || '—'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 mb-1">
                    City
                  </label>
                  {isEditing ? (
                    <Input
                      value={formData.city || ''}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="e.g. San Francisco"
                      className="rounded-md"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {profile?.city || '—'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 mb-1">
                    State / Province
                  </label>
                  {isEditing ? (
                    <Input
                      value={formData.state || ''}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="e.g. California"
                      className="rounded-md"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {profile?.state || '—'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 mb-1">
                    Country
                  </label>
                  {isEditing ? (
                    <SelectField
                      value={formData.country || 'United States'}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      options={COUNTRIES.map((c) => ({ value: c, label: c }))}
                      className="rounded-md"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {profile?.country || 'United States'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 mb-1">
                    Postal / ZIP Code
                  </label>
                  {isEditing ? (
                    <Input
                      value={formData.postalCode || ''}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      placeholder="e.g. 94105"
                      className="rounded-md font-mono text-xs"
                    />
                  ) : (
                    <p className="text-xs font-mono text-slate-700 dark:text-slate-300">
                      {profile?.postalCode || '—'}
                    </p>
                  )}
                </div>
              </div>

              {/* Formatted Address Preview Card */}
              <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Official Postal Format
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyAddress}
                      className="flex items-center gap-1 text-[11px] text-violet-600 dark:text-violet-400 hover:underline font-medium"
                    >
                      {isCopiedAddress ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>

                  <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1 font-mono leading-relaxed bg-white dark:bg-slate-950 p-3 rounded-md border border-slate-200 dark:border-slate-800">
                    <p className="font-semibold text-slate-900 dark:text-slate-100 font-sans">
                      {formData.legalName || profile?.legalName || 'Nexora Technologies Inc.'}
                    </p>
                    <p>{formData.addressLine1 || profile?.addressLine1 || '500 Quantum Horizon Blvd, Suite 400'}</p>
                    {(formData.addressLine2 || profile?.addressLine2) && (
                      <p>{formData.addressLine2 || profile?.addressLine2}</p>
                    )}
                    <p>
                      {[formData.city || profile?.city || 'San Francisco', formData.state || profile?.state || 'CA', formData.postalCode || profile?.postalCode || '94105']
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">{formData.country || profile?.country || 'United States'}</p>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-3">
                  This address prints on payslips, employment verification letters, and tax forms.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. REGIONAL & FINANCIAL CONFIGURATION */}
        {/* ========================================================================= */}
        {(activeTab === 'all' || activeTab === 'regional') && (
          <div className="rounded-md border border-slate-200 bg-white p-5 dark:bg-slate-950 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <Clock className="h-4 w-4 text-[#524b6e] dark:text-violet-400" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Regional Standards & Financial Cycles
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6">
              <div>
                <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 mb-1">
                  Canonical Timezone <span className="text-rose-500">*</span>
                </label>
                {isEditing ? (
                  <SelectField
                    value={formData.timezone || 'Asia/Kolkata'}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    options={COMMON_TIMEZONES.map((tz) => ({
                      value: tz.value,
                      label: tz.label,
                    }))}
                    className="rounded-md"
                  />
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {profile?.timezone || 'Asia/Kolkata'}
                    </p>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {COMMON_TIMEZONES.find((t) => t.value === profile?.timezone)?.label || profile?.timezone}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 mb-1">
                  Base Reporting Currency <span className="text-rose-500">*</span>
                </label>
                {isEditing ? (
                  <SelectField
                    value={formData.currency || 'USD'}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    options={CURRENCIES.map((c) => ({
                      value: c.code,
                      label: c.label,
                    }))}
                    className="rounded-md"
                  />
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {currencyObj.label}
                      </p>
                      <span className="px-1.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300">
                        {currencyObj.symbol}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      Sample: {currencyObj.sample}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 mb-1">
                  Fiscal Year Start Month <span className="text-rose-500">*</span>
                </label>
                {isEditing ? (
                  <SelectField
                    value={formData.fiscalYearStartMonth || 'January'}
                    onChange={(e) => setFormData({ ...formData, fiscalYearStartMonth: e.target.value })}
                    options={MONTHS.map((m) => ({
                      value: m,
                      label: m,
                    }))}
                    className="rounded-md"
                  />
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {profile?.fiscalYearStartMonth || 'January'}
                    </p>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Annual cycle: {profile?.fiscalYearStartMonth || 'January'} 1 – End of preceding month
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. WORKPLACE OPERATIONS & SHIFT POLICIES */}
        {/* ========================================================================= */}
        {(activeTab === 'all' || activeTab === 'workplace') && (
          <div className="rounded-md border border-slate-200 bg-white p-5 dark:bg-slate-950 dark:border-slate-800">
            <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-[#524b6e] dark:text-violet-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Workplace Schedule & System Formats
                </h2>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                {workingDays.length} Working Days / Week
              </span>
            </div>

            <div className="space-y-5">
              {/* Working Days Selector */}
              <div>
                <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 mb-2">
                  Official Workweek Schedule
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {DAYS_OF_WEEK.map((day) => {
                    const isSelected = workingDays.includes(day.key);
                    return (
                      <button
                        key={day.key}
                        type="button"
                        disabled={!isEditing}
                        onClick={() => handleToggleWorkingDay(day.key)}
                        className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border border-transparent'
                            : 'bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-600 border border-slate-200 dark:border-slate-800'
                        } ${isEditing ? 'cursor-pointer hover:border-violet-500' : 'cursor-default opacity-90'}`}
                      >
                        {day.short}
                        {isSelected && <span className="ml-1 text-[10px]">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Working Hours & Shift Timing */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6 pt-2">
                <div>
                  <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 mb-1">
                    Daily Working Hours
                  </label>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.5"
                      min="1"
                      max="24"
                      value={formData.standardWorkingHours ?? 8}
                      onChange={(e) =>
                        setFormData({ ...formData, standardWorkingHours: parseFloat(e.target.value) || 8 })
                      }
                      className="rounded-md"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {profile?.standardWorkingHours ?? 8} Hours / Day
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 mb-1">
                    Standard Shift Start Time
                  </label>
                  {isEditing ? (
                    <Input
                      type="time"
                      value={formData.workStartTime || '09:00'}
                      onChange={(e) => setFormData({ ...formData, workStartTime: e.target.value })}
                      className="rounded-md font-mono text-xs"
                    />
                  ) : (
                    <p className="text-xs font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {profile?.workStartTime || '09:00'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 mb-1">
                    Standard Shift End Time
                  </label>
                  {isEditing ? (
                    <Input
                      type="time"
                      value={formData.workEndTime || '18:00'}
                      onChange={(e) => setFormData({ ...formData, workEndTime: e.target.value })}
                      className="rounded-md font-mono text-xs"
                    />
                  ) : (
                    <p className="text-xs font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {profile?.workEndTime || '18:00'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 mb-1">
                    System Date Format
                  </label>
                  {isEditing ? (
                    <SelectField
                      value={formData.dateFormat || 'DD/MM/YYYY'}
                      onChange={(e) => setFormData({ ...formData, dateFormat: e.target.value })}
                      options={[
                        { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (e.g. 08/09/2026)' },
                        { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (e.g. 09/08/2026)' },
                        { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (e.g. 2026-09-08)' },
                      ]}
                      className="rounded-md"
                    />
                  ) : (
                    <p className="text-xs font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {profile?.dateFormat || 'DD/MM/YYYY'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 mb-1">
                    System Time Format
                  </label>
                  {isEditing ? (
                    <SelectField
                      value={formData.timeFormat || '12 Hour'}
                      onChange={(e) => setFormData({ ...formData, timeFormat: e.target.value })}
                      options={[
                        { value: '12 Hour', label: '12 Hour (e.g. 09:00 AM)' },
                        { value: '24 Hour', label: '24 Hour (e.g. 09:00)' },
                      ]}
                      className="rounded-md"
                    />
                  ) : (
                    <p className="text-xs font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {profile?.timeFormat || '12 Hour'}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 mb-1">
                    Number Format
                  </label>
                  {isEditing ? (
                    <SelectField
                      value={formData.numberFormat || '1,234,567.89'}
                      onChange={(e) => setFormData({ ...formData, numberFormat: e.target.value })}
                      options={[
                        { value: '1,234,567.89', label: 'Western (1,234,567.89)' },
                        { value: '12,34,567.89', label: 'South Asian (12,34,567.89)' },
                      ]}
                      className="rounded-md"
                    />
                  ) : (
                    <p className="text-xs font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {profile?.numberFormat || '1,234,567.89'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sticky Bottom Actions when Editing */}
        {isEditing && (
          <div className="sticky bottom-4 z-10 flex items-center justify-between gap-4 p-4 rounded-md border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              Unsaved changes pending for organization profile
            </div>
            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setFormData(profile || {});
                  setLogoPreview(profile?.logoUrl || '/branding/nexora_ai_logo.jpg');
                  setFormErrors({});
                  setIsEditing(false);
                }}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={isSaving}
                className="flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Save Changes
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
