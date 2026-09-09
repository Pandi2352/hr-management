import React, { useRef, useState } from 'react';
import { ArrowLeft, Edit2, KeyRound, Camera, Loader2 } from 'lucide-react';
import { Button, Avatar } from '../../../components/ui';
import { useToast } from '../../../components/ui/toast';
import { employeesApi } from '../api/employees.api';
import type { Employee } from '../types/employees.types';

export interface EmployeeHeaderBannerProps {
  employee: Employee;
  onBack: () => void;
  onEdit: () => void;
  onShareCredentials?: () => void;
  onStatusChange?: () => void;
  onResendCredentials?: () => void;
  onAvatarUpdated?: (newUrl: string) => void;
  activeTab: string;
  onTabChange: (tabId: string) => void;
  tabs: { id: string; label: string }[];
}

export const EmployeeHeaderBanner: React.FC<EmployeeHeaderBannerProps> = ({
  employee,
  onBack,
  onEdit,
  onShareCredentials,
  onStatusChange,
  onResendCredentials,
  onAvatarUpdated,
  activeTab,
  onTabChange,
  tabs,
}) => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (PNG, JPG, WebP, GIF).', 'Invalid File');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Avatar file size cannot exceed 5MB.', 'File Too Large');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const res = await employeesApi.uploadAvatar(employee._id, file);
      toast.success('Profile picture updated successfully.', 'Photo Updated');
      if (onAvatarUpdated) {
        onAvatarUpdated(res.avatarUrl);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to upload profile photo.', 'Upload Failed');
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  return (
    <div className="space-y-6 w-full">
      {/* Back Link & Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors dark:hover:text-slate-100 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Employee Directory</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {onStatusChange && (
            <Button
              size="sm"
              variant="outline"
              onClick={onStatusChange}
              className="text-xs cursor-pointer"
            >
              Change Status
            </Button>
          )}

          {employee.personalEmail && onResendCredentials && (
            <Button
              size="sm"
              variant="outline"
              onClick={onResendCredentials}
              className="text-xs cursor-pointer text-[var(--primary)] border-[var(--primary)]/30 hover:bg-[var(--primary-light)]"
            >
              Resend Onboarding Email
            </Button>
          )}

          {employee.initialPassword && onShareCredentials && (
            <Button
              size="sm"
              variant="outline"
              onClick={onShareCredentials}
              className="flex items-center gap-1.5 cursor-pointer text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>Share Credentials</span>
            </Button>
          )}

          <Button
            size="sm"
            variant="primary"
            onClick={onEdit}
            className="flex items-center gap-1.5 cursor-pointer"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>Edit Profile</span>
          </Button>
        </div>
      </div>

      {/* Main Profile Header Banner */}
      <div className="rounded-md border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Avatar
                src={employee.avatarUrl}
                name={employee.displayName || `${employee.firstName} ${employee.lastName}`}
                size="xl"
                className="transition-opacity group-hover:opacity-90 rounded-md"
              />
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarFileSelect}
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
              />
              <div
                className="absolute inset-0 bg-slate-900/50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-medium"
                title="Click to change photo"
              >
                {isUploadingAvatar ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Camera className="h-4 w-4 mb-0.5" />
                    <span>Change</span>
                  </>
                )}
              </div>
              <button
                type="button"
                className="absolute -bottom-1 -right-1 p-1 bg-[var(--primary)] text-white rounded-md hover:bg-[var(--primary-hover)] transition-colors border border-white dark:border-slate-900 cursor-pointer"
                title="Change employee profile photo"
                disabled={isUploadingAvatar}
              >
                {isUploadingAvatar ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
              </button>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {employee.displayName || `${employee.firstName} ${employee.lastName}`}
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400">
                  {employee.status}
                </span>
                {employee.profileCompletion && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide border ${
                    employee.profileCompletion.percentage >= 100
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400'
                      : 'bg-violet-50 text-violet-700 border-violet-200/60 dark:bg-violet-950/40 dark:text-violet-400'
                  }`}>
                    {employee.profileCompletion.percentage}% Complete
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                <span className="font-mono text-[var(--primary)] font-semibold">
                  {employee.employeeCode}
                </span>
                <span>•</span>
                <span>{employee.designation?.title || employee.designationTitle || 'Staff Member'}</span>
                <span>•</span>
                <span>{employee.department?.name || employee.departmentName || 'General'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* 7 Tab Switcher Bar */}
        <div className="mt-6 flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`px-3.5 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'border-[var(--primary)] text-[var(--primary)] font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
