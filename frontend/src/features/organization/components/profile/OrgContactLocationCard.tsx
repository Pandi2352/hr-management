import React, { useState } from 'react';
import { Mail, MapPin, ExternalLink, Copy, CheckCircle2 } from 'lucide-react';
import { Input } from '../../../../components/ui/Input';
import { SelectField } from '../../../../components/ui/SelectField';
import { Button } from '../../../../components/ui/Button';
import { SectionCard } from '../../../../components/ui/SectionCard';
import { COUNTRIES } from './OrgGeneralInfoCard';
import type { OrganizationProfile } from '../../types/organization.types';

interface OrgContactLocationCardProps {
  profile: OrganizationProfile | null;
  formData: Partial<OrganizationProfile>;
  isEditing: boolean;
  formErrors: Record<string, string>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<OrganizationProfile>>>;
  setFormErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export const OrgContactLocationCard: React.FC<OrgContactLocationCardProps> = ({
  profile,
  formData,
  isEditing,
  formErrors,
  setFormData,
  setFormErrors,
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const fullAddress = [
    formData.addressLine1 || profile?.addressLine1,
    formData.addressLine2 || profile?.addressLine2,
    formData.city || profile?.city,
    formData.state || profile?.state,
    formData.postalCode || profile?.postalCode,
    formData.country || profile?.country,
  ]
    .filter(Boolean)
    .join(', ');

  const handleCopyAddress = () => {
    if (!fullAddress) return;
    navigator.clipboard.writeText(fullAddress);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Contact Channels */}
      <SectionCard
        title="Corporate Contacts & Communication Channels"
        description="Official emails, helplines, support desks, and corporate websites"
        icon={Mail}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6">
          <div>
            <label className="block text-[11px] font-medium tracking-wide uppercase text-muted-foreground mb-1">
              Official Corporate Email <span className="text-rose-500">*</span>
            </label>
            {isEditing ? (
              <Input
                type="email"
                value={formData.corporateEmail || ''}
                onChange={(e) => {
                  setFormData((prev) => ({ ...prev, corporateEmail: e.target.value }));
                  if (formErrors.corporateEmail) {
                    setFormErrors((prev) => ({ ...prev, corporateEmail: '' }));
                  }
                }}
                placeholder="corporate@nexoratech.com"
                error={formErrors.corporateEmail}
                required
                className="rounded-md"
              />
            ) : (
              <p className="text-sm font-semibold text-foreground">
                {profile?.corporateEmail || '—'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-medium tracking-wide uppercase text-muted-foreground mb-1">
              Corporate Phone
            </label>
            {isEditing ? (
              <Input
                value={formData.phone || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
                placeholder="+1 (555) 234-5678"
                className="rounded-md"
              />
            ) : (
              <p className="text-sm font-semibold text-foreground">
                {profile?.phone || '—'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-medium tracking-wide uppercase text-muted-foreground mb-1">
              Official Website
            </label>
            {isEditing ? (
              <Input
                value={formData.website || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, website: e.target.value }))
                }
                placeholder="https://nexoratech.com"
                className="rounded-md"
              />
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">
                  {profile?.website || '—'}
                </p>
                {profile?.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                    title="Open external website"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-medium tracking-wide uppercase text-muted-foreground mb-1">
              Primary Contact Person
            </label>
            {isEditing ? (
              <Input
                value={formData.primaryContactPerson || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, primaryContactPerson: e.target.value }))
                }
                placeholder="e.g. Jane Doe (Head of People Ops)"
                className="rounded-md"
              />
            ) : (
              <p className="text-sm font-medium text-foreground">
                {profile?.primaryContactPerson || '—'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-medium tracking-wide uppercase text-muted-foreground mb-1">
              Support & Helpdesk Email
            </label>
            {isEditing ? (
              <Input
                type="email"
                value={formData.supportEmail || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, supportEmail: e.target.value }))
                }
                placeholder="support@nexoratech.com"
                className="rounded-md"
              />
            ) : (
              <p className="text-sm font-medium text-foreground">
                {profile?.supportEmail || '—'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-medium tracking-wide uppercase text-muted-foreground mb-1">
              Support Phone / Hotline
            </label>
            {isEditing ? (
              <Input
                value={formData.supportPhone || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, supportPhone: e.target.value }))
                }
                placeholder="+1 (800) 123-4567"
                className="rounded-md"
              />
            ) : (
              <p className="text-sm font-medium text-foreground">
                {profile?.supportPhone || '—'}
              </p>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Headquarters Address */}
      <SectionCard
        title="Headquarters & Physical Address"
        description="Physical office location, registered domicile, and postal dispatch coordinates"
        icon={MapPin}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-5">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-medium tracking-wide uppercase text-muted-foreground mb-1">
                Address Line 1 (Street / Building)
              </label>
              {isEditing ? (
                <Input
                  value={formData.addressLine1 || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, addressLine1: e.target.value }))
                  }
                  placeholder="e.g. 500 Quantum Horizon Blvd, Suite 400"
                  className="rounded-md"
                />
              ) : (
                <p className="text-sm font-semibold text-foreground">
                  {profile?.addressLine1 || '—'}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] font-medium tracking-wide uppercase text-muted-foreground mb-1">
                Address Line 2 (Apartment / Floor)
              </label>
              {isEditing ? (
                <Input
                  value={formData.addressLine2 || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, addressLine2: e.target.value }))
                  }
                  placeholder="e.g. 4th Floor, Tech Innovation Campus"
                  className="rounded-md"
                />
              ) : (
                <p className="text-sm font-semibold text-foreground">
                  {profile?.addressLine2 || '—'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium tracking-wide uppercase text-muted-foreground mb-1">
                City / Town
              </label>
              {isEditing ? (
                <Input
                  value={formData.city || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, city: e.target.value }))
                  }
                  placeholder="e.g. San Francisco"
                  className="rounded-md"
                />
              ) : (
                <p className="text-sm font-medium text-foreground">
                  {profile?.city || '—'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium tracking-wide uppercase text-muted-foreground mb-1">
                State / Province
              </label>
              {isEditing ? (
                <Input
                  value={formData.state || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, state: e.target.value }))
                  }
                  placeholder="e.g. California"
                  className="rounded-md"
                />
              ) : (
                <p className="text-sm font-medium text-foreground">
                  {profile?.state || '—'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium tracking-wide uppercase text-muted-foreground mb-1">
                Postal / Zip Code
              </label>
              {isEditing ? (
                <Input
                  value={formData.postalCode || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, postalCode: e.target.value }))
                  }
                  placeholder="e.g. 94107"
                  className="rounded-md font-mono text-xs"
                />
              ) : (
                <p className="text-xs font-mono font-medium text-foreground">
                  {profile?.postalCode || '—'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium tracking-wide uppercase text-muted-foreground mb-1">
                Country
              </label>
              {isEditing ? (
                <SelectField
                  value={formData.country || 'United States'}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, country: e.target.value }))
                  }
                  options={COUNTRIES.map((c) => ({ value: c, label: c }))}
                  className="rounded-md"
                />
              ) : (
                <p className="text-sm font-medium text-foreground">
                  {profile?.country || 'United States'}
                </p>
              )}
            </div>
          </div>

          {/* Formatted Preview Box */}
          <div className="rounded-md border border-hairline bg-surface-hover/40 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Dispatch Address
                </span>
                {fullAddress && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={handleCopyAddress}
                    className="h-6 px-2 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
                  >
                    {isCopied ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
              <p className="text-xs text-foreground leading-relaxed font-mono">
                {fullAddress || 'No address specified yet.'}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-hairline text-[10px] text-muted-foreground">
              Used automatically on official payslips, contracts, and letters.
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
};
