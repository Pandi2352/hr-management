import { useEffect, useState } from 'react';
import { Check, ShieldCheck } from 'lucide-react';
import { Button, Modal } from '../../../components/ui';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/toast';
import { employeesApi } from '../api/employees.api';
import { securityApi } from '../../security/api/security.api';
import type { Role } from '../../security/types/security.types';
import type { Employee } from '../types/employees.types';

/**
 * Assigns system roles (HR Admin, Manager, Employee…) to the login account
 * linked to an employee file — e.g. promoting an employee to HR.
 */
export function AssignHrRoleModal({
  isOpen,
  employee,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  employee: Employee;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loginEmail, setLoginEmail] = useState<string | null>(null);
  const [linked, setLinked] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setIsLoading(true);
    Promise.allSettled([securityApi.getRoles(), employeesApi.getEmployeeLogin(employee._id)])
      .then(([rolesRes, loginRes]) => {
        if (!active) return;
        if (rolesRes.status === 'fulfilled') setRoles(rolesRes.value);
        if (loginRes.status === 'fulfilled') {
          setLinked(loginRes.value.linked);
          setLoginEmail(loginRes.value.email);
          setSelected(loginRes.value.roles || []);
        }
        setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, employee._id]);

  const toggle = (name: string) => {
    setSelected((prev) => (prev.includes(name) ? prev.filter((r) => r !== name) : [...prev, name]));
  };

  const matches = (role: Role) =>
    selected.includes(role.name) ||
    selected.includes(role.code.toUpperCase()) ||
    selected.includes(role.code);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await employeesApi.assignEmployeeRoles(employee._id, selected);
      toast.success(`Login roles updated (${res.roles.join(', ') || 'none'}).`, 'Roles Assigned');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not assign roles.');
    } finally {
      setIsSaving(false);
    }
  };

  const displayName = employee.displayName || `${employee.firstName} ${employee.lastName}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Assign Roles — ${displayName}`} className="max-w-md">
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Spinner size="md" variant="violet" />
        </div>
      ) : !linked ? (
        <p className="py-4 text-center text-xs text-slate-500">
          No login account is linked to this employee yet. Create the login via onboarding first.
        </p>
      ) : (
        <div className="space-y-4 pt-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Login <strong className="font-mono text-slate-700 dark:text-slate-200">{loginEmail}</strong> will
            sign in with the selected access profiles.
          </p>
          <div className="max-h-60 space-y-2.5 overflow-y-auto pr-1">
            {roles.map((role) => {
              const isSelected = matches(role);
              return (
                <div
                  key={role._id}
                  onClick={() => toggle(role.name)}
                  className={`flex cursor-pointer items-start justify-between gap-3 rounded-md border p-3 text-left transition-all ${
                    isSelected
                      ? 'border-violet-500 bg-violet-50/70 dark:border-violet-400 dark:bg-violet-950/30'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{role.name}</span>
                      {role.isSystem && (
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.2 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          System
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400">{role.description}</p>
                  </div>
                  <div
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-md border transition-colors ${
                      isSelected
                        ? 'border-violet-600 bg-violet-600 text-white dark:border-violet-500 dark:bg-violet-500'
                        : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900'
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} isLoading={isSaving}>
              Save Roles
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
