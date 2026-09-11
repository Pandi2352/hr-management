import React, { useState, useEffect, useMemo } from 'react';
import { X, Users, UserCheck, Building2, Check } from 'lucide-react';
import type { Quiz } from '../types/quiz.types';
import { quizApi } from '../api/quiz.api';
import { employeesApi } from '../../employees/api/employees.api';
import type { Employee } from '../../employees/types/employees.types';
import { Button, SearchInput, Avatar, SegmentedTabs } from '../../../components/ui';
import { FormField } from '../../../components/ui/FormField';
import { Input } from '../../../components/ui/Input';
import { useToast } from '../../../components/ui/toast';
import { cn } from '../../../utils/cn';

interface AssignQuizModalProps {
  quiz: Quiz;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Audience = 'ALL' | 'PICK';

/** The server's hard ceiling for one page of employees. */
const ROSTER_PAGE_SIZE = 100;
/** Enough for 1,000 people; a guard against a page cursor that never ends. */
const MAX_ROSTER_PAGES = 10;

const employeeId = (emp: Employee) => emp._id || (emp as any).id;
const employeeName = (emp: Employee) => `${emp.firstName || ''} ${emp.lastName || ''}`.trim();

/**
 * Who gets this quiz.
 *
 * Fixed size rather than a panel that grows with the roster: the footer stays
 * where it was when the list was short, so the confirm button never walks off
 * the bottom of a long company. The two audiences are one control rather than
 * a pair of radio cards, because they are a choice between two things, not two
 * independent settings.
 */
export const AssignQuizModal: React.FC<AssignQuizModalProps> = ({
  quiz,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const toast = useToast();
  const [audience, setAudience] = useState<Audience>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState<string>('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [isLoadingEmployees, setIsLoadingEmployees] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;

    setAudience('ALL');
    setSelectedIds([]);
    setDueDate('');
    setSearch('');
    setDepartment('');

    (async () => {
      try {
        setIsLoadingEmployees(true);

        /*
         * Paged, because the server refuses a page larger than 100.
         *
         * This list used to ask for 150 in one go, which failed validation and
         * came back empty — so "choose specific people" showed an empty roster
         * and looked like the company had no employees. Walking the pages is
         * both correct and honest about the limit. The cap stops a runaway if a
         * server ever reports hasNextPage forever.
         */
        const collected: Employee[] = [];
        for (let page = 1; page <= MAX_ROSTER_PAGES; page += 1) {
          const res = await employeesApi.getEmployees({ page, pageSize: ROSTER_PAGE_SIZE });
          collected.push(...(res.data || []));
          if (!res.meta?.hasNextPage) break;
        }
        setEmployees(collected);
      } catch {
        toast.error('Could not load the employee list.');
      } finally {
        setIsLoadingEmployees(false);
      }
    })();
    // The toast helper is stable for the life of the provider.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const departments = useMemo(() => {
    const names = new Set<string>();
    employees.forEach((e) => {
      if (e.departmentName) names.add(e.departmentName);
    });
    return Array.from(names).sort();
  }, [employees]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((emp) => {
      if (department && emp.departmentName !== department) return false;
      if (!q) return true;
      return (
        employeeName(emp).toLowerCase().includes(q) ||
        (emp.workEmail || '').toLowerCase().includes(q)
      );
    });
  }, [employees, search, department]);

  if (!isOpen) return null;

  const toggle = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const selectAllShown = () =>
    setSelectedIds((prev) => Array.from(new Set([...prev, ...filtered.map(employeeId)])));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (audience === 'PICK' && selectedIds.length === 0) {
      toast.warning('Pick at least one person, or assign to everybody.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await quizApi.assignQuiz(quiz._id, {
        assignAll: audience === 'ALL',
        employeeIds: audience === 'ALL' ? undefined : selectedIds,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      });

      toast.success(
        `Assigned to ${res.assignedCount} ${res.assignedCount === 1 ? 'person' : 'people'}.`,
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not assign this quiz.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const recipients = audience === 'ALL' ? employees.length : selectedIds.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={onClose} />

      <form
        onSubmit={handleSubmit}
        className="relative z-10 flex h-[640px] max-h-[92vh] w-[760px] max-w-[96vw] flex-col overflow-hidden rounded-md border border-hairline bg-surface"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-hairline px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink">Assign this quiz</h2>
            <p className="mt-0.5 line-clamp-1 text-xs text-ink-3">
              {quiz.title} · {quiz.questions?.length || 0} questions ·{' '}
              {quiz.timeLimitMinutes || 0} min · pass {quiz.passingScorePct}%
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-md p-1 text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="shrink-0 border-b border-hairline px-5 py-3">
          <SegmentedTabs
            active={audience}
            onChange={(id) => setAudience(id as Audience)}
            tabs={[
              { id: 'ALL', label: 'Everyone', count: employees.length },
              { id: 'PICK', label: 'Choose people', count: selectedIds.length },
            ]}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {audience === 'ALL' ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Users className="mb-3 h-8 w-8 text-ink-3 opacity-60" />
              <h3 className="text-sm font-semibold text-ink">
                Going to every active employee
              </h3>
              <p className="mt-1 max-w-sm text-xs text-ink-3">
                {isLoadingEmployees
                  ? 'Counting the roster…'
                  : `${employees.length} people will see this in their arena. Anyone who already has it keeps their existing attempt.`}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setAudience('PICK')}
                className="mt-4"
              >
                Choose specific people instead
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Search by name or work email"
                  wrapperClassName="min-w-[220px] flex-1"
                />

                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="cursor-pointer rounded-md border border-hairline bg-surface px-2.5 py-2 text-xs text-ink focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--primary-ring)]"
                >
                  <option value="">All departments</option>
                  {departments.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[11px] text-ink-3">
                  <UserCheck className="h-3.5 w-3.5" />
                  {selectedIds.length} selected · {filtered.length} shown
                </span>

                <div className="flex items-center gap-1.5">
                  <Button type="button" size="sm" variant="ghost" onClick={selectAllShown}>
                    Select all shown
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedIds([])}
                    disabled={selectedIds.length === 0}
                  >
                    Clear
                  </Button>
                </div>
              </div>

              <div className="overflow-hidden rounded-md border border-hairline">
                {isLoadingEmployees ? (
                  <div className="py-12 text-center text-xs text-ink-3">Loading employees…</div>
                ) : filtered.length === 0 ? (
                  <div className="py-12 text-center text-xs text-ink-3">
                    Nobody matches that search.
                  </div>
                ) : (
                  filtered.map((emp, i) => {
                    const id = employeeId(emp);
                    const isSelected = selectedIds.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggle(id)}
                        aria-pressed={isSelected}
                        className={cn(
                          'flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition-colors',
                          i > 0 && 'border-t border-hairline',
                          isSelected ? 'bg-surface-2' : 'hover:bg-surface-2/50',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-4 w-4 shrink-0 items-center justify-center rounded-md border',
                            isSelected
                              ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                              : 'border-hairline',
                          )}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </span>

                        <Avatar src={emp.avatarUrl} name={employeeName(emp)} size="sm" />

                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium text-ink">
                            {employeeName(emp) || 'Unnamed'}
                          </span>
                          <span className="block truncate text-[10.5px] text-ink-3">
                            {emp.workEmail}
                          </span>
                        </span>

                        {emp.departmentName && (
                          <span className="hidden shrink-0 items-center gap-1 text-[10.5px] text-ink-3 sm:flex">
                            <Building2 className="h-3 w-3" />
                            {emp.departmentName}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 space-y-3 border-t border-hairline px-5 py-3.5">
          <FormField
            label="Deadline (optional)"
            helperText="People see a countdown against this date in their arena."
          >
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="cursor-pointer"
            />
          </FormField>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-ink-3">
              {recipients} {recipients === 1 ? 'person' : 'people'} · +{quiz.xpReward} XP on
              completion
            </span>

            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={isSubmitting} disabled={isSubmitting}>
                {isSubmitting ? 'Assigning…' : 'Assign quiz'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
