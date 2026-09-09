import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarPlus, Pencil, Search, Sparkles } from 'lucide-react';
import { Avatar, Button, SearchInput, SelectField } from '../../../components/ui';
import { ConfirmDialog } from '../../../components/overlay/ConfirmDialog';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/toast';
import { leaveApi } from '../api/leave.api';
import { employeesApi } from '../../employees/api/employees.api';
import type { LeaveBalance, LeaveType } from '../types/leave-balance.types';
import { AssignBalanceModal, type AssignTarget } from './AssignBalanceModal';
import { DefaultLeavePolicyCard } from './DefaultLeavePolicyCard';

export function TeamLeaveBalances({ year, onYearChange }: { year: number; onYearChange: (y: number) => void }) {
  const toast = useToast();
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null);
  const [seedOpen, setSeedOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  // Employee picker for new assignments
  const [empSearch, setEmpSearch] = useState('');
  const [empOptions, setEmpOptions] = useState<{ _id: string; displayName?: string; firstName: string; lastName: string; employeeCode: string }[]>([]);
  const [isSearchingEmp, setIsSearchingEmp] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [list, types] = await Promise.all([
        leaveApi.listBalances({ year }),
        leaveApi.getLeaveTypes(),
      ]);
      setBalances(list);
      setLeaveTypes(types);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not load leave balances.');
    } finally {
      setIsLoading(false);
    }
  }, [year, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const q = empSearch.trim();
    if (q.length < 2) {
      setEmpOptions([]);
      return;
    }
    setIsSearchingEmp(true);
    const timer = setTimeout(async () => {
      try {
        const res = await employeesApi.getEmployees({ search: q, pageSize: 8 });
        setEmpOptions((res.data || []) as any);
      } catch {
        setEmpOptions([]);
      } finally {
        setIsSearchingEmp(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [empSearch]);

  const visible = useMemo(
    () =>
      balances.filter((b) => {
        if (typeFilter !== 'ALL' && b.leaveTypeId !== typeFilter) return false;
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          const hay = `${b.employee?.displayName || ''} ${b.employee?.employeeCode || ''} ${b.leaveType?.name || ''} ${b.leaveType?.code || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      }),
    [balances, search, typeFilter],
  );

  const totals = useMemo(
    () => ({
      wallets: balances.length,
      allocated: balances.reduce((a, b) => a + (b.allocated || 0), 0),
      available: balances.reduce((a, b) => a + (b.available || 0), 0),
    }),
    [balances],
  );

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      const res = await leaveApi.seedYear(year);
      toast.success(`${res.created} wallets created, ${res.carriedTotal} days carried forward for ${year}.`, 'Year Seeded');
      setSeedOpen(false);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not seed balances.');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-4">
      <DefaultLeavePolicyCard leaveTypes={leaveTypes} year={year} onApplied={load} />

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Wallets', value: totals.wallets },
          { label: 'Days Allocated', value: totals.allocated },
          { label: 'Days Available', value: totals.available },
        ].map((c) => (
          <div key={c.label} className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-lg font-bold text-slate-900 dark:text-white">{c.value}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">{c.label} · {year}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="cursor-pointer rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900"
          >
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <div className="w-52">
            <SearchInput value={search} onChange={setSearch} onClear={() => setSearch('')} placeholder="Employee, code or type…" />
          </div>
          <div className="w-44">
            <SelectField
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All leave types' },
                ...leaveTypes.map((t) => ({ value: t._id, label: `${t.name} (${t.code})` })),
              ]}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setSeedOpen(true)} className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Seed {year}
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <p className="text-[13px] font-bold text-slate-900 dark:text-white">Assign balance to employee</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <div className="relative min-w-64 flex-1">
            <Search className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              value={empSearch}
              onChange={(e) => setEmpSearch(e.target.value)}
              placeholder="Type name, code or email (min 2 chars)…"
              className="w-full rounded-md border border-slate-200 bg-white py-2 pr-2 pl-8 text-xs dark:border-slate-700 dark:bg-slate-900"
            />
            {empOptions.length > 0 && (
              <div className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                {empOptions.map((e) => (
                  <button
                    key={e._id}
                    type="button"
                    onClick={() => {
                      setAssignTarget({
                        employeeId: e._id,
                        employeeName: e.displayName || `${e.firstName} ${e.lastName}`,
                        employeeCode: e.employeeCode,
                      });
                      setAssignOpen(true);
                      setEmpSearch('');
                      setEmpOptions([]);
                    }}
                    className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <span className="font-semibold">{e.displayName || `${e.firstName} ${e.lastName}`}</span>
                    <span className="font-mono text-[11px] text-slate-400">{e.employeeCode}</span>
                  </button>
                ))}
              </div>
            )}
            {isSearchingEmp && <p className="mt-1 text-[11px] text-slate-400">Searching…</p>}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" variant="violet" />
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <CalendarPlus className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          <p className="text-sm font-semibold">No balances for {year} yet</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-400">
            Seed the year to create wallets for everyone, or assign a balance to a single employee above.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 dark:bg-slate-900">
                <th className="px-3 py-2 font-semibold">Employee</th>
                <th className="px-3 py-2 font-semibold">Leave Type</th>
                <th className="px-3 py-2 text-right font-semibold">Allocated</th>
                <th className="px-3 py-2 text-right font-semibold">Carried</th>
                <th className="px-3 py-2 text-right font-semibold">Used</th>
                <th className="px-3 py-2 text-right font-semibold">Available</th>
                <th className="px-3 py-2 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((b) => (
                <tr key={b._id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2">
                      <Avatar src={b.employee?.avatarUrl} name={b.employee?.displayName || '?'} size="xs" />
                      <span>
                        <span className="block font-semibold text-slate-800 dark:text-slate-100">
                          {b.employee?.displayName || '—'}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">{b.employee?.employeeCode}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-semibold">{b.leaveType?.name}</span>{' '}
                    <span className="font-mono text-[11px] text-slate-400">{b.leaveType?.code}</span>
                  </td>
                  <td className="px-3 py-2 text-right">{b.allocated}</td>
                  <td className="px-3 py-2 text-right">{b.carriedForward}</td>
                  <td className="px-3 py-2 text-right">{b.used}</td>
                  <td className="px-3 py-2 text-right font-bold text-emerald-600">{b.available}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      title="Edit balance"
                      onClick={() => {
                        setAssignTarget({
                          employeeId: b.employeeId,
                          employeeName: b.employee?.displayName || '',
                          employeeCode: b.employee?.employeeCode || '',
                          balance: b,
                        });
                        setAssignOpen(true);
                      }}
                      className="cursor-pointer rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AssignBalanceModal
        isOpen={assignOpen}
        target={assignTarget}
        leaveTypes={leaveTypes}
        year={year}
        onClose={() => setAssignOpen(false)}
        onSaved={load}
      />

      <ConfirmDialog
        isOpen={seedOpen}
        title={`Seed leave balances for ${year}?`}
        description={`Creates missing wallets for all active employees from leave-type defaults, carrying forward capped leftovers from ${year - 1}. Existing wallets are never overwritten.`}
        confirmLabel={isSeeding ? 'Seeding…' : `Seed ${year}`}
        variant="primary"
        onConfirm={handleSeed}
        onCancel={() => setSeedOpen(false)}
      />
    </div>
  );
}
