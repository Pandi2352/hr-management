import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Avatar, Button, Modal } from '../../../components/ui';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/toast';
import { employeesApi } from '../api/employees.api';
import type { Employee } from '../types/employees.types';

interface HrOption {
  _id: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  employeeCode: string;
  workEmail?: string;
  avatarUrl?: string | null;
}

/** Quick-assign a reporting HR person without opening the full edit form. */
export function AssignReportingHrModal({
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
  const [search, setSearch] = useState('');
  const [options, setOptions] = useState<HrOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedId, setSelectedId] = useState(employee.hrId || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedId(employee.hrId || '');
    setSearch('');
    setOptions([]);
  }, [isOpen, employee.hrId]);

  useEffect(() => {
    const q = search.trim();
    if (!isOpen || q.length < 2) {
      setOptions([]);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await employeesApi.getEmployees({ search: q, pageSize: 8 });
        setOptions(((res.data || []) as HrOption[]).filter((m) => m._id !== employee._id));
      } catch {
        setOptions([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [search, isOpen, employee._id]);

  const displayName = employee.displayName || `${employee.firstName} ${employee.lastName}`;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await employeesApi.updateEmployee(employee._id, { hrId: selectedId || undefined } as any);
      toast.success(selectedId ? 'Reporting HR assigned.' : 'Reporting HR cleared.');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not assign HR.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Assign Reporting HR — ${displayName}`} className="max-w-md">
      <div className="space-y-3 pt-1">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Day-to-day HR contact for this employee. Shown on their dashboard and profile.
        </p>
        <div className="relative">
          <Search className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search HR by name, code or email (min 2 chars)…"
            className="w-full rounded-md border border-slate-200 bg-white py-2 pr-2 pl-8 text-xs dark:border-slate-700 dark:bg-slate-900"
          />
        </div>

        {isSearching && (
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <Spinner size="xs" variant="muted" /> Searching…
          </div>
        )}

        {options.length > 0 && (
          <div className="max-h-52 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-1.5 dark:border-slate-800">
            {options.map((m) => {
              const name = m.displayName || `${m.firstName} ${m.lastName}`;
              const active = selectedId === m._id;
              return (
                <button
                  key={m._id}
                  type="button"
                  onClick={() => setSelectedId(m._id)}
                  className={`flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors ${
                    active ? 'bg-violet-50 dark:bg-violet-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Avatar src={m.avatarUrl} name={name} size="xs" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold">{name}</span>
                    <span className="block truncate font-mono text-[11px] text-slate-400">
                      {m.employeeCode} · {m.workEmail || ''}
                    </span>
                  </span>
                  {active && <span className="text-[11px] font-bold text-violet-600">✓</span>}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-xs dark:bg-slate-900">
          <span className="text-slate-500">Selected</span>
          <span className="font-semibold">
            {selectedId
              ? options.find((o) => o._id === selectedId)?.displayName ||
                options.find((o) => o._id === selectedId)?.employeeCode ||
                employee.hr?.displayName ||
                'Chosen HR'
              : 'None'}
          </span>
          {selectedId && (
            <button type="button" onClick={() => setSelectedId('')} className="cursor-pointer font-semibold text-rose-500 hover:underline">
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} isLoading={isSaving}>
            Save HR
          </Button>
        </div>
      </div>
    </Modal>
  );
}
