import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  Calendar,
  CheckCircle2,
  Search,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import type { Quiz } from '../types/quiz.types';
import { quizApi } from '../api/quiz.api';
import { employeesApi } from '../../employees/api/employees.api';
import type { Employee } from '../../employees/types/employees.types';
import { useToast } from '../../../components/ui/toast';

interface AssignQuizModalProps {
  quiz: Quiz;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AssignQuizModal: React.FC<AssignQuizModalProps> = ({
  quiz,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const toast = useToast();
  const [isAllEmployees, setIsAllEmployees] = useState<boolean>(true);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<string>('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoadingEmployees, setIsLoadingEmployees] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setIsAllEmployees(true);
      setSelectedEmployeeIds([]);
      setDueDate('');
      setSearchQuery('');
      loadEmployees();
    }
  }, [isOpen]);

  const loadEmployees = async () => {
    try {
      setIsLoadingEmployees(true);
      const res = await employeesApi.getEmployees({ pageSize: 150 });
      setEmployees(res.data || []);
    } catch {
      // silently handle fallback
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  if (!isOpen) return null;

  const filteredEmployees = employees.filter((emp) => {
    const name = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
    const email = (emp.workEmail || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  const toggleEmployee = (empId: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  const handleSelectAllFiltered = () => {
    const ids = filteredEmployees.map((e) => e._id || (e as any).id);
    setSelectedEmployeeIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const handleDeselectAll = () => {
    setSelectedEmployeeIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllEmployees && selectedEmployeeIds.length === 0) {
      toast.warning('Please select at least one employee or toggle "Assign to All"');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await quizApi.assignQuiz(quiz._id, {
        assignAll: isAllEmployees,
        employeeIds: isAllEmployees ? undefined : selectedEmployeeIds,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      });

      toast.success(
        `Successfully assigned quiz to ${res.assignedCount} employee${res.assignedCount === 1 ? '' : 's'}!`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to assign quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-surface border border-hairline rounded-md shadow-none flex flex-col my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-hairline bg-surface-hover/30">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Assign Quiz</h2>
              <p className="text-xs text-muted-foreground line-clamp-1">{quiz.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Target Audience Toggle */}
          <div className="space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Target Audience
            </label>

            {/* Bulk Assign to All Employees Option */}
            <div
              onClick={() => setIsAllEmployees(true)}
              className={`flex items-start gap-3.5 p-4 rounded-md border cursor-pointer transition-all ${
                isAllEmployees
                  ? 'border-brand-500/50 bg-brand-500/5 ring-1 ring-brand-500/20'
                  : 'border-hairline bg-surface-hover/20 hover:border-border'
              }`}
            >
              <div
                className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
                  isAllEmployees ? 'border-brand-500 bg-brand-500' : 'border-muted-foreground/50'
                }`}
              >
                {isAllEmployees && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    Assign to All Employees (Company-Wide)
                  </span>
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-400 rounded-md border border-brand-500/20">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Instantly challenge every active member in the organization to boost team knowledge & XP.
                </p>
              </div>
            </div>

            {/* Specific Employees Option */}
            <div
              onClick={() => setIsAllEmployees(false)}
              className={`flex items-start gap-3.5 p-4 rounded-md border cursor-pointer transition-all ${
                !isAllEmployees
                  ? 'border-brand-500/50 bg-brand-500/5 ring-1 ring-brand-500/20'
                  : 'border-hairline bg-surface-hover/20 hover:border-border'
              }`}
            >
              <div
                className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
                  !isAllEmployees ? 'border-brand-500 bg-brand-500' : 'border-muted-foreground/50'
                }`}
              >
                {!isAllEmployees && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium text-foreground">Select Specific Employees</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pick specific individuals or targeted department members.
                </p>
              </div>
            </div>
          </div>

          {/* Employee Selector List (when not all employees) */}
          {!isAllEmployees && (
            <div className="p-4 rounded-md border border-hairline bg-surface-hover/10 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search employees by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-surface border border-hairline rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="px-2 py-1 text-xs text-brand-600 hover:text-brand-500 font-medium"
                  >
                    Select All ({filteredEmployees.length})
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground font-medium"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Badges / Chips for selected count */}
              <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-brand-500" />
                <span>
                  {selectedEmployeeIds.length} employee{selectedEmployeeIds.length === 1 ? '' : 's'} selected
                </span>
              </div>

              {/* Employee Scroll list */}
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 border border-hairline rounded-md p-1.5 bg-surface">
                {isLoadingEmployees ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">Loading employees...</div>
                ) : filteredEmployees.length === 0 ? (
                  <div className="py-6 text-center text-xs text-muted-foreground">No employees found.</div>
                ) : (
                  filteredEmployees.map((emp) => {
                    const empId = emp._id || (emp as any).id;
                    const isSelected = selectedEmployeeIds.includes(empId);
                    return (
                      <div
                        key={empId}
                        onClick={() => toggleEmployee(empId)}
                        className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-brand-500/10 border border-brand-500/30'
                            : 'hover:bg-surface-hover/50 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {emp.avatarUrl ? (
                            <img
                              src={emp.avatarUrl}
                              alt=""
                              className="w-6 h-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-brand-500/15 text-brand-600 flex items-center justify-center text-[10px] font-bold">
                              {emp.firstName?.[0] || 'U'}
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-medium text-foreground">
                              {emp.firstName} {emp.lastName}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{emp.workEmail}</p>
                          </div>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                            isSelected ? 'bg-brand-500 border-brand-500 text-white' : 'border-hairline'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Due Date Option */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              Completion Deadline (Optional)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 text-xs bg-surface border border-hairline rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <p className="text-[11px] text-muted-foreground">
              Employees will see countdown indicators on their Challenge Arena.
            </p>
          </div>

          {/* XP & Rewards preview banner */}
          <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-md flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium text-foreground">Completion Reward:</span>
            </div>
            <span className="text-xs font-bold text-amber-500">+{quiz.xpReward} XP Base Points</span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface-hover rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 rounded-md transition-all shadow-none flex items-center gap-2"
            >
              {isSubmitting ? 'Assigning...' : 'Confirm & Publish Challenge'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
