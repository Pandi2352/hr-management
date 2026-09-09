import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CalendarPlus, Pencil, Power, Trash2 } from 'lucide-react';
import { PageHeader } from '../../../components/common/PageHeader';
import { Button, SearchInput, SelectField } from '../../../components/ui';
import { ConfirmDialog } from '../../../components/overlay/ConfirmDialog';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/toast';
import { holidaysApi } from '../api/holidays.api';
import type { Holiday, HolidayCalendar } from '../types/holidays.types';
import { HolidayYearSelect } from '../components/HolidayYearSelect';
import { HolidayTypeTabs, type HolidayTab } from '../components/HolidayTypeTabs';
import { HolidayTable } from '../components/HolidayTable';
import { HolidayFormDrawer } from '../components/HolidayFormDrawer';
import { CalendarSettingsCard } from '../components/CalendarSettingsCard';

export function HolidaysManagePage() {
  const toast = useToast();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [tab, setTab] = useState<HolidayTab>('FIXED');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [calendar, setCalendar] = useState<HolidayCalendar | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Holiday | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Holiday | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [list, cal] = await Promise.all([
        holidaysApi.getHolidays({ year }),
        holidaysApi.getCalendar(year),
      ]);
      setHolidays(list);
      setCalendar(cal);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not load holidays.');
    } finally {
      setIsLoading(false);
    }
  }, [year, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = holidays.filter((h) => {
    if (h.type !== tab) return false;
    if (status !== 'ALL' && h.status !== status) return false;
    if (search.trim() && !h.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });
  const fixedCount = holidays.filter((h) => h.type === 'FIXED').length;
  const restrictedCount = holidays.filter((h) => h.type === 'RESTRICTED').length;

  const handleToggle = async (h: Holiday) => {
    try {
      await holidaysApi.toggleHolidayStatus(h._id);
      toast.success(`"${h.name}" marked as ${h.status === 'ACTIVE' ? 'inactive' : 'active'}.`);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not update status.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await holidaysApi.deleteHoliday(deleteTarget._id);
      toast.success(`"${deleteTarget.name}" removed.`);
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not delete holiday.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <PageHeader
        title="Manage Holidays"
        description="Add fixed and restricted holidays per calendar year. Employees see published lists instantly."
        leading={
          <Link
            to="/holidays"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
            title="Back to holiday calendar"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        }
        actions={
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setDrawerOpen(true);
            }}
            className="flex items-center gap-1.5"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            Add Holiday
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <HolidayYearSelect year={year} onChange={setYear} />
          <p className="mt-0.5 text-xs text-slate-500">
            You can see list of holidays in calendar year.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-52">
            <SearchInput
              value={search}
              onChange={setSearch}
              onClear={() => setSearch('')}
              placeholder="Search holidays…"
            />
          </div>
          <div className="w-36">
            <SelectField
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: 'ALL', label: 'All statuses' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'INACTIVE', label: 'Inactive' },
              ]}
            />
          </div>
        </div>
      </div>

      {calendar && <CalendarSettingsCard calendar={calendar} onUpdated={setCalendar} />}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" variant="violet" />
        </div>
      ) : (
        <>
          <HolidayTypeTabs
            active={tab}
            fixedCount={fixedCount}
            restrictedCount={restrictedCount}
            onChange={setTab}
          />
          <HolidayTable
            holidays={visible}
            action={(h) => (
              <span className="inline-flex items-center justify-end gap-1">
                <button
                  type="button"
                  title="Edit"
                  onClick={() => {
                    setEditing(h);
                    setDrawerOpen(true);
                  }}
                  className="cursor-pointer rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title={h.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                  onClick={() => handleToggle(h)}
                  className="cursor-pointer rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                >
                  <Power className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="Delete"
                  onClick={() => setDeleteTarget(h)}
                  className="cursor-pointer rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
          />
        </>
      )}

      <HolidayFormDrawer
        isOpen={drawerOpen}
        editing={editing}
        defaultYear={year}
        onClose={() => setDrawerOpen(false)}
        onSaved={load}
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={`Delete "${deleteTarget?.name}"?`}
        description="Employees will no longer see this holiday. Availed restricted picks for it are cancelled too."
        confirmLabel={isDeleting ? 'Deleting…' : 'Delete Holiday'}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

export default HolidaysManagePage;
