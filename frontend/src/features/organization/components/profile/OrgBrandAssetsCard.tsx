import React, { useRef } from 'react';
import { Upload, Trash2, Sparkles, Building2 } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { SectionCard } from '../../../../components/ui/SectionCard';
import type { OrganizationProfile } from '../../types/organization.types';

interface OrgBrandAssetsCardProps {
  formData: Partial<OrganizationProfile>;
  isEditing: boolean;
  logoPreview: string;
  logoDimensions: { width: number; height: number } | null;
  logoFileSize: string;
  onLogoFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveLogo: () => void;
}

export const OrgBrandAssetsCard: React.FC<OrgBrandAssetsCardProps> = ({
  formData,
  isEditing,
  logoPreview,
  logoDimensions,
  logoFileSize,
  onLogoFileChange,
  onRemoveLogo,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <SectionCard
      title="Corporate Identity & Brand Assets"
      description="Visual assets and insignia representing your organization across the platform"
      icon={Sparkles}
    >
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Logo Preview Frame */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="h-28 w-28 rounded-md overflow-hidden border border-hairline bg-slate-900 flex items-center justify-center relative group">
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
                <Upload className="h-5 w-5 mb-1 text-primary" />
                <span className="text-[10px] font-semibold">Change Logo</span>
              </div>
            )}
          </div>

          {logoDimensions && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-surface-hover text-muted-foreground border border-hairline">
              {logoDimensions.width} × {logoDimensions.height} px
            </span>
          )}
          {logoFileSize && (
            <span className="text-[10px] text-muted-foreground font-mono">
              {logoFileSize}
            </span>
          )}
        </div>

        {/* Logo Controls */}
        <div className="flex-1 space-y-3.5">
          <div>
            <h4 className="text-sm font-bold text-foreground">
              Official Corporate Insignia
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Upload your official company emblem. Recommended dimensions: <strong>512 × 512 px</strong>.
              Supported formats: <strong>PNG, SVG, WebP, JPG</strong>. Max file size: <strong>2 MB</strong>.
            </p>
          </div>

          {isEditing ? (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/webp, image/svg+xml"
                onChange={onLogoFileChange}
                className="hidden"
              />

              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-md text-xs"
                >
                  <Upload className="h-3.5 w-3.5 text-primary" />
                  {formData.logoUrl ? 'Replace Logo' : 'Upload Logo'}
                </Button>

                {formData.logoUrl && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onRemoveLogo}
                    className="flex items-center gap-1.5 rounded-md border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove Logo
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Building2 className="h-4 w-4 text-emerald-500" />
              <span>Verified corporate badge active across all portals</span>
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
};
