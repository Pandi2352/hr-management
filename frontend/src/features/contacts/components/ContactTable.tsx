import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Mail,
  Phone,
  Copy,
  Check,
  MoreHorizontal,
  ArrowUpDown,
  ExternalLink,
  Eye,
  UserCheck,
} from 'lucide-react';
import { useToast } from '../../../components/ui/toast';
import { Avatar } from '../../../components/ui';
import type { ContactItem, ContactSortField, SortOrder } from '../types/contacts.types';

interface ContactTableProps {
  contacts: ContactItem[];
  onViewContact: (contact: ContactItem) => void;
  sortField: ContactSortField;
  sortOrder: SortOrder;
  onSortChange: (field: ContactSortField) => void;
}

export const ContactTable: React.FC<ContactTableProps> = ({
  contacts,
  onViewContact,
  sortField,
  sortOrder: _sortOrder,
  onSortChange,
}) => {
  const toast = useToast();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success(`${label} copied to clipboard`, 'Copied');
    setTimeout(() => setCopiedId(null), 1800);
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

  const renderSortableHeader = (label: string, field: ContactSortField, alignRight = false) => {
    const isActive = sortField === field;
    return (
      <th
        onClick={() => onSortChange(field)}
        className={`py-3 px-4 font-semibold text-slate-600 dark:text-slate-300 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors select-none ${
          alignRight ? 'text-right' : 'text-left'
        }`}
      >
        <div
          className={`flex items-center gap-1.5 ${
            alignRight ? 'justify-end' : 'justify-start'
          }`}
        >
          <span>{label}</span>
          <ArrowUpDown
            className={`h-3 w-3 transition-colors ${
              isActive
                ? 'text-violet-600 dark:text-violet-400'
                : 'text-slate-400 opacity-60'
            }`}
          />
        </div>
      </th>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs border-b border-slate-200 dark:border-slate-800">
          <tr>
            {renderSortableHeader('Employee Name', 'name')}
            {renderSortableHeader('Employee ID', 'employeeCode')}
            <th className="py-3 px-4 text-left font-semibold text-slate-600 dark:text-slate-300">
              Organization Email
            </th>
            <th className="py-3 px-4 text-left font-semibold text-slate-600 dark:text-slate-300">
              Work Phone
            </th>
            {renderSortableHeader('Department', 'department')}
            {renderSortableHeader('Designation', 'designation')}
            {renderSortableHeader('Location', 'location')}
            {renderSortableHeader('Status', 'status')}
            <th className="py-3 px-4 text-right font-semibold text-slate-600 dark:text-slate-300">
              Action
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {contacts.length === 0 ? (
            <tr>
              <td colSpan={9} className="py-12 text-center text-slate-400 dark:text-slate-500">
                No contacts match the specified criteria.
              </td>
            </tr>
          ) : (
            contacts.map((contact) => (
              <tr
                key={contact.id}
                className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
              >
                {/* Name + Avatar */}
                <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                  <div
                    onClick={() => onViewContact(contact)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <Avatar
                      src={contact.avatarUrl}
                      name={contact.displayName}
                      size="sm"
                      className="shrink-0 rounded-md"
                    />
                    <div>
                      <span className="font-semibold block hover:text-violet-600 dark:hover:text-violet-400">
                        {contact.displayName}
                      </span>
                      {contact.manager && (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <UserCheck className="h-2.5 w-2.5 text-slate-400" />
                          {contact.manager.name}
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* Employee ID */}
                <td className="py-3 px-4 text-slate-600 dark:text-slate-400 font-mono font-medium">
                  {contact.employeeCode}
                </td>

                {/* Organization Email */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5 max-w-[200px]">
                    <a
                      href={`mailto:${contact.organizationEmail}`}
                      className="text-slate-700 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 truncate hover:underline"
                    >
                      {contact.organizationEmail}
                    </a>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          contact.organizationEmail,
                          `${contact.id}-email`,
                          'Organization Email'
                        )
                      }
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                      title="Copy email"
                    >
                      {copiedId === `${contact.id}-email` ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </td>

                {/* Work Phone */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <a
                      href={`tel:${contact.workPhone}`}
                      className="text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:underline"
                    >
                      {contact.workPhone}
                    </a>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(
                          contact.workPhone,
                          `${contact.id}-phone`,
                          'Work Phone'
                        )
                      }
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                      title="Copy phone"
                    >
                      {copiedId === `${contact.id}-phone` ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </td>

                {/* Department */}
                <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                  {contact.department}
                </td>

                {/* Designation */}
                <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                  {contact.designation}
                </td>

                {/* Location */}
                <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                  {contact.location}
                </td>

                {/* Status */}
                <td className="py-3 px-4">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(
                      contact.status
                    )}`}
                  >
                    {contact.status}
                  </span>
                </td>

                {/* Actions */}
                <td className="py-3 px-4 text-right">
                  <div className="relative inline-block text-right">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveMenuId(activeMenuId === contact.id ? null : contact.id)
                      }
                      className="inline-flex items-center justify-center h-7 w-7 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>

                    {activeMenuId === contact.id && (
                      <>
                        <div
                          className="fixed inset-0 z-20"
                          onClick={() => setActiveMenuId(null)}
                        />
                        <div className="absolute right-0 mt-1 w-44 rounded-md bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-30">
                          <button
                            type="button"
                            onClick={() => {
                              onViewContact(contact);
                              setActiveMenuId(null);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-2"
                          >
                            <Eye className="h-3.5 w-3.5 text-slate-400" />
                            View Contact Drawer
                          </button>
                          <Link
                            to={`/employees/${contact.employeeId || contact.id}`}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-2"
                          >
                            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                            Open Employee Profile
                          </Link>
                          <a
                            href={`mailto:${contact.organizationEmail}`}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 text-violet-600 dark:text-violet-400 flex items-center gap-2"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            Send Email
                          </a>
                          <a
                            href={`tel:${contact.workPhone}`}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-700 text-emerald-600 dark:text-emerald-400 flex items-center gap-2"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            Call Phone
                          </a>
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
