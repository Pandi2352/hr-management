import { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { ShieldCheck, Check, Building2, Info } from 'lucide-react';
import { organizationApi } from '../../organization/api/organization.api';
import type { Department } from '../../organization/types/organization.types';
import type { UserAccount, Role } from '../types/security.types';

interface AssignRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserAccount | null;
  availableRoles: Role[];
  onSave: (userId: string, selectedRoles: string[], departmentScope: string[]) => Promise<void>;
}

/** Roles whose data visibility can be narrowed to specific departments. */
const SCOPABLE_ROLE_CODES = ['manager'];

export function AssignRoleModal({
  isOpen,
  onClose,
  user,
  availableRoles,
  onSave,
}: AssignRoleModalProps) {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [departmentScope, setDepartmentScope] = useState<string[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setSelectedRoles(user.roles || []);
      setDepartmentScope(user.departmentScope || []);
    }
  }, [user]);

  useEffect(() => {
    if (!isOpen) return;
    organizationApi
      .getDepartments({ status: 'ACTIVE' })
      .then((data) => setDepartments(Array.isArray(data) ? data : []))
      .catch(() => setDepartments([]));
  }, [isOpen]);

  if (!user) return null;

  const roleMatches = (role: Role) =>
    selectedRoles.includes(role.name) ||
    selectedRoles.includes(role.code.toUpperCase()) ||
    selectedRoles.includes(role.code);

  // Scope only applies while a scopable role (Manager) is selected and no
  // org-wide role overrides it.
  const hasScopableRole = availableRoles.some(
    (r) => SCOPABLE_ROLE_CODES.includes(r.code) && roleMatches(r),
  );
  const hasOrgWideRole = availableRoles.some(
    (r) => ['super_admin', 'hr_admin'].includes(r.code) && roleMatches(r),
  );
  const showScopePicker = hasScopableRole && !hasOrgWideRole;

  const toggleRole = (roleIdentifier: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleIdentifier)
        ? prev.filter((r) => r !== roleIdentifier)
        : [...prev, roleIdentifier],
    );
  };

  const toggleDepartment = (departmentId: string) => {
    setDepartmentScope((prev) =>
      prev.includes(departmentId)
        ? prev.filter((d) => d !== departmentId)
        : [...prev, departmentId],
    );
  };

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      // An org-wide role clears any previously stored scope.
      await onSave(user._id, selectedRoles, showScopePicker ? departmentScope : []);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign System Roles" className="max-w-md">
      <div className="space-y-4 pt-1">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Manage access profiles for <strong className="text-slate-700 dark:text-slate-200">{user.firstName} {user.lastName}</strong> ({user.email}). Select roles to grant permissions according to the security matrix.
        </p>

        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
          {availableRoles.map((role) => {
            const isSelected = roleMatches(role);

            return (
              <div
                key={role._id}
                onClick={() => toggleRole(role.name)}
                className={`p-3 rounded-md border text-left cursor-pointer transition-all flex items-start justify-between gap-3 ${
                  isSelected
                    ? 'border-violet-500 bg-violet-50/70 dark:border-violet-400 dark:bg-violet-950/30'
                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {role.name}
                    </span>
                    {role.isSystem && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 font-medium">
                        System
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                    {role.description}
                  </p>
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

        {/* Department Scope — only relevant for scopable (Manager) roles */}
        {showScopePicker && (
          <div className="rounded-md border border-violet-200/70 bg-gradient-to-br from-violet-50/80 to-purple-50/40 p-3 dark:border-violet-900/40 dark:from-violet-950/30 dark:to-purple-950/10 space-y-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                <Building2 className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Scope of Authority
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Restrict employee visibility to specific departments.
                </p>
              </div>
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
              {departments.length === 0 ? (
                <p className="text-[11px] italic text-slate-400">No active departments found.</p>
              ) : (
                departments.map((dept) => {
                  const isSelected = departmentScope.includes(dept._id);
                  return (
                    <div
                      key={dept._id}
                      onClick={() => toggleDepartment(dept._id)}
                      className={`px-2.5 py-1.5 rounded-md border text-left cursor-pointer transition-all flex items-center justify-between gap-2 bg-white dark:bg-slate-900 ${
                        isSelected
                          ? 'border-violet-400 dark:border-violet-400'
                          : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                      }`}
                    >
                      <span className="text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate">
                        {dept.name}
                        <span className="ml-1.5 font-mono text-[10px] text-slate-400">{dept.code}</span>
                      </span>
                      <div
                        className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                          isSelected
                            ? 'bg-violet-500 border-violet-500 text-white'
                            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                        }`}
                      >
                        {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-start gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
              <Info className="h-3 w-3 shrink-0 mt-0.5" />
              <span>
                {departmentScope.length === 0
                  ? "Leave empty to fall back to the manager's own department (from their linked employee record). Sub-departments are always included."
                  : `Restricted to ${departmentScope.length} department(s) and their sub-departments.`}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleConfirm} isLoading={isSubmitting}>
            Save Roles
          </Button>
        </div>
      </div>
    </Modal>
  );
}
