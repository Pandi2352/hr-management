import { useEffect, useState } from 'react';
import { Button, Modal, SelectField } from '../../../components/ui';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/toast';
import { employeesApi } from '../api/employees.api';
import { organizationApi } from '../../organization/api/organization.api';
import type { Designation } from '../../organization/types/organization.types';
import type { Employee } from '../types/employees.types';

/** Quick-change designation without opening the full edit form. */
export function ChangeDesignationModal({
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
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [designationId, setDesignationId] = useState(employee.designationId || '');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDesignationId(employee.designationId || '');
    setIsLoading(true);
    organizationApi
      .getDesignations()
      .then((data) => setDesignations(data || []))
      .catch(() => setDesignations([]))
      .finally(() => setIsLoading(false));
  }, [isOpen, employee.designationId]);

  const displayName = employee.displayName || `${employee.firstName} ${employee.lastName}`;
  const current = designations.find((d) => d._id === employee.designationId);

  const handleSave = async () => {
    if (!designationId) {
      toast.error('Select a designation.');
      return;
    }
    setIsSaving(true);
    try {
      await employeesApi.updateEmployee(employee._id, { designationId } as any);
      const next = designations.find((d) => d._id === designationId);
      toast.success(`Designation updated to ${next?.title || 'new role'}.`);
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not change designation.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Change Designation — ${displayName}`} className="max-w-md">
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Spinner size="md" variant="violet" />
        </div>
      ) : (
        <div className="space-y-4 pt-1">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Current: <strong className="text-slate-700 dark:text-slate-200">{current?.title || 'Staff Member'}</strong>
            {current ? ` (Grade ${current.grade})` : ''}
          </p>
          <SelectField
            label="New Designation"
            value={designationId}
            onChange={(e) => setDesignationId(e.target.value)}
            options={designations.map((d) => ({
              value: d._id,
              label: `${d.title} (Grade ${d.grade})`,
            }))}
          />
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} isLoading={isSaving}>
              Save Designation
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
