import { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { SelectField } from '../../../components/ui/SelectField';
import { Form, FormField } from '../../../components/forms';
import { ShieldCheck, Check, Mail, User } from 'lucide-react';
import type { Role } from '../types/security.types';

interface InviteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableRoles: Role[];
  onInvite: (payload: {
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
    expiryHours: number;
  }) => Promise<void>;
}

const EXPIRY_OPTIONS = [
  { value: '24', label: '24 hours' },
  { value: '48', label: '48 hours (Recommended)' },
  { value: '168', label: '7 days' },
];

export function InviteUserModal({ isOpen, onClose, availableRoles, onInvite }: InviteUserModalProps) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [expiryHours, setExpiryHours] = useState('48');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const nonSystemAssignableRoles = availableRoles.filter((r) => r.code !== 'employee');

  const resetAndClose = () => {
    setEmail('');
    setFirstName('');
    setLastName('');
    setSelectedRoles([]);
    setExpiryHours('48');
    setError('');
    onClose();
  };

  const toggleRole = (roleIdentifier: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleIdentifier) ? prev.filter((r) => r !== roleIdentifier) : [...prev, roleIdentifier],
    );
  };

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isFormValid = isValidEmail && firstName.trim() && lastName.trim() && selectedRoles.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError('');
      await onInvite({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        roles: selectedRoles,
        expiryHours: Number(expiryHours),
      });
      resetAndClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to send invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={resetAndClose} title="Invite Administrative User" className="max-w-lg">
      <Form onSubmit={handleSubmit} className="space-y-4 pt-1">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Invite a Super Admin, HR Administrator, or Department Manager into the administrative console. They will
          receive a branded email with a secure link to set their own password.
        </p>

        <FormField>
          <Input
            label="Work Email"
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane.doe@company.com"
            leftIcon={<Mail className="h-3.5 w-3.5" />}
            disabled={isSubmitting}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField>
            <Input
              label="First Name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Jane"
              leftIcon={<User className="h-3.5 w-3.5" />}
              disabled={isSubmitting}
            />
          </FormField>
          <FormField>
            <Input
              label="Last Name"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Doe"
              disabled={isSubmitting}
            />
          </FormField>
        </div>

        <FormField>
          <label className="block text-[11px] font-medium tracking-wide uppercase text-slate-500 mb-1.5">
            Initial Role Assignment <span className="text-rose-500">*</span>
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {nonSystemAssignableRoles.map((role) => {
              const isSelected = selectedRoles.includes(role.name);
              return (
                <div
                  key={role._id}
                  onClick={() => !isSubmitting && toggleRole(role.name)}
                  className={`p-2.5 rounded-md border text-left cursor-pointer transition-all flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'border-violet-500 bg-violet-50/70 dark:border-violet-400 dark:bg-violet-950/30'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{role.name}</span>
                  </div>
                  <div
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition-colors mt-0.5 ${
                      isSelected
                        ? 'border-violet-600 bg-violet-600 text-white dark:border-violet-500 dark:bg-violet-500'
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>
        </FormField>

        <FormField>
          <SelectField
            label="Invitation Expiry"
            value={expiryHours}
            onChange={(e) => setExpiryHours(e.target.value)}
            options={EXPIRY_OPTIONS}
          />
        </FormField>

        {error && (
          <p className="text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button type="button" variant="outline" size="sm" onClick={resetAndClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting} disabled={!isFormValid}>
            Send Invitation
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
