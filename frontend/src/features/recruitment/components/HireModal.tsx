import { useEffect, useState } from 'react';
import { Button, Input, Modal, SelectField } from '../../../components/ui';
import { useToast } from '../../../components/ui/toast';
import { pipelineApi } from '../api/pipeline.api';
import { organizationApi } from '../../organization/api/organization.api';
import type { Department, Designation, LocationItem } from '../../organization/types/organization.types';
import type { CandidateDetail } from '../types/pipeline.types';
import { EMPLOYMENT_TYPE_OPTIONS } from '../../employees/constants/employment.constants';

/**
 * Onboarding handoff: converts the accepted candidate into an employee.
 * The standard provisioning engine fires — login + welcome email included.
 */
export function HireModal({
  isOpen,
  candidate,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  candidate: CandidateDetail;
  onClose: () => void;
  onSaved: (employeeCode: string) => void;
}) {
  const toast = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [departmentId, setDepartmentId] = useState('');
  const [designationId, setDesignationId] = useState('');
  const [locationId, setLocationId] = useState('');
  const [employmentType, setEmploymentType] = useState('FULL_TIME');
  const [joiningDate, setJoiningDate] = useState(candidate.offer?.joiningDate || new Date().toISOString().slice(0, 10));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setJoiningDate(candidate.offer?.joiningDate || new Date().toISOString().slice(0, 10));
    Promise.allSettled([
      organizationApi.getDepartments(),
      organizationApi.getDesignations(),
      organizationApi.getLocations(),
    ]).then(([d, g, l]) => {
      if (d.status === 'fulfilled') setDepartments(d.value || []);
      if (g.status === 'fulfilled') setDesignations(g.value || []);
      if (l.status === 'fulfilled') setLocations(l.value || []);
    });
  }, [isOpen, candidate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joiningDate) {
      toast.error('Joining date is required.');
      return;
    }
    setIsSaving(true);
    try {
      const res = await pipelineApi.hire(candidate._id, {
        departmentId: departmentId || undefined,
        designationId: designationId || undefined,
        locationId: locationId || undefined,
        employmentType,
        joiningDate,
      });
      toast.success(`${candidate.fullName} hired as ${res.employeeCode}!`, 'Onboarding Dispatched');
      onSaved(res.employeeCode);
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not hire candidate.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Hire — ${candidate.fullName}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-md bg-emerald-50 px-3 py-2 text-[11px] font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          Creates the employee file + login and dispatches the welcome email. Cannot be undone.
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Department"
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            placeholder="Select…"
            options={departments.map((d) => ({ value: d._id, label: `${d.name} (${d.code})` }))}
          />
          <SelectField
            label="Designation"
            value={designationId}
            onChange={(e) => setDesignationId(e.target.value)}
            placeholder="Select…"
            options={designations.map((d) => ({ value: d._id, label: `${d.title} (Grade ${d.grade})` }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Location"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            placeholder="Select…"
            options={locations.map((l) => ({ value: l._id, label: `${l.name} (${l.city})` }))}
          />
          <SelectField
            label="Employment Type"
            value={employmentType}
            onChange={(e) => setEmploymentType(e.target.value)}
            options={EMPLOYMENT_TYPE_OPTIONS.map((t) => ({ value: t.value, label: t.label }))}
          />
        </div>
        <Input label="Joining Date" required type="date" value={joiningDate} onChange={(e) => setJoiningDate(e.target.value)} />
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">
            {isSaving ? 'Hiring…' : 'Confirm Hire'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
