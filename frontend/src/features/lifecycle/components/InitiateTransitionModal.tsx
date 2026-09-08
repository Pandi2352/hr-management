import React, { useState, useEffect } from 'react';
import { X, TrendingUp } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { organizationApi } from '../../organization/api/organization.api';
import { employeesApi } from '../../employees/api/employees.api';
import type { Department, Designation } from '../../organization/types/organization.types';
import type { Employee } from '../../employees/types/employees.types';
import type { CreateTransitionPayload } from '../types/lifecycle.types';

interface InitiateTransitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateTransitionPayload) => Promise<void>;
  isSubmitting: boolean;
}

export const InitiateTransitionModal: React.FC<InitiateTransitionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [type, setType] = useState<'PROMOTION' | 'DEPARTMENT_TRANSFER' | 'MANAGER_CHANGE' | 'CONFIRMATION' | 'COMPENSATION_REVISION'>('PROMOTION');
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [title, setTitle] = useState('');
  const [justification, setJustification] = useState('');
  const [newDepartmentId, setNewDepartmentId] = useState('');
  const [newDesignationId, setNewDesignationId] = useState('');
  const [newManagerId, setNewManagerId] = useState('');

  useEffect(() => {
    if (isOpen) {
      employeesApi.getEmployees({ page: 1, pageSize: 100 }).then((res) => {
        setEmployees(res.data || []);
      }).catch(() => setEmployees([]));

      organizationApi.getDepartments().then((res) => {
        setDepartments(Array.isArray(res) ? res : []);
      }).catch(() => setDepartments([]));

      organizationApi.getDesignations().then((res) => {
        setDesignations(Array.isArray(res) ? res : []);
      }).catch(() => setDesignations([]));
    }
  }, [isOpen]);

  const selectedEmployee = employees.find((e) => e._id === selectedEmployeeId);

  useEffect(() => {
    if (selectedEmployee) {
      if (type === 'PROMOTION') {
        setTitle(`Promoted ${selectedEmployee.displayName || selectedEmployee.firstName}`);
      } else if (type === 'DEPARTMENT_TRANSFER') {
        setTitle(`Department Transfer for ${selectedEmployee.displayName || selectedEmployee.firstName}`);
      } else if (type === 'MANAGER_CHANGE') {
        setTitle(`Reporting Manager Reassignment for ${selectedEmployee.displayName || selectedEmployee.firstName}`);
      }
    }
  }, [selectedEmployee, type]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) return;

    await onSubmit({
      employeeId: selectedEmployeeId,
      type,
      effectiveDate,
      title: title.trim() || `${type} Transition`,
      justification: justification.trim(),
      newDepartmentId: newDepartmentId || undefined,
      newDesignationId: newDesignationId || undefined,
      newManagerId: newManagerId || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 my-8 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Initiate Lifecycle Transition
              </h2>
              <p className="text-[11px] text-slate-500">Record a promotion, department transfer, or manager realignment</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Employee Picker */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-800 dark:text-slate-200">Select Employee</label>
            <select
              required
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            >
              <option value="">-- Choose Employee --</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.displayName || `${emp.firstName} ${emp.lastName}`} ({emp.employeeCode}) • {emp.department?.name || 'General'}
                </option>
              ))}
            </select>
          </div>

          {/* Transition Type */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-800 dark:text-slate-200">Transition Type</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType('PROMOTION')}
                className={`py-2 px-3 rounded-md border text-center font-semibold cursor-pointer ${
                  type === 'PROMOTION'
                    ? 'border-purple-600 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                Promotion
              </button>
              <button
                type="button"
                onClick={() => setType('DEPARTMENT_TRANSFER')}
                className={`py-2 px-3 rounded-md border text-center font-semibold cursor-pointer ${
                  type === 'DEPARTMENT_TRANSFER'
                    ? 'border-teal-600 bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                Transfer
              </button>
              <button
                type="button"
                onClick={() => setType('MANAGER_CHANGE')}
                className={`py-2 px-3 rounded-md border text-center font-semibold cursor-pointer ${
                  type === 'MANAGER_CHANGE'
                    ? 'border-amber-600 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                Manager Change
              </button>
            </div>
          </div>

          {/* Action Title & Effective Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-slate-800 dark:text-slate-200">Transition Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Promoted to Lead Designer"
                className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-slate-800 dark:text-slate-200">Effective Date</label>
              <input
                type="date"
                required
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          {/* Target Department / Designation / Manager Changes */}
          <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              Updated Organizational Mapping
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500">New Designation / Role</label>
                <select
                  value={newDesignationId}
                  onChange={(e) => setNewDesignationId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                >
                  <option value="">Keep current designation</option>
                  {designations.map((desg) => (
                    <option key={desg._id} value={desg._id}>
                      {desg.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-500">New Department</label>
                <select
                  value={newDepartmentId}
                  onChange={(e) => setNewDepartmentId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                >
                  <option value="">Keep current department</option>
                  {departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-500">New Reporting Manager</label>
              <select
                value={newManagerId}
                onChange={(e) => setNewManagerId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
              >
                <option value="">Keep current reporting line</option>
                {employees
                  .filter((e) => e._id !== selectedEmployeeId)
                  .map((mgr) => (
                    <option key={mgr._id} value={mgr._id}>
                      {mgr.displayName || `${mgr.firstName} ${mgr.lastName}`} ({mgr.employeeCode})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Justification / Notes */}
          <div className="space-y-1">
            <label className="font-semibold text-slate-800 dark:text-slate-200">Justification & Appraisal Notes</label>
            <textarea
              rows={2}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Reason for change, appraisal rating, or business restructuring justification..."
              className="w-full px-3 py-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" disabled={isSubmitting || !selectedEmployeeId}>
              {isSubmitting ? 'Submitting...' : 'Apply Transition'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
