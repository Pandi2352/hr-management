import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Lightbulb } from 'lucide-react';
import { PageHeader } from '../../../components/common/PageHeader';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/toast';
import { useAuth } from '../../auth/context/AuthContext';
import { holidaysApi } from '../api/holidays.api';
import type { HolidayCalendarView } from '../types/holidays.types';
import { HolidayYearSelect } from '../components/HolidayYearSelect';
import { HolidayTypeTabs, type HolidayTab } from '../components/HolidayTypeTabs';
import { HolidayStatsRow } from '../components/HolidayStatsRow';
import { HolidayTable } from '../components/HolidayTable';
import { RestrictedEntitlementBanner } from '../components/RestrictedEntitlementBanner';

function isHr(userRoles?: string[]) {
  return Boolean(
    userRoles?.some((r) => ['SUPER_ADMIN', 'HR_ADMIN'].includes(r.toUpperCase())),
  );
}

export function HolidayCalendarPage() {
  const toast = useToast();
  const { user } = useAuth();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [tab, setTab] = useState<HolidayTab>('FIXED');
  const [view, setView] = useState<HolidayCalendarView | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setView(await holidaysApi.getCalendarView(year));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not load holiday calendar.');
    } finally {
      setIsLoading(false);
    }
  }, [year, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const fixed = useMemo(
    () => (view?.holidays || []).filter((h) => h.type === 'FIXED'),
    [view],
  );
  const restricted = useMemo(
    () => (view?.holidays || []).filter((h) => h.type === 'RESTRICTED'),
    [view],
  );

  const handleAvail = async (holidayId: string) => {
    setActingId(holidayId);
    try {
      await holidaysApi.availRestrictedHoliday(holidayId);
      toast.success('Restricted holiday availed.');
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not avail this holiday.');
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="w-full space-y-4">
      <PageHeader
        title={<HolidayYearSelect year={year} onChange={setYear} />}
        description="You can see list of holidays in calendar year."
        actions={
          isHr(user?.roles) ? (
            <Link
              to="/holidays/manage"
              className="rounded-md bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-800"
            >
              Manage Holidays
            </Link>
          ) : undefined
        }
      />

      {isLoading || !view ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" variant="violet" />
        </div>
      ) : (
        <>
          <HolidayStatsRow view={view} />

          <HolidayTypeTabs
            active={tab}
            fixedCount={fixed.length}
            restrictedCount={restricted.length}
            onChange={setTab}
          />

          {tab === 'RESTRICTED' && (
            <RestrictedEntitlementBanner entitlement={view.restricted} year={view.year} />
          )}

          {tab === 'FIXED' ? (
            <HolidayTable holidays={fixed} />
          ) : (
            <HolidayTable
              holidays={restricted}
              action={(h) =>
                h.availed ? (
                  <span className="inline-flex items-center rounded-sm bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    Availed
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={actingId === h._id || view.restricted.remaining <= 0}
                    onClick={() => handleAvail(h._id)}
                    className="cursor-pointer rounded-sm border border-teal-700 px-2 py-0.5 text-[11px] font-bold text-teal-700 hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-teal-300 dark:hover:bg-teal-950/40"
                  >
                    {actingId === h._id ? 'Saving…' : 'Avail'}
                  </button>
                )
              }
            />
          )}

          {view.calendar.note && (
            <div className="inline-flex items-center gap-1.5 rounded-sm bg-stone-200/70 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Lightbulb className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" />
              <span>
                Note : <span className="font-bold">{view.calendar.note}</span>
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default HolidayCalendarPage;
