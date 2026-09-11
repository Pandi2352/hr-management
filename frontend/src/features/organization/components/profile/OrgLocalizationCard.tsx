import React from 'react';
import { Clock, Briefcase } from 'lucide-react';
import { Input } from '../../../../components/ui/Input';
import { SelectField } from '../../../../components/ui/SelectField';
import { SectionCard } from '../../../../components/ui/SectionCard';
import {
  COMMON_TIMEZONES,
  CURRENCIES,
  MONTHS,
} from '../../../../config/localization.config';
import type { OrganizationProfile } from '../../types/organization.types';

const DAYS_OF_WEEK = [
  { key: 'Monday', short: 'Mon' },
  { key: 'Tuesday', short: 'Tue' },
  { key: 'Wednesday', short: 'Wed' },
  { key: 'Thursday', short: 'Thu' },
  { key: 'Friday', short: 'Fri' },
  { key: 'Saturday', short: 'Sat' },
  { key: 'Sunday', short: 'Sun' },
];

interface OrgLocalizationCardProps {
  profile: OrganizationProfile | null;
  formData: Partial<OrganizationProfile>;
  isEditing: boolean;
  setFormData: React.Dispatch<React.SetStateAction<Partial<OrganizationProfile>>>;
}

export const OrgLocalizationCard: React.FC<OrgLocalizationCardProps> = ({
  profile,
  formData,
  isEditing,
  setFormData,
}) => {
  const currencyObj =
    CURRENCIES.find((c) => c.code === (formData.currency || profile?.currency || 'USD')) ||
    CURRENCIES[0];

  const workingDays: string[] =
    formData.workingDays || profile?.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const handleToggleWorkingDay = (dayKey: string) => {
    if (!isEditing) return;
    const nextDays = workingDays.includes(dayKey)
      ? workingDays.filter((d) => d !== dayKey)
      : [...workingDays, dayKey];
    setFormData((prev) => ({ ...prev, workingDays: nextDays }));
  };

  return (
    <div className="space-y-5">
      {/* Regional Standards & Financial Cycles */}
      <SectionCard
        title="Regional Standards & Financial Cycles"
        description="Canonical timezones, reporting currencies, and fiscal calendar boundaries"
        icon={Clock}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6">
          <div>
            <label className="block text-[11px] font-medium tracking-wide uppercase text-muted-foreground mb-1">
              Canonical Timezone <span className="text-rose-500">*</span>
            </label>
            {isEditing ? (
              <SelectField
                value={formData.timezone || 'Asia/Kolkata'}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, timezone: e.target.value }))
                }
                options={COMMON_TIMEZONES.map((tz) => ({
                  value: tz.value,
                  label: tz.label,
                }))}
                className="rounded-md"
              />
            ) : (
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {profile?.timezone || 'Asia/Kolkata'}
                </p>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {COMMON_TIMEZONES.find((t) => t.value === profile?.timezone)?.label ||
                    profile?.timezone}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-medium tracking-wide uppercase text-muted-foreground mb-1">
              Base Reporting Currency <span className="text-rose-500">*</span>
            </label>
            {isEditing ? (
              <SelectField
                value={formData.currency || 'USD'}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, currency: e.target.value }))
                }
                options={CURRENCIES.map((c) => ({
                  value: c.code,
                  label: c.label,
                }))}
                className="rounded-md"
              />
            ) : (
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {currencyObj.label}
                  </p>
                  <span className="px-1.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-primary/15 text-primary">
                    {currencyObj.symbol}
                  </span>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground">
                  Sample: {currencyObj.sample}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-medium tracking-wide uppercase text-muted-foreground mb-1">
              Fiscal Year Start Month <span className="text-rose-500">*</span>
            </label>
            {isEditing ? (
              <SelectField
                value={formData.fiscalYearStartMonth || 'January'}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    fiscalYearStartMonth: e.target.value,
                  }))
                }
                options={MONTHS.map((m) => ({
                  value: m,
                  label: m,
                }))}
                className="rounded-md"
              />
            ) : (
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {profile?.fiscalYearStartMonth || 'January'}
                </p>
                <span className="text-[11px] text-muted-foreground">
                  Annual cycle: {profile?.fiscalYearStartMonth || 'January'} 1 – End of preceding month
                </span>
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Workplace Schedule & Shift Policies */}
      <SectionCard
        title="Workplace Schedule & Standard Hours"
        description="Core working days, shift start/end anchors, and daily duration defaults"
        icon={Briefcase}
        actions={
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-surface-hover text-foreground border border-hairline">
            {workingDays.length} Working Days / Week
          </span>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="block text-[11px] font-medium tracking-wide uppercase text-muted-foreground mb-2">
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
                        ? 'bg-foreground text-background border border-transparent'
                        : 'bg-surface-hover text-muted-foreground border border-hairline'
                    } ${isEditing ? 'cursor-pointer hover:border-primary' : 'cursor-default opacity-90'}`}
                  >
                    {day.short}
                    {isSelected && <span className="ml-1 text-[10px]">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6 pt-2">
            <div>
              <label className="block text-[11px] font-medium tracking-wide uppercase text-muted-foreground mb-1">
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
                    setFormData((prev) => ({
                      ...prev,
                      standardWorkingHours: parseFloat(e.target.value) || 8,
                    }))
                  }
                  className="rounded-md"
                />
              ) : (
                <p className="text-sm font-semibold text-foreground">
                  {profile?.standardWorkingHours ?? 8} Hours / Day
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium tracking-wide uppercase text-muted-foreground mb-1">
                Standard Shift Start Time
              </label>
              {isEditing ? (
                <Input
                  type="time"
                  value={formData.workStartTime || '09:00'}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      workStartTime: e.target.value,
                    }))
                  }
                  className="rounded-md font-mono text-xs"
                />
              ) : (
                <p className="text-sm font-mono font-medium text-foreground">
                  {profile?.workStartTime || '09:00 AM'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium tracking-wide uppercase text-muted-foreground mb-1">
                Standard Shift End Time
              </label>
              {isEditing ? (
                <Input
                  type="time"
                  value={formData.workEndTime || '18:00'}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      workEndTime: e.target.value,
                    }))
                  }
                  className="rounded-md font-mono text-xs"
                />
              ) : (
                <p className="text-sm font-mono font-medium text-foreground">
                  {profile?.workEndTime || '06:00 PM'}
                </p>
              )}
            </div>
          </div>

          {/* System Display Formats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6 pt-3 border-t border-hairline">
            <div>
              <label className="block text-[11px] font-medium tracking-wide uppercase text-muted-foreground mb-1">
                System Date Format
              </label>
              {isEditing ? (
                <SelectField
                  value={formData.dateFormat || 'DD/MM/YYYY'}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, dateFormat: e.target.value }))
                  }
                  options={[
                    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (e.g. 08/09/2026)' },
                    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (e.g. 09/08/2026)' },
                    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (e.g. 2026-09-08)' },
                  ]}
                  className="rounded-md"
                />
              ) : (
                <p className="text-xs font-mono font-semibold text-foreground">
                  {profile?.dateFormat || 'DD/MM/YYYY'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium tracking-wide uppercase text-muted-foreground mb-1">
                System Time Format
              </label>
              {isEditing ? (
                <SelectField
                  value={formData.timeFormat || '12 Hour'}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, timeFormat: e.target.value }))
                  }
                  options={[
                    { value: '12 Hour', label: '12 Hour (e.g. 09:00 AM)' },
                    { value: '24 Hour', label: '24 Hour (e.g. 09:00)' },
                  ]}
                  className="rounded-md"
                />
              ) : (
                <p className="text-xs font-mono font-semibold text-foreground">
                  {profile?.timeFormat || '12 Hour'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium tracking-wide uppercase text-muted-foreground mb-1">
                Number Format
              </label>
              {isEditing ? (
                <SelectField
                  value={formData.numberFormat || '1,234,567.89'}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, numberFormat: e.target.value }))
                  }
                  options={[
                    { value: '1,234,567.89', label: 'Western (1,234,567.89)' },
                    { value: '12,34,567.89', label: 'South Asian (12,34,567.89)' },
                  ]}
                  className="rounded-md"
                />
              ) : (
                <p className="text-xs font-mono font-semibold text-foreground">
                  {profile?.numberFormat || '1,234,567.89'}
                </p>
              )}
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
};
