import React from 'react';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/toast';
import { KeyRound, Copy } from 'lucide-react';

export interface CredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  employeeName: string;
  employeeCode: string;
  workEmail: string;
  initialPassword?: string;
  personalEmail?: string;
  onNavigateProfile?: () => void;
}

export const CredentialsModal: React.FC<CredentialsModalProps> = ({
  isOpen,
  onClose,
  title = 'Employee Corporate Login Credentials',
  employeeName,
  employeeCode,
  workEmail,
  initialPassword,
  personalEmail,
  onNavigateProfile,
}) => {
  const toast = useToast();

  if (!isOpen) return null;

  const handleCopy = () => {
    const shareText = `Hi ${employeeName},\n\nWelcome to the team! Here are your corporate login credentials for PeopleOS:\n\nPortal URL: ${window.location.origin}/auth/login\nUsername: ${workEmail}\nTemporary Password: ${initialPassword || 'PplOS#2026!HR'}\n\nPlease change your password upon your first login.`;
    navigator.clipboard.writeText(shareText);
    toast.success('Credentials copied to clipboard. Ready to paste and email.', 'Copied');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-md bg-white p-6 border border-slate-200 shadow-xl dark:bg-slate-900 dark:border-slate-800 space-y-4">
        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="h-10 w-10 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center dark:bg-emerald-950/40 dark:text-emerald-400">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h3>
            <p className="text-xs text-slate-500">
              {employeeName} ({employeeCode})
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300">
          Copy these login credentials to securely share with the employee using their personal email address.
        </p>

        {/* Credentials Card */}
        <div className="space-y-3 rounded-md bg-slate-50 p-4 border border-slate-200 text-xs dark:bg-slate-950 dark:border-slate-800 font-mono">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-sans">
              Corporate Login Email
            </span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">{workEmail}</span>
          </div>
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-sans">
              Initial Password
            </span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm">
              {initialPassword || 'PplOS#2026!HR'}
            </span>
          </div>
          {personalEmail && (
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-sans">
                Employee Personal Email (For Delivery)
              </span>
              <span className="text-slate-700 dark:text-slate-300">{personalEmail}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="flex items-center gap-1.5 cursor-pointer"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Copy Credentials Text</span>
          </Button>

          {onNavigateProfile ? (
            <Button type="button" variant="primary" size="sm" onClick={onNavigateProfile}>
              Go to Profile
            </Button>
          ) : (
            <Button type="button" variant="primary" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
