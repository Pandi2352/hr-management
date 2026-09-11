import React from 'react';
import { Building2 } from 'lucide-react';
import { Input } from '../../../../components/ui/Input';
import { SelectField } from '../../../../components/ui/SelectField';
import { SectionCard } from '../../../../components/ui/SectionCard';
import type { OrganizationProfile } from '../../types/organization.types';

export const ORGANIZATION_TYPES = [
  'Private Limited Company (Pvt Ltd)',
  'Public Limited Company (Ltd)',
  'Limited Liability Company (LLC)',
  'Corporation (C-Corp / S-Corp)',
  'Partnership Firm',
  'Sole Proprietorship',
  'Non-Profit / NGO (501(c)(3))',
  'Government / Public Entity',
];

export const COUNTRIES = [
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

interface OrgGeneralInfoCardProps {
  profile: OrganizationProfile | null;
  formData: Partial<OrganizationProfile>;
  isEditing: boolean;
  formErrors: Record<string, string>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<OrganizationProfile>>>;
  setFormErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export const OrgGeneralInfoCard: React.FC<OrgGeneralInfoCardProps> = ({
  profile,
  formData,
  isEditing,
  formErrors,
  setFormData,
  setFormErrors,
}) => {
  return (
    <SectionCard
      title="Corporate Entity & Legal Identity"
      description="Official registration, incorporation, and entity taxonomy details"
      icon={Building2}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6">
        <div>
          <label className="block text-[11px] font-medium tracking-wide uppercase text-muted-foreground mb-1">
            Legal Company Name <span className="text-rose-500">*</span>
          </label>
          {isEditing ? (
            <Input
              value={formData.legalName || ''}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, legalName: e.target.value }));
                if (formErrors.legalName) {
                  setFormErrors((prev) => ({ ...prev, legalName: '' }));
                }
              }}
              placeholder="e.g. Nexora Technologies Inc."
              error={formErrors.legalName}
              required
              className="rounded-md"
            />
          ) : (
            <p className="text-sm font-semibold text-foreground">
              {profile?.legalName || '—'}
            </p>
          )}
        </div>

        <div>
          <label className="block text-[11px] font-medium tracking-wide uppercase text-muted-foreground mb-1">
            Trade Name / DBA
          </label>
          {isEditing ? (
            <Input
              value={formData.tradeName || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, tradeName: e.target.value }))
              }
              placeholder="e.g. Nexora AI, Nexora Global"
              className="rounded-md"
            />
          ) : (
            <p className="text-sm font-semibold text-foreground">
              {profile?.tradeName || '—'}
            </p>
          )}
        </div>

        <div>
          <label className="block text-[11px] font-medium tracking-wide uppercase text-muted-foreground mb-1">
            Organization Entity Type
          </label>
          {isEditing ? (
            <SelectField
              value={formData.organizationType || 'Private Limited Company (Pvt Ltd)'}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, organizationType: e.target.value }))
              }
              options={ORGANIZATION_TYPES.map((type) => ({ value: type, label: type }))}
              className="rounded-md"
            />
          ) : (
            <p className="text-sm font-medium text-foreground">
              {profile?.organizationType || 'Private Limited Company (Pvt Ltd)'}
            </p>
          )}
        </div>

        <div>
          <label className="block text-[11px] font-medium tracking-wide uppercase text-muted-foreground mb-1">
            Registration Code / CIN
          </label>
          {isEditing ? (
            <Input
              value={formData.registrationCode || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, registrationCode: e.target.value }))
              }
              placeholder="e.g. U72200KA2023PTC123456 / REG-HQ01"
              className="rounded-md font-mono text-xs"
            />
          ) : (
            <p className="text-xs font-mono font-medium text-foreground">
              {profile?.registrationCode || '—'}
            </p>
          )}
        </div>

        <div>
          <label className="block text-[11px] font-medium tracking-wide uppercase text-muted-foreground mb-1">
            Corporate Tax ID / EIN / GSTIN
          </label>
          {isEditing ? (
            <Input
              value={formData.taxId || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, taxId: e.target.value }))
              }
              placeholder="e.g. 29AAAAA0000A1Z5 / 12-3456789"
              className="rounded-md font-mono text-xs"
            />
          ) : (
            <p className="text-xs font-mono font-medium text-foreground">
              {profile?.taxId || '—'}
            </p>
          )}
        </div>

        <div>
          <label className="block text-[11px] font-medium tracking-wide uppercase text-muted-foreground mb-1">
            Country of Registration
          </label>
          {isEditing ? (
            <SelectField
              value={formData.registrationCountry || 'United States'}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, registrationCountry: e.target.value }))
              }
              options={COUNTRIES.map((c) => ({ value: c, label: c }))}
              className="rounded-md"
            />
          ) : (
            <p className="text-sm font-medium text-foreground">
              {profile?.registrationCountry || 'United States'}
            </p>
          )}
        </div>

        <div>
          <label className="block text-[11px] font-medium tracking-wide uppercase text-muted-foreground mb-1">
            Incorporation Date
          </label>
          {isEditing ? (
            <Input
              type="date"
              value={formData.registrationDate || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, registrationDate: e.target.value }))
              }
              className="rounded-md text-xs font-mono"
            />
          ) : (
            <p className="text-xs font-mono text-foreground">
              {profile?.registrationDate || '—'}
            </p>
          )}
        </div>
      </div>
    </SectionCard>
  );
};
