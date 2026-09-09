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
import {
  AttendanceOverviewCharts,
  type MonthlyRate,
  type EmployeeTypeSummary,
  type TodayKpis,
} from '../components/AttendanceOverviewCharts';
import {
  AttendanceMatrixSheet,
  type SheetEmployee,
} from '../components/AttendanceMatrixSheet';
import { RecordAttendanceModal } from '../components/RecordAttendanceModal';

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function currentYear(): number {
  return new Date().getFullYear();
}

function isHr(userRoles?: string[]) {
  return Boolean(userRoles?.some((r) => ['SUPER_ADMIN', 'HR_ADMIN'].includes(r.toUpperCase())));
}

function canDecide(userRoles?: string[]) {
  return Boolean(userRoles?.some((r) => ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER'].includes(r.toUpperCase())));
}

type AttendanceTab = 'overview' | 'mine' | 'requests' | 'inbox' | 'team' | 'shifts';

export function AttendancePage() {
  const toast = useToast();
  const { user } = useAuth();
  const hr = isHr(user?.roles);
  const decider = canDecide(user?.roles);
  const [tab, setTab] = useState<AttendanceTab>('overview');

  // Overview & Sheet state
  const [year, setYear] = useState(currentYear());
  const [sheetMonth, setSheetMonth] = useState(currentMonth());
  const [monthlyRates, setMonthlyRates] = useState<MonthlyRate[]>([]);
  const [employeeType, setEmployeeType] = useState<EmployeeTypeSummary>({
    total: 0,
    onsite: 0,
    remote: 0,
    hybrid: 0,
    onsitePct: 0,
    remotePct: 0,
    hybridPct: 0,
  });
  const [todayKpis, setTodayKpis] = useState<TodayKpis | undefined>(undefined);
  const [sheetEmployees, setSheetEmployees] = useState<SheetEmployee[]>([]);
  const [daysInMonth, setDaysInMonth] = useState(31);
  const [departments, setDepartments] = useState<Array<{ _id: string; name: string }>>([]);
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  // My tab state
  const [myMonth, setMyMonth] = useState(currentMonth());
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [myRecords, setMyRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [isLoadingMine, setIsLoadingMine] = useState(false);

  // Team tab state
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState('');
  const [teamRecords, setTeamRecords] = useState<AttendanceRecord[]>([]);
  const [isLoadingTeam, setIsLoadingTeam] = useState(false);

  // Load Overview Data (Annual Stacked Bar Rates + Donut + KPIs)
  const loadOverview = useCallback(async () => {
    setIsLoadingOverview(true);
    try {
      const [overviewData, sheetData] = await Promise.all([
        attendanceApi.overview(year),
        attendanceApi.sheet(sheetMonth),
      ]);

      if (overviewData) {
        setMonthlyRates(overviewData.attendanceRate || overviewData.monthlyRates || []);
        const et = overviewData.employeeTypes || overviewData.employeeType;
        if (et) {
          const tot = et.total || (et.onsite + et.remote + et.hybrid) || 1;
          setEmployeeType({
            total: et.total || (et.onsite + et.remote + et.hybrid) || 0,
            onsite: et.onsite || 0,
            remote: et.remote || 0,
            hybrid: et.hybrid || 0,
            onsitePct: Math.round(((et.onsite || 0) / tot) * 100),
            remotePct: Math.round(((et.remote || 0) / tot) * 100),
            hybridPct: Math.round(((et.hybrid || 0) / tot) * 100),
          });
        }
        const k = overviewData.kpis || overviewData.todayKpis;
        if (k) {
          setTodayKpis({
            totalEmployees: k.totalEmployees || 0,
            presentCount: k.presentToday ?? k.presentCount ?? 0,
            presentPct: k.presentRate ?? k.presentPct ?? 0,
            lateCount: k.lateToday ?? k.lateCount ?? 0,
            absentCount: k.absentToday ?? k.absentCount ?? 0,
            onLeaveCount: k.onLeaveToday ?? k.onLeaveCount ?? 0,
            avgWorkHours: k.avgWorkHours ?? 8.0,
          });
        }
      }

      if (sheetData) {
        setDaysInMonth(sheetData.daysInMonth || 30);
        setDepartments(sheetData.departments || []);
        if (Array.isArray(sheetData.rows)) {
          setSheetEmployees(
            sheetData.rows.map((r: any) => ({
              employeeId: r.employee?._id || r.employeeId,
              employeeCode: r.employee?.employeeCode || r.employeeCode,
              name: r.employee?.displayName || `${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`.trim() || r.name,
              avatarUrl: r.employee?.avatarUrl || r.avatarUrl,
              department: r.employee?.department || r.department,
              designation: r.employee?.designation || r.designation,
              workType: r.employee?.workType || r.workType,
              leaveDaysCount: r.summary?.leaveDays ?? r.leaveDaysCount ?? 0,
              halfDaysCount: r.summary?.halfDays ?? r.halfDaysCount ?? 0,
              days: r.days || {},
            }))
          );
        } else if (Array.isArray(sheetData.employees)) {
          setSheetEmployees(sheetData.employees);
        }
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not load attendance overview data.');
    } finally {
      setIsLoadingOverview(false);
    }
  }, [year, sheetMonth, toast]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  // Load My Personal Tab Data
  const loadMine = useCallback(async () => {
    setIsLoadingMine(true);
    try {
      const [today, mine] = await Promise.all([attendanceApi.today(), attendanceApi.myRecords(myMonth)]);
      setTodayRecord(today?.record ?? null);
      setMyRecords(mine?.records ?? []);
      setSummary(mine?.summary ?? null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not load personal attendance.');
    } finally {
      setIsLoadingMine(false);
    }
  }, [myMonth, toast]);

  useEffect(() => {
    if (tab === 'mine') {
      loadMine();
    }
  }, [tab, loadMine]);

  // Load Team Tab Data
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
    if (tab === 'team' && hr) {
      loadTeam();
    }
  }, [tab, hr, loadTeam]);

  // Handle Manual Attendance Submit
  const handleSaveManualAttendance = async (payload: {
    employeeId: string;
    date: string;
    checkIn: string;
    checkOut?: string;
    status?: string;
    note?: string;
  }) => {
    await attendanceApi.recordManual(payload);
    toast.success('Attendance punch recorded successfully.');
    loadOverview();
    if (tab === 'mine') loadMine();
    if (tab === 'team') loadTeam();
  };

  const filteredTeam = search.trim()
    ? teamRecords.filter((r) => {
        const q = search.trim().toLowerCase();
        return `${r.employee?.displayName || ''} ${r.employee?.employeeCode || ''}`.toLowerCase().includes(q);
      })
    : teamRecords;

  return (
    <div className="w-full space-y-4">
      {/* Page Header */}
      <PageHeader
        title="Attendance Management"
        description="Monitor daily attendance rates, work arrangements, 31-day sheets, punches, and regularization."
      />

      {/* Tabs */}
      <SegmentedTabs<AttendanceTab>
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'overview', label: 'Attendance Dashboard' },
          { id: 'mine', label: 'My Punch & History' },
          { id: 'requests', label: 'My Requests' },
          ...(decider ? [{ id: 'inbox' as const, label: 'Requests Inbox' }] : []),
          ...(hr ? [{ id: 'team' as const, label: 'Team Log' }] : []),
          ...(hr ? [{ id: 'shifts' as const, label: 'Shifts & Policy' }] : []),
        ]}
      />

      {/* Tab 1: Overview & 31-Day Matrix Sheet (Design Matching Uploaded Screenshot) */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {isLoadingOverview ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800">
              <Spinner size="lg" variant="violet" />
              <p className="mt-3 text-xs text-slate-400">Loading attendance rates and matrix...</p>
            </div>
          ) : (
            <>
              {/* Top Cards: Attendance Rate stacked bars + Employee Type Donut + KPIs */}
              <AttendanceOverviewCharts
                monthlyRates={monthlyRates}
                employeeType={employeeType}
                todayKpis={todayKpis}
                year={year}
                onYearChange={setYear}
                onDownloadReport={() => {
                  toast.success('Generated annual overview data.');
                }}
              />

              {/* Bottom Card: 31-Day Employee Attendance Sheet with Day Badges & Search */}
              <AttendanceMatrixSheet
                employees={sheetEmployees}
                daysInMonth={daysInMonth}
                month={sheetMonth}
                departments={departments}
                onMonthChange={setSheetMonth}
                onRecordManualClick={hr ? () => setIsRecordModalOpen(true) : undefined}
                isLoading={isLoadingOverview}
              />
            </>
          )}
        </div>
      )}

      {/* Tab 2: My Personal Punch & History */}
      {tab === 'mine' && (
        <div className="space-y-4">
          {isLoadingMine ? (
            <div className="flex items-center justify-center py-16 bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800">
              <Spinner size="lg" variant="violet" />
            </div>
          ) : (
            <>
              <CheckInOutCard record={todayRecord} onChanged={() => { loadMine(); loadOverview(); }} />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    icon: CalendarCheck,
                    label: `Logged Days · ${myMonth}`,
                    value: summary?.days ?? 0,
                    tint: 'from-blue-600 to-indigo-600',
                  },
                  {
                    icon: Clock3,
                    label: 'Present Days',
                    value: summary?.present ?? 0,
                    tint: 'from-emerald-500 to-teal-600',
                  },
                  {
                    icon: Users,
                    label: 'Total Hours Worked',
                    value: `${summary?.totalHours ?? 0} hrs`,
                    tint: 'from-cyan-500 to-sky-600',
                  },
                ].map((c) => (
                  <div
                    key={c.label}
                    className="flex items-center gap-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5"
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gradient-to-br text-white ${c.tint}`}
                    >
                      <c.icon className="h-5 w-5" />
                    </span>
                    <div>
                      <span className="block text-xl leading-none font-bold text-slate-800 dark:text-slate-100">
                        {c.value}
                      </span>
                      <span className="mt-1 block text-[10px] tracking-wide text-slate-400 dark:text-slate-500 uppercase font-semibold">
                        {c.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase">Month:</span>
                <input
                  type="month"
                  value={myMonth}
                  max={currentMonth()}
                  onChange={(e) => setMyMonth(e.target.value)}
                  className="cursor-pointer rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
                />
              </div>

              <MyAttendanceTable records={myRecords} />
            </>
          )}
        </div>
      )}

      {/* Tab 3: My Requests / Regularization */}
      {tab === 'requests' && (
        <MyRegularizations
          myRecords={myRecords}
          onChanged={() => {
            loadMine();
            loadOverview();
          }}
        />
      )}

      {/* Tab 4: Requests Inbox (Deciders/Managers) */}
      {tab === 'inbox' && decider && <RegularizationInbox onChanged={() => { loadMine(); loadOverview(); }} />}

      {/* Tab 5: Team Log (Date range search) */}
      {tab === 'team' && hr && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
            <label className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              From:
              <input
                type="date"
                value={from}
                max={to}
                onChange={(e) => setFrom(e.target.value)}
                className="ml-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              />
            </label>
            <label className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              To:
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="ml-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              />
            </label>
            <div className="w-52">
              <SearchInput value={search} onChange={setSearch} onClear={() => setSearch('')} placeholder="Search employee..." />
            </div>
            <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 ml-auto">
              {filteredTeam.length} records
            </span>
          </div>

          {isLoadingTeam ? (
            <div className="flex items-center justify-center py-16 bg-white dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800">
              <Spinner size="lg" variant="violet" />
            </div>
          ) : (
            <TeamAttendanceTable records={filteredTeam} />
          )}
        </div>
      )}

      {/* Tab 6: Shifts */}
      {tab === 'shifts' && hr && <ShiftManager />}

      {/* Manual Attendance Punch Modal for HR */}
      {isRecordModalOpen && (
        <RecordAttendanceModal
          isOpen={isRecordModalOpen}
          onClose={() => setIsRecordModalOpen(false)}
          employees={sheetEmployees}
          onSave={handleSaveManualAttendance}
        />
      )}
    </div>
  );
}

export default AttendancePage;
