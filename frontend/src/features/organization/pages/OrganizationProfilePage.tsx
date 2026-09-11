import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../../components/common/PageHeader';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/toast';
import { organizationApi } from '../api/organization.api';
import type { OrganizationProfile } from '../types/organization.types';
import { OrgBrandAssetsCard } from '../components/profile/OrgBrandAssetsCard';
import { OrgGeneralInfoCard } from '../components/profile/OrgGeneralInfoCard';
import { OrgContactLocationCard } from '../components/profile/OrgContactLocationCard';
import { OrgLocalizationCard } from '../components/profile/OrgLocalizationCard';
import { Edit2, CheckCircle2 } from 'lucide-react';

export function OrganizationProfilePage() {
  const toast = useToast();

  const [profile, setProfile] = useState<OrganizationProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<OrganizationProfile>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<string>('all');

  const [logoPreview, setLogoPreview] = useState<string>('');
  const [logoDimensions, setLogoDimensions] = useState<{ width: number; height: number } | null>(null);
  const [logoFileSize, setLogoFileSize] = useState<string>('');

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
      window.dispatchEvent(
        new CustomEvent('organization_profile_updated', {
          detail: { logoUrl: activeLogo, name: activeName },
        }),
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to load organization profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.type)) {
      toast.error('Only PNG, JPG, WebP, and SVG images are permitted');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Emblem file size exceeds 2 MB limit');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLogoPreview(dataUrl);
      setFormData((prev) => ({ ...prev, logoUrl: dataUrl }));

      const img = new Image();
      img.onload = () => {
        setLogoDimensions({ width: img.width, height: img.height });
      };
      img.src = dataUrl;
      setLogoFileSize(`${(file.size / 1024).toFixed(1)} KB`);
      toast.success('Corporate insignia loaded for preview');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview('/branding/nexora_ai_logo.jpg');
    setFormData((prev) => ({ ...prev, logoUrl: '' }));
    setLogoDimensions(null);
    setLogoFileSize('');
    toast.info('Emblem cleared. Save changes to commit');
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.legalName?.trim()) {
      errors.legalName = 'Legal company name is strictly required';
    }
    if (!formData.corporateEmail?.trim()) {
      errors.corporateEmail = 'Official corporate email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.corporateEmail)) {
      errors.corporateEmail = 'Enter a valid corporate email address';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!validate()) {
      toast.error('Please resolve configuration validation errors before saving');
      return;
    }

    try {
      setIsSaving(true);
      const updated = await organizationApi.updateProfile(formData);
      setProfile(updated);
      setFormData(updated);
      setIsEditing(false);
      const activeLogo = updated.logoUrl || '/branding/nexora_ai_logo.jpg';
      const activeName = updated.tradeName || updated.legalName || 'Nexora Technologies';
      localStorage.setItem('organization_logo', activeLogo);
      localStorage.setItem('organization_name', activeName);
      window.dispatchEvent(
        new CustomEvent('organization_profile_updated', {
          detail: { logoUrl: activeLogo, name: activeName },
        }),
      );
      toast.success('Organization profile updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update organization profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 w-full animate-pulse">
        <div className="h-9 w-72 bg-surface-hover rounded-md" />
        <div className="h-32 bg-surface border border-hairline rounded-md" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-surface border border-hairline rounded-md" />
          <div className="h-64 bg-surface border border-hairline rounded-md" />
        </div>
      </div>
    );
  }

  const navTabs = [
    { id: 'all', label: 'All Sections' },
    { id: 'branding', label: 'Branding & Logo' },
    { id: 'identity', label: 'Legal Identity' },
    { id: 'contacts', label: 'Corporate Contacts' },
    { id: 'address', label: 'Headquarters Address' },
    { id: 'regional', label: 'Regional & Financial' },
  ];

  return (
    <div className="space-y-6 w-full pb-12">
      <PageHeader
        title={
          <div className="flex items-center gap-2.5">
            <span>Organization Profile</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
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
              className="flex items-center gap-1.5 rounded-md"
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
                className="rounded-md"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                isLoading={isSaving}
                className="flex items-center gap-1.5 rounded-md"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Save Changes
              </Button>
            </div>
          )
        }
      />

      {/* Section Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-hairline">
        {navTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {(activeTab === 'all' || activeTab === 'branding') && (
          <OrgBrandAssetsCard
            formData={formData}
            isEditing={isEditing}
            logoPreview={logoPreview}
            logoDimensions={logoDimensions}
            logoFileSize={logoFileSize}
            onLogoFileChange={handleLogoFileChange}
            onRemoveLogo={handleRemoveLogo}
          />
        )}

        {(activeTab === 'all' || activeTab === 'identity') && (
          <OrgGeneralInfoCard
            profile={profile}
            formData={formData}
            isEditing={isEditing}
            formErrors={formErrors}
            setFormData={setFormData}
            setFormErrors={setFormErrors}
          />
        )}

        {(activeTab === 'all' || activeTab === 'contacts' || activeTab === 'address') && (
          <OrgContactLocationCard
            profile={profile}
            formData={formData}
            isEditing={isEditing}
            formErrors={formErrors}
            setFormData={setFormData}
            setFormErrors={setFormErrors}
          />
        )}

        {(activeTab === 'all' || activeTab === 'regional') && (
          <OrgLocalizationCard
            profile={profile}
            formData={formData}
            isEditing={isEditing}
            setFormData={setFormData}
          />
        )}

        {/* Sticky Action Footer when Editing */}
        {isEditing && (
          <div className="sticky bottom-4 z-10 flex items-center justify-between gap-4 p-4 rounded-md border border-hairline bg-surface/95 backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
                className="rounded-md"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                isLoading={isSaving}
                className="flex items-center gap-1.5 rounded-md"
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
