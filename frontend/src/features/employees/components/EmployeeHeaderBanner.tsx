import React from 'react';
import { ArrowLeft, Edit2, KeyRound } from 'lucide-react';
import { Button, Avatar } from '../../../components/ui';
import type { Employee } from '../types/employees.types';

export interface EmployeeHeaderBannerProps {
  employee: Employee;
  onBack: () => void;
  onEdit: () => void;
  onShareCredentials?: () => void;
  onStatusChange?: () => void;
  onResendCredentials?: () => void;
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
  activeTab,
  onTabChange,
  tabs,
}) => {
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
              className="text-xs cursor-pointer text-[#524b6e] dark:text-indigo-400 border-indigo-200 dark:border-indigo-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
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
            <Avatar
              src={employee.avatarUrl}
              name={employee.displayName || `${employee.firstName} ${employee.lastName}`}
              size="xl"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {employee.displayName || `${employee.firstName} ${employee.lastName}`}
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400">
                  {employee.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                <span className="font-mono text-[#524b6e] font-semibold dark:text-indigo-400">
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
                  ? 'border-[#524b6e] text-[#524b6e] dark:border-indigo-400 dark:text-indigo-400'
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
