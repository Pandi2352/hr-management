import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  Mail,
  Phone,
  Copy,
  Check,
  Building,
  MapPin,
  UserCheck,
  Calendar,
  Shield,
  HeartHandshake,
  ExternalLink,
  Plus,
  Lock,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useToast } from '../../../components/ui/toast';
import type { ContactItem, EmergencyContactInfo } from '../types/contacts.types';

interface ContactDetailDrawerProps {
  contact: ContactItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectContact?: (contact: ContactItem) => void;
  onAddEmergencyContact?: (contactId: string, emergencyContact: EmergencyContactInfo) => void;
  isHrAdmin?: boolean;
}

export const ContactDetailDrawer: React.FC<ContactDetailDrawerProps> = ({
  contact,
  isOpen,
  onClose,
  onAddEmergencyContact,
  isHrAdmin = true,
}) => {
  const toast = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showAddEmergencyModal, setShowAddEmergencyModal] = useState(false);
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('Spouse');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyAltPhone, setEmergencyAltPhone] = useState('');

  if (!isOpen || !contact) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    toast.success(`${label} copied to clipboard`, 'Copied');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleAddEmergencySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emergencyName.trim() || !emergencyPhone.trim()) return;

    const newEmergency: EmergencyContactInfo = {
      id: `emg-${Date.now()}`,
      name: emergencyName.trim(),
      relationship: emergencyRelation,
      phone: emergencyPhone.trim(),
      alternatePhone: emergencyAltPhone.trim() || undefined,
      isPrimary: contact.emergencyContacts.length === 0,
    };

    onAddEmergencyContact?.(contact.id, newEmergency);
    toast.success(`Emergency contact added for ${contact.displayName}`, 'Emergency Contact Saved');
    setEmergencyName('');
    setEmergencyPhone('');
    setEmergencyAltPhone('');
    setShowAddEmergencyModal(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="relative border-b border-slate-200 dark:border-slate-800 p-6">
            <button
              type="button"
              onClick={onClose}
              className="absolute top-5 right-5 h-8 w-8 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-4">
              <img
                src={contact.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
                alt={contact.displayName}
                className="h-16 w-16 rounded-full object-cover ring-2 ring-violet-500/20 shadow-xs shrink-0"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                    {contact.displayName}
                  </h3>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wider ${
                      contact.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50'
                        : contact.status === 'ON_LEAVE'
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {contact.status}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {contact.employeeCode} • {contact.designation}
                </p>
                <p className="text-xs text-violet-600 dark:text-violet-400 font-medium">
                  {contact.department}
                </p>
              </div>
            </div>
          </div>

          {/* Drawer Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
            {/* Work Contact Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" />
                Work Contact
              </h4>
              <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-3.5 space-y-3">
                {/* Organization Email */}
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      Organization Email
                    </p>
                    <a
                      href={`mailto:${contact.organizationEmail}`}
                      className="text-xs font-semibold text-slate-900 dark:text-white hover:text-violet-600 dark:hover:text-violet-400 truncate block"
                    >
                      {contact.organizationEmail}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(contact.organizationEmail, 'Email')}
                    className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shrink-0"
                    title="Copy email"
                  >
                    {copiedField === 'Email' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                {/* Work Phone */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <div className="min-w-0">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      Work Phone
                    </p>
                    <a
                      href={`tel:${contact.workPhone}`}
                      className="text-xs font-semibold text-slate-900 dark:text-white hover:text-violet-600 dark:hover:text-violet-400 truncate block"
                    >
                      {contact.workPhone}
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(contact.workPhone, 'Phone')}
                    className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shrink-0"
                    title="Copy phone"
                  >
                    {copiedField === 'Phone' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Organization & Location Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                <Building className="h-3.5 w-3.5" />
                Organization Details
              </h4>
              <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/20 p-3.5 space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Building className="h-3 w-3 text-slate-400" /> Department:
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {contact.department}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 text-slate-400" /> Office Location:
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {contact.location}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 text-slate-400" /> Joined:
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {contact.joiningDate}
                  </span>
                </div>

                {/* Direct Manager */}
                {contact.manager && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <UserCheck className="h-3 w-3 text-slate-400" /> Direct Manager:
                    </span>
                    <div className="flex items-center gap-2">
                      <img
                        src={contact.manager.avatarUrl || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80'}
                        alt={contact.manager.name}
                        className="h-5 w-5 rounded-full object-cover"
                      />
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {contact.manager.name}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Emergency Contacts Section (Protected) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                  <HeartHandshake className="h-3.5 w-3.5 text-rose-500" />
                  Emergency Contacts
                </h4>
                {isHrAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowAddEmergencyModal(true)}
                    className="text-[11px] text-violet-600 dark:text-violet-400 hover:underline font-semibold flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </button>
                )}
              </div>

              {contact.emergencyContacts.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-200 dark:border-slate-800 p-3 text-center text-xs text-slate-400">
                  No emergency contacts on file.
                </div>
              ) : (
                <div className="space-y-2">
                  {contact.emergencyContacts.map((emg) => (
                    <div
                      key={emg.id}
                      className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/20 p-3 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {emg.name}
                          </span>
                          <span className="text-[10px] text-slate-400">({emg.relationship})</span>
                        </div>
                        {emg.isPrimary && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200/50">
                            Primary
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60">
                        <span className="text-slate-500 font-medium">{emg.phone}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(emg.phone, 'Emergency Phone')}
                          className="text-[11px] text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
                        >
                          <Copy className="h-3 w-3" />
                          Copy
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Privacy & Sensitive Personal Info (HR Access Controlled) */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-amber-500" />
                  Personal Information
                </span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal flex items-center gap-1">
                  <Lock className="h-2.5 w-2.5" />
                  Restricted HR View
                </span>
              </h4>

              {isHrAdmin ? (
                <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Personal Email:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {contact.personalEmail || 'Not specified'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Personal Phone:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {contact.personalPhone || 'Not specified'}
                    </span>
                  </div>
                  {contact.homeAddress && (
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-slate-500 block mb-0.5">Home Address:</span>
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        {contact.homeAddress}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-md bg-slate-50 dark:bg-slate-800/40 p-3 border border-slate-200 dark:border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                  Personal contacts are masked according to organization privacy policy.
                </div>
              )}
            </div>

            {/* Inline Add Emergency Contact Form */}
            {showAddEmergencyModal && (
              <form
                onSubmit={handleAddEmergencySubmit}
                className="rounded-md border border-violet-200 dark:border-violet-900/60 bg-violet-50/40 dark:bg-violet-950/20 p-3.5 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-violet-900 dark:text-violet-200">
                    Add Emergency Contact
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddEmergencyModal(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Input
                  label="Contact Name"
                  placeholder="e.g. Martha Doe"
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Relationship"
                    placeholder="e.g. Spouse / Parent"
                    value={emergencyRelation}
                    onChange={(e) => setEmergencyRelation(e.target.value)}
                    required
                  />
                  <Input
                    label="Emergency Phone"
                    placeholder="+1 555-0199"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    required
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddEmergencyModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" variant="primary">
                    Save Emergency Contact
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Footer Actions */}
          <div className="border-t border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <a
                href={`mailto:${contact.organizationEmail}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-violet-50 text-violet-700 hover:bg-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-900/40 border border-violet-200 dark:border-violet-800 transition-colors"
              >
                <Mail className="h-3.5 w-3.5" />
                Email
              </a>
              <a
                href={`tel:${contact.workPhone}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 transition-colors"
              >
                <Phone className="h-3.5 w-3.5" />
                Call
              </a>
            </div>

            <Link
              to={`/employees/${contact.employeeId || contact.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors shadow-2xs"
            >
              <span>Full Profile</span>
              <ExternalLink className="h-3 w-3 text-slate-400" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
