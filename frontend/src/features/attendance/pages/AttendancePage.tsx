import { useCallback, useEffect, useState } from 'react';
import { CalendarCheck, Clock3, Users } from 'lucide-react';
import { PageHeader } from '../../../components/common/PageHeader';
import { SearchInput, SegmentedTabs } from '../../../components/ui';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/toast';
import { useAuth } from '../../auth/context/AuthContext';
import { attendanceApi } from '../api/attendance.api';
import type { AttendanceRecord, AttendanceSummary } from '../types/attendance.types';
import { CheckInOutCard } from '../components/CheckInOutCard';
import { MyAttendanceTable } from '../components/MyAttendanceTable';
import { TeamAttendanceTable } from '../components/TeamAttendanceTable';
import { MyRegularizations } from '../components/MyRegularizations';
import { RegularizationInbox } from '../components/RegularizationInbox';
import { ShiftManager } from '../components/ShiftManager';

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function isHr(userRoles?: string[]) {
  return Boolean(userRoles?.some((r) => ['SUPER_ADMIN', 'HR_ADMIN'].includes(r.toUpperCase())));
}

function canDecide(userRoles?: string[]) {
  return Boolean(userRoles?.some((r) => ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER'].includes(r.toUpperCase())));
}

type AttendanceTab = 'mine' | 'requests' | 'inbox' | 'team' | 'shifts';

export function AttendancePage() {
  const toast = useToast();
  const { user } = useAuth();
  const hr = isHr(user?.roles);
  const decider = canDecide(user?.roles);
  const [tab, setTab] = useState<AttendanceTab>('mine');

  // My tab
  const [month, setMonth] = useState(currentMonth());
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [myRecords, setMyRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [isLoadingMine, setIsLoadingMine] = useState(true);

  // Team tab
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState('');
  const [teamRecords, setTeamRecords] = useState<AttendanceRecord[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);

  const loadMine = useCallback(async () => {
    setIsLoadingMine(true);
    try {
      const [today, mine] = await Promise.all([attendanceApi.today(), attendanceApi.myRecords(month)]);
      setTodayRecord(today.record);
      setMyRecords(mine.records);
      setSummary(mine.summary);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not load attendance.');
    } finally {
      setIsLoadingMine(false);
    }
  }, [month, toast]);

  useEffect(() => {
    loadMine();
  }, [loadMine]);

  const loadTeam = useCallback(async () => {
    setIsLoadingTeam(true);
    try {
      setTeamRecords(await attendanceApi.teamRecords({ from, to }));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not load team attendance.');
    } finally {
      setIsLoadingTeam(false);
    }
  }, [from, to, toast]);

  useEffect(() => {
    if (tab === 'team' && hr) loadTeam();
  }, [tab, hr, loadTeam]);

  const filteredTeam = search.trim()
    ? teamRecords.filter((r) => {
        const q = search.trim().toLowerCase();
        return `${r.employee?.displayName || ''} ${r.employee?.employeeCode || ''}`.toLowerCase().includes(q);
      })
    : teamRecords;

  return (
    <div className="w-full space-y-4">
      <PageHeader title="Attendance" description="Daily check in / out, corrections, shifts and team oversight." />

      <SegmentedTabs<AttendanceTab>
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'mine', label: 'My Attendance' },
          { id: 'requests', label: 'My Requests' },
          ...(decider ? [{ id: 'inbox' as const, label: 'Requests Inbox' }] : []),
          ...(hr ? [{ id: 'team' as const, label: 'Team' }] : []),
          ...(hr ? [{ id: 'shifts' as const, label: 'Shifts' }] : []),
        ]}
      />

      {tab === 'mine' &&
        (isLoadingMine ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" variant="violet" />
          </div>
        ) : (
          <div className="space-y-4">
            <CheckInOutCard record={todayRecord} onChanged={loadMine} />

            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: CalendarCheck, label: `Days · ${month}`, value: summary?.days ?? 0, tint: 'from-teal-500 to-emerald-600' },
                { icon: Clock3, label: 'Present', value: summary?.present ?? 0, tint: 'from-emerald-500 to-teal-600' },
                { icon: Users, label: 'Hours Worked', value: summary?.totalHours ?? 0, tint: 'from-sky-500 to-cyan-600' },
              ].map((c) => (
                <div key={c.label} className="flex items-center gap-3 rounded-md border border-hairline bg-surface p-3">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gradient-to-br text-white ${c.tint}`}>
                    <c.icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-lg leading-none font-bold">{c.value}</span>
                    <span className="mt-1 block text-[10px] tracking-wide text-ink-3 uppercase">{c.label}</span>
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-ink-3 uppercase">Month</span>
              <input
                type="month"
                value={month}
                max={currentMonth()}
                onChange={(e) => setMonth(e.target.value)}
                className="cursor-pointer rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-900"
              />
            </div>

            <MyAttendanceTable records={myRecords} />
          </div>
        ))}

      {tab === 'requests' && <MyRegularizations />}

      {tab === 'inbox' && decider && <RegularizationInbox onChanged={loadMine} />}

      {tab === 'team' && hr && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-ink-3">
              From <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="ml-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900" />
            </label>
            <label className="text-xs text-ink-3">
              To <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="ml-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900" />
            </label>
            <div className="w-52">
              <SearchInput value={search} onChange={setSearch} onClear={() => setSearch('')} placeholder="Employee or code…" />
            </div>
            <span className="rounded-md bg-surface-2 px-2.5 py-1.5 text-[11px] font-semibold text-ink-2">
              {filteredTeam.length} records
            </span>
          </div>
          {isLoadingTeam ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size="lg" variant="violet" />
            </div>
          ) : (
            <TeamAttendanceTable records={filteredTeam} />
          )}
        </div>
      )}

      {tab === 'shifts' && hr && <ShiftManager />}
    </div>
  );
}

export default AttendancePage;
