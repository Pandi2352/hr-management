import React, { useState } from 'react';
import {
  Mail,
  Phone,
  Copy,
  Check,
  Building,
  MapPin,
  UserCheck,
  Eye,
} from 'lucide-react';
import { useToast } from '../../../components/ui/toast';
import { Avatar } from '../../../components/ui';
import type { ContactItem } from '../types/contacts.types';

interface ContactCardProps {
  contact: ContactItem;
  onViewContact: (contact: ContactItem) => void;
}

export const ContactCard: React.FC<ContactCardProps> = ({
  contact,
  onViewContact,
}) => {
  const toast = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, text: string, label: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`${label} copied to clipboard`, 'Copied');
    setTimeout(() => setCopiedField(null), 1800);
  };

  const getStatusBadge = (status: ContactItem['status']) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60';
      case 'ON_LEAVE':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60';
      case 'PROBATION':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/60';
      case 'INACTIVE':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between group">
      {/* Top Row: Avatar, Identity & Status */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Avatar
              src={contact.avatarUrl}
              name={contact.displayName}
              size="lg"
              className="shrink-0 rounded-md"
            />
            <div>
              <h3
                onClick={() => onViewContact(contact)}
                className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 cursor-pointer transition-colors"
              >
                {contact.displayName}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                {contact.employeeCode}
              </p>
            </div>
          </div>

          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(
              contact.status
            )}`}
          >
            {contact.status}
          </span>
        </div>

        {/* Role and Department */}
        <div className="mt-3.5 space-y-1">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            {contact.designation}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Building className="h-3 w-3 text-slate-400" />
              {contact.department}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-slate-400" />
              {contact.location}
            </span>
          </div>
        </div>

        {/* Work Communication Badges */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
          {/* Email */}
          <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/40 rounded-md px-2.5 py-1.5 border border-slate-200/60 dark:border-slate-700/60">
            <a
              href={`mailto:${contact.organizationEmail}`}
              className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 truncate max-w-[190px]"
            >
              <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{contact.organizationEmail}</span>
            </a>
            <button
              type="button"
              onClick={(e) => handleCopy(e, contact.organizationEmail, 'Email')}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-600 transition-colors"
              title="Copy email"
            >
              {copiedField === 'Email' ? (
                <Check className="h-3 w-3 text-emerald-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          </div>

          {/* Phone */}
          <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-800/40 rounded-md px-2.5 py-1.5 border border-slate-200/60 dark:border-slate-700/60">
            <a
              href={`tel:${contact.workPhone}`}
              className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 truncate"
            >
              <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>{contact.workPhone}</span>
            </a>
            <button
              type="button"
              onClick={(e) => handleCopy(e, contact.workPhone, 'Phone')}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-400 hover:text-slate-600 transition-colors"
              title="Copy phone"
            >
              {copiedField === 'Phone' ? (
                <Check className="h-3 w-3 text-emerald-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          </div>
        </div>

        {/* Manager Info */}
        {contact.manager && (
          <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <UserCheck className="h-3 w-3 text-slate-400" />
              Manager:
            </span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {contact.manager.name}
            </span>
          </div>
        )}
      </div>

      {/* Card Action Buttons */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onViewContact(contact)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
        >
          <Eye className="h-3.5 w-3.5" />
          Details
        </button>

        <a
          href={`mailto:${contact.organizationEmail}`}
          className="inline-flex items-center justify-center p-2 rounded-md bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-900/40 border border-violet-200/50 dark:border-violet-800/50 transition-colors"
          title="Send email"
        >
          <Mail className="h-3.5 w-3.5" />
        </a>

        <a
          href={`tel:${contact.workPhone}`}
          className="inline-flex items-center justify-center p-2 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/40 border border-emerald-200/50 dark:border-emerald-800/50 transition-colors"
          title="Call phone"
        >
          <Phone className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
};
