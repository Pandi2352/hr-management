import { useCallback, useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { employeesApi } from '../employees/api/employees.api';
import { profileApi } from '../profile/api/profile.api';
import { leaveApi } from '../leave/api/leave.api';
import { ApplyLeaveModal } from '../leave/components/ApplyLeaveModal';
import { attendanceApi } from '../attendance/api/attendance.api';
import { CheckInOutCard } from '../attendance/components/CheckInOutCard';
import { Modal } from '../../components/ui/Modal';
import type { AttendanceRecord } from '../attendance/types/attendance.types';
import type { MyLeaveSummary } from '../leave/types/leave-balance.types';
import { useToast } from '../../components/ui/toast';
import type { Employee } from '../employees/types/employees.types';
import { useAuth } from '../auth/context/AuthContext';
import { aiApi } from '../ai/api/ai.api';
import defaultAvatarImg from '../../assets/default_avatar.jpg';
import dashboardHeroLightBg from '../../assets/dashboard_hero_light_bg.jpg';
import dashboardClockLightBg from '../../assets/dashboard_clock_light_bg.jpg';
import dashboardProfileLightBg from '../../assets/dashboard_profile_light_bg.jpg';

// ─── Time helpers ─────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatTime(d: Date) {
  const h = d.getHours();
  const m = d.getMinutes();
  const s = d.getSeconds();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return { time: `${pad(h12)}:${pad(m)}`, secs: pad(s), ampm };
}

// ─── Leave ring gauge ─────────────────────────────────────────────────────────
function LeaveRing({
  used, total, label, color,
}: {
  used: number; total: number; label: string; color: string;
}) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const size = 76;
  const r = 31;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ - (pct / 100) * circ;
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5">
      <div className="relative h-[76px] w-[76px] shrink-0">
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={c} cy={c} r={r} fill="none" strokeWidth={8} stroke={color} opacity={0.15} />
          <circle
            cx={c} cy={c} r={r} fill="none" strokeWidth={8}
            stroke={color}
            strokeDasharray={circ}
            strokeDashoffset={dash}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span className="text-[20px] font-black tabular-nums text-ink">{used}</span>
          <span className="mt-0.5 text-[8px] font-bold tracking-widest text-ink-3 uppercase">left</span>
        </div>
      </div>
      <p className="line-clamp-2 min-h-7 text-center text-[10.5px] leading-snug font-semibold text-ink-2">
        {label}
      </p>
      <span className="rounded-full bg-surface-2 px-1.5 py-px font-mono text-[10px] font-medium text-ink-3">
        of {total}
      </span>
    </div>
  );
}

// ─── Stat chip ────────────────────────────────────────────────────────────────
function InfoChip({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[12px] px-3 py-1.5 rounded-md bg-white/85 dark:bg-slate-800/85 backdrop-blur-md border border-slate-200/80 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-colors shadow-none">
      <span className="text-sm">{icon}</span>
      <span className="text-slate-500 dark:text-slate-400 font-medium">{label}:</span>
      <strong className="text-slate-900 dark:text-white font-bold">{value}</strong>
    </span>
  );
}

// ─── Profile completion ───────────────────────────────────────────────────────
function ProfileCompletionMini({ pct }: { pct: number }) {
  const r = 32;
  const circ = 2 * Math.PI * r;
  const dash = circ - (pct / 100) * circ;
  return (
    <svg width={78} height={78} className="-rotate-90 flex-shrink-0">
      <circle cx={39} cy={39} r={r} fill="none" strokeWidth={6} className="stroke-slate-100 dark:stroke-slate-800" />
      <circle
        cx={39} cy={39} r={r} fill="none" strokeWidth={6}
        stroke="#0d9488"
        strokeDasharray={circ}
        strokeDashoffset={dash}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1.2s ease' }}
      />
    </svg>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function EmployeeDashboard() {
  const { user } = useAuth();
  const toast = useToast();

  // Live employee record (null = no linked employee file yet)
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [userProfile, setUserProfile] = useState<{ phone?: string | null; employeeCode?: string | null; linkedEmployeeId?: string | null } | null>(null);
  const [noEmployeeRecord, setNoEmployeeRecord] = useState(false);
  const [profilePct, setProfilePct] = useState(0);
  const [leaveSummary, setLeaveSummary] = useState<MyLeaveSummary | null>(null);
  const [team, setTeam] = useState<Awaited<ReturnType<typeof employeesApi.getMyTeam>> | null>(null);
  const [loading, setLoading] = useState(true);

  // Live clock with seconds
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Attendance punch (server record for today)
  const [punch, setPunch] = useState<AttendanceRecord | null>(null);
  const [isPunching, setIsPunching] = useState(false);

  // Quick-action shortcuts
  const [applyOpen, setApplyOpen] = useState(false);
  const [raiseAttendanceOpen, setRaiseAttendanceOpen] = useState(false);

  const reloadLeave = useCallback(async () => {
    try {
      setLeaveSummary(await leaveApi.getMyBalances(new Date().getFullYear()));
    } catch {
      // Balances stay as-is on failure
    }
  }, []);

  // AI Assist (AskHR Copilot — live answers from your own HR data)
  const [aiQuery, setAiQuery] = useState('');
  const [aiReplies, setAiReplies] = useState<{ q: string; a: string; provider?: string }[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const aiScrollRef = useRef<HTMLDivElement>(null);

  const handleAiSend = async () => {
    const q = aiQuery.trim();
    if (!q || isAsking) return;
    setAiQuery('');
    setIsAsking(true);
    setAiReplies((prev) => [...prev, { q, a: '…' }]);
    setTimeout(() => aiScrollRef.current?.scrollTo({ top: 9999, behavior: 'smooth' }), 80);
    try {
      const res = await aiApi.ask(q);
      setAiReplies((prev) => {
        const next = [...prev];
        next[next.length - 1] = { q, a: res.answer, provider: res.provider };
        return next;
      });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setAiReplies((prev) => {
        const next = [...prev];
        next[next.length - 1] = { q, a: msg || 'Assistant is unavailable right now. Try again later.' };
        return next;
      });
    } finally {
      setIsAsking(false);
      setTimeout(() => aiScrollRef.current?.scrollTo({ top: 9999, behavior: 'smooth' }), 80);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      employeesApi.getMyProfile(),
      profileApi.getMyProfile(),
      leaveApi.getMyBalances(new Date().getFullYear()),
      employeesApi.getMyTeam(),
      attendanceApi.today(),
    ]).then(([empRes, profRes, leaveRes, teamRes, punchRes]) => {
      if (!active) return;
      if (empRes.status === 'fulfilled' && empRes.value) {
        setEmployee(empRes.value);
        const pct = (empRes.value as Employee).profileCompletion?.percentage ?? 0;
        setProfilePct(pct);
        setNoEmployeeRecord(false);
      } else {
        // No linked employee file (e.g. pure admin login) — dashboard still
        // renders from the authenticated user + user profile.
        setEmployee(null);
        setProfilePct(0);
        setNoEmployeeRecord(true);
      }
      if (profRes.status === 'fulfilled' && profRes.value) {
        setUserProfile(profRes.value as any);
      }
      if (leaveRes.status === 'fulfilled' && leaveRes.value) {
        setLeaveSummary(leaveRes.value);
      }
      if (teamRes.status === 'fulfilled' && teamRes.value) {
        setTeam(teamRes.value);
      }
      if (punchRes.status === 'fulfilled' && punchRes.value) {
        setPunch(punchRes.value.record);
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const handleCheckIn = async () => {
    if (isPunching) return;
    setIsPunching(true);
    try {
      const updated = await attendanceApi.checkIn({});
      setPunch(updated);
      toast.success(`Punched in at ${updated.checkIn}.`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not punch in.');
    } finally {
      setIsPunching(false);
    }
  };

  const handleCheckOut = async () => {
    if (isPunching) return;
    setIsPunching(true);
    try {
      const updated = await attendanceApi.checkOut({});
      setPunch(updated);
      toast.success('Punched out. See you tomorrow!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not punch out.');
    } finally {
      setIsPunching(false);
    }
  };

  const checkedIn = Boolean(punch?.checkIn) && !punch?.checkOut;
  const checkInTime = (() => {
    if (!punch?.checkIn) return null;
    const [h, m] = punch.checkIn.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
  })();

  const elapsedMs = checkedIn && checkInTime ? now.getTime() - checkInTime.getTime() : 0;
  const elapsedH = Math.floor(elapsedMs / 3600000);
  const elapsedM = Math.floor((elapsedMs % 3600000) / 60000);
  const elapsedS = Math.floor((elapsedMs % 60000) / 1000);

  const displayName = employee
    ? `${employee.firstName} ${employee.lastName}`.trim()
    : userProfile && (userProfile as any).name
      ? (userProfile as any).name
      : user ? `${user.firstName} ${user.lastName}`.trim() || user.email : 'Employee';

  const department = employee?.departmentName || (employee as any)?.department?.name || '—';
  const designation = employee?.designationTitle || (employee as any)?.designation?.title || '—';
  const location = employee?.locationName || (employee as any)?.location?.name || '—';
  const joiningDate = employee?.joiningDate
    ? new Date(employee.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
  const workEmail = employee?.workEmail || user?.email || '—';
  const employeeCode = employee?.employeeCode || (userProfile?.employeeCode ?? null) || null;
  const employeeId = employee?._id || user?.linkedEmployeeId || userProfile?.linkedEmployeeId || null;

  const avatarUrl = employee?.avatarUrl || user?.avatarUrl || null;
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  const shiftLabel = employee?.shiftSchedule
    ? `${employee.shiftSchedule.startTime} – ${employee.shiftSchedule.endTime}`
    : '9:00 AM – 6:00 PM';

  const { time, secs, ampm } = formatTime(now);

  // Live leave wallets — ring shows remaining of total entitled.
  const RING_COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#10b981'];
  const leaveBalance = (leaveSummary?.balances || [])
    .filter((b) => (b.allocated || 0) + (b.carriedForward || 0) > 0)
    .slice(0, 4)
    .map((b, idx) => ({
      label: b.leaveType?.name || 'Leave',
      used: b.available,
      total: (b.allocated || 0) + (b.carriedForward || 0),
      color: RING_COLORS[idx % RING_COLORS.length],
    }));
  const pendingLeaveDays = (leaveSummary?.balances || []).reduce((a, b) => a + (b.pending || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[12px] text-ink-3">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">

      {/* ── No linked employee file — still show logged-in user data ────── */}
      {noEmployeeRecord && !loading && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3 dark:border-amber-800/60 dark:bg-amber-950/30">
          <div className="flex-1">
            <p className="text-[13px] font-bold text-amber-900 dark:text-amber-200">
              Signed in as {displayName} ({workEmail})
            </p>
            <p className="text-[12px] text-amber-700 dark:text-amber-300 mt-0.5">
              No employee file is linked to this login yet. Your account details below come from your user profile. Contact HR to link your employee record for full self-service.
            </p>
          </div>
          <Link
            to="/profile"
            className="shrink-0 text-[12px] font-semibold px-3 py-2 rounded-md bg-amber-600 text-white hover:bg-amber-700 transition-colors"
          >
            Go to My Profile
          </Link>
        </div>
      )}

      {/* ── ROW 1: Greeting + Profile Completion (Light Mode Unique Aesthetic) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">

        {/* Greeting banner with light mode 3D ribbon architectural background */}
        <div className="rounded-md border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 relative overflow-hidden shadow-none">
          {/* Light background image & soft daylight overlays */}
          <img
            src={dashboardHeroLightBg}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-right opacity-60 dark:opacity-30 pointer-events-none select-none"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-transparent dark:from-slate-900 dark:via-slate-900/90 pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-3.5 mb-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-md overflow-hidden border-2 border-teal-500/40 bg-teal-50 dark:bg-slate-800 flex-shrink-0">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = defaultAvatarImg; }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center text-white text-base font-bold">
                      {initials}
                    </div>
                  )}
                </div>
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
              </div>
              <div>
                <p className="text-[11.5px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">{getGreeting()},</p>
                <h1 className="text-[23px] font-black text-slate-900 dark:text-white leading-tight tracking-tight flex items-center gap-2">
                  {displayName} <span className="text-xl">👋</span>
                </h1>
              </div>
            </div>
            <p className="text-[12.5px] text-slate-600 dark:text-slate-300 mb-4 font-medium">
              Here's what's happening with your workspace and daily activity today.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <InfoChip icon="🏢" label="Department" value={department} />
              <InfoChip icon="👤" label="Designation" value={designation} />
              <InfoChip icon="📍" label="Location" value={location} />
              <InfoChip icon="📅" label="Joining Date" value={joiningDate} />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 mt-5">
              {/* Action buttons */}
              <button
                type="button"
                onClick={() => setApplyOpen(true)}
                className="text-[12px] font-bold px-4 py-2 rounded-md bg-amber-400 hover:bg-amber-300 text-slate-950 transition-all cursor-pointer flex items-center gap-1.5 shadow-none"
              >
                <span>✈️</span> Apply Leave
              </button>
              <button
                type="button"
                onClick={() => setRaiseAttendanceOpen(true)}
                className="text-[12px] font-bold px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-none"
              >
                <span>🕐</span> Raise Attendance
              </button>

              {employeeId && (
                <>
                  <Link
                    to={`/employees/${employeeId}`}
                    className="text-[12px] font-semibold px-3.5 py-2 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 transition-colors ml-auto sm:ml-0 shadow-none border border-slate-200 dark:border-slate-700"
                  >
                    View Full Profile
                  </Link>
                  <Link
                    to={`/employees/${employeeId}/edit`}
                    className="text-[12px] font-semibold px-3.5 py-2 rounded-md bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 transition-colors shadow-none border border-slate-200 dark:border-slate-700"
                  >
                    Edit Details
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Profile completion card with light mode orb background */}
        <div className="rounded-md border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 relative overflow-hidden flex flex-col justify-between shadow-none">
          <img
            src={dashboardProfileLightBg}
            alt=""
            className="absolute -right-6 -top-6 w-36 h-36 object-contain opacity-45 pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/70 to-white dark:via-slate-900/70 dark:to-slate-900 pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between">
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Profile Completion</p>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800">
              {profilePct === 100 ? 'Complete' : 'In Progress'}
            </span>
          </div>

          <div className="relative z-10 flex items-center justify-between gap-3 my-3">
            <div>
              <p className="text-[36px] font-black text-slate-900 dark:text-white leading-none tracking-tight">
                {profilePct}%
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-snug">
                Complete your profile for the<br />best experience on PeopleOS.
              </p>
            </div>
            <ProfileCompletionMini pct={profilePct} />
          </div>

          <div className="relative z-10 space-y-3">
            <div className="w-full rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 h-2 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-600 transition-all duration-1000"
                style={{ width: `${profilePct}%` }}
              />
            </div>

            <Link
              to={employeeId ? `/employees/${employeeId}/edit` : "/profile"}
              className="block text-center text-[12px] font-bold py-2.5 px-4 rounded-md bg-teal-600 hover:bg-teal-700 text-white transition-colors shadow-none"
            >
              Complete Profile
            </Link>
          </div>
        </div>
      </div>

      {/* ── ROW 2: Live Attendance Clock with light mode wave background ── */}
      <div className="rounded-md border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 relative overflow-hidden shadow-none">
        {/* Background image & soft gradient */}
        <img
          src={dashboardClockLightBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-65 pointer-events-none select-none"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/85 to-white/60 dark:from-slate-900/95 dark:via-slate-900/85 dark:to-slate-900/60 pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
          {/* Date + digital clock */}
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              {checkedIn && (
                <span className="inline-flex items-center gap-1.5 text-[11px] bg-emerald-50 border border-emerald-300 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Punched In
                </span>
              )}
              <p className="text-slate-500 dark:text-slate-400 text-[11.5px] font-bold flex items-center gap-1.5">
                <span>📅</span> {formatDate(now)}
              </p>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-[52px] font-black text-slate-900 dark:text-white leading-none tracking-tight tabular-nums">
                {time}
              </span>
              <div className="flex flex-col items-start mb-1.5 gap-0.5">
                <span className="text-[20px] font-black text-blue-600 dark:text-blue-400 leading-none tabular-nums font-mono">
                  {secs}
                </span>
                <span className="text-[12px] font-bold text-slate-500 dark:text-slate-400 leading-none uppercase">
                  {ampm}
                </span>
              </div>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-[12px] mt-2 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
              {punch?.checkOut
                ? `Punched out at ${punch.checkOut} · ${punch.workMinutes ? `${Math.floor(punch.workMinutes / 60)}h ${String(punch.workMinutes % 60).padStart(2, '0')}m worked` : ''}`
                : checkedIn && checkInTime
                  ? `Punched in at ${checkInTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`
                  : 'Not punched in yet today'}
            </p>
          </div>

          {/* Metrics Cards */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-4 py-2.5 min-w-[170px]">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Work Hours</p>
              <p className="text-slate-900 dark:text-white font-bold text-[13.5px] mt-1">
                {shiftLabel}
              </p>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {employee?.shiftSchedule?.name || 'General Day Shift'}
              </p>
            </div>

            <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-4 py-2.5 min-w-[140px]">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Elapsed Today</p>
              <p className="font-mono font-bold text-[15px] mt-1 tabular-nums">
                {checkedIn ? (
                  <span className="text-teal-600 dark:text-teal-400">{elapsedH}h {pad(elapsedM)}m {pad(elapsedS)}s</span>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </p>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                {checkedIn ? 'Active shift' : 'Offline'}
              </p>
            </div>

            {/* Punch in / out action button */}
            <button
              onClick={checkedIn ? handleCheckOut : handleCheckIn}
              disabled={isPunching || Boolean(punch?.checkOut)}
              className={`flex items-center gap-2 px-6 py-3 rounded-md text-[13px] font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer shadow-none ${
                Boolean(punch?.checkOut)
                  ? 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                  : checkedIn
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                {checkedIn
                  ? <path d="M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4l5.6 5.6L5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6z"/>
                  : <path d="M11 7 9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5Zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14Z"/>
                }
              </svg>
              {punch?.checkOut ? 'Done for Today' : checkedIn ? 'Punch Out' : 'Punch In'}
            </button>
          </div>
        </div>
      </div>

      {/* ── ROW 3: Leave Balance + Pending Requests + AI Assist ──────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

        {/* Leave Balance */}
        <div className="rounded-md border border-hairline bg-surface p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[12.5px] font-bold text-ink flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-400 flex-shrink-0" />
              Leave Balance
            </h2>
            <Link to="/leave" className="text-[11px] text-[var(--primary)] hover:underline font-medium whitespace-nowrap">
              View Details →
            </Link>
          </div>
          {leaveBalance.length > 0 ? (
            <div className="grid grid-cols-2 place-items-center gap-x-1 gap-y-3">
              {leaveBalance.map(lb => (
                <LeaveRing key={lb.label} used={lb.used} total={lb.total} label={lb.label} color={lb.color} />
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-ink-3 text-center py-4">
              {leaveSummary ? 'No leave wallets assigned yet — HR publishes them yearly.' : 'Leave data not available'}
            </p>
          )}
        </div>

        {/* Pending Requests */}
        <div className="rounded-md border border-hairline bg-surface p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[12.5px] font-bold text-ink flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400 flex-shrink-0" />
              Pending Requests
            </h2>
          </div>
          <div className="space-y-2">
            {[
              { icon: '📋', label: 'Leave Requests', badge: pendingLeaveDays, badgeUnit: pendingLeaveDays === 1 ? 'day' : 'days', href: '/leave', badgeColor: pendingLeaveDays > 0 ? 'text-rose-500' : 'text-ink-3' },
              { icon: '🎉', label: 'Restricted Holidays Left', badge: leaveSummary?.restricted.remaining ?? 0, badgeUnit: 'left', href: '/holidays', badgeColor: 'text-teal-600 dark:text-teal-400' },
              { icon: '👤', label: 'Profile Completion', badge: profilePct, badgeUnit: '% complete', href: employeeId ? `/employees/${employeeId}/edit` : '/profile', badgeColor: 'text-amber-500' },
            ].map(req => (
              <Link key={req.label} to={req.href}
                className="flex items-center justify-between p-2.5 rounded-md bg-surface-2/60 hover:bg-surface-2 border border-hairline transition-colors group">
                <div className="flex items-center gap-2">
                  <span className="text-base">{req.icon}</span>
                  <div>
                    <p className="text-[11px] font-semibold text-ink">{req.label}</p>
                    <p className={`text-[10px] font-medium ${req.badgeColor}`}>{req.badge} {req.badgeUnit}</p>
                  </div>
                </div>
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-ink-3 fill-current">
                  <path d="M9.3 18.7 15 13l-5.7-5.7L11 5.6l7.4 7.4-7.4 7.4-1.7-1.7Z"/>
                </svg>
              </Link>
            ))}
          </div>
        </div>

        {/* AI Assist */}
        <div className="rounded-md border border-hairline bg-surface p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-[12.5px] font-bold text-ink flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-400 flex-shrink-0" />
              PeopleOS Assist
            </h2>
            <span className="text-[9px] bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300 px-1.5 py-0.5 rounded font-bold">Beta</span>
          </div>
          <p className="text-[11px] text-ink-3 mb-3">Ask me anything about your leaves, policies, or HR processes.</p>

          {/* Reply area */}
          <div ref={aiScrollRef} className="flex-1 min-h-[50px] max-h-[80px] overflow-y-auto space-y-1 mb-2">
            {aiReplies.map((r, i) => (
              <div key={i} className="text-[10.5px] bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 rounded-md px-2.5 py-1.5 border border-violet-100 dark:border-violet-800/40">
                {r.a}
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-1.5 mb-2">
            <input
              value={aiQuery}
              onChange={e => setAiQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAiSend()}
              placeholder="What can I help you with?"
              className="flex-1 text-[11.5px] bg-surface-2 border border-hairline rounded-md px-2.5 py-1.5 text-ink placeholder:text-ink-3 focus:outline-none focus:border-violet-400 transition-colors"
            />
            <button
              onClick={handleAiSend}
              className="w-7 h-7 flex items-center justify-center rounded-md bg-violet-500 hover:bg-violet-600 text-white transition-colors flex-shrink-0"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2 .01 7Z"/></svg>
            </button>
          </div>

          {/* Quick chips */}
          <div className="space-y-1.5">
            {['How many leave days do I have?', "What's my next payday?", 'Holiday calendar for 2025'].map(q => (
              <button key={q}
                onClick={() => { setAiQuery(q); }}
                className="text-left text-[10.5px] text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1.5 group w-full"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0 group-hover:scale-125 transition-transform" />
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── ROW 4: My Info — identity, manager & HR, always visible ──── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">

        {/* Employee Code */}
        <div className="rounded-md border border-hairline bg-surface p-4">
          <p className="text-[10px] font-semibold text-ink-3 uppercase tracking-wide mb-1">Employee ID</p>
          <p className="text-[18px] font-black text-ink">{employeeCode || '—'}</p>
          <p className="text-[11px] text-ink-3 mt-0.5">{employee?.employmentType?.replace(/_/g, ' ') || user?.roles?.[0]?.replace(/_/g, ' ') || '—'}</p>
          <p className="mt-2 truncate text-[11px] font-semibold text-ink-2" title={workEmail}>{workEmail}</p>
        </div>

        {/* Status */}
        <div className="rounded-md border border-hairline bg-surface p-4">
          <p className="text-[10px] font-semibold text-ink-3 uppercase tracking-wide mb-1">Employment Status</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
              employee?.status === 'ACTIVE' ? 'bg-emerald-400' :
              employee?.status === 'PROBATION' ? 'bg-amber-400' : 'bg-slate-400'
            }`} />
            <p className="text-[13px] font-bold text-ink">{employee?.status || '—'}</p>
          </div>
          <p className="text-[11px] text-ink-3 mt-1">Current standing</p>
          {joiningDate !== '—' && (
            <p className="mt-2 text-[11px] text-ink-3">Joined <strong className="text-ink-2">{joiningDate}</strong></p>
          )}
        </div>

        {/* Reporting Manager + Department Head */}
        <div className="rounded-md border border-hairline bg-surface p-4">
          <p className="text-[10px] font-semibold text-ink-3 uppercase tracking-wide mb-2">My Manager</p>
          {(team?.manager || employee?.manager) ? (
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white">
                {(team?.manager || employee?.manager)?.avatarUrl ? (
                  <img
                    src={(team?.manager || employee?.manager)?.avatarUrl || ''}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  (((team?.manager || employee?.manager)?.displayName || 'M') as string).slice(0, 2).toUpperCase()
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-bold text-ink">
                  {(team?.manager || employee?.manager)?.displayName}
                </span>
                <span className="block truncate text-[11px] text-ink-3" title={(team?.manager || employee?.manager)?.workEmail || ''}>
                  {(team?.manager || employee?.manager)?.workEmail || (team?.manager || employee?.manager)?.employeeCode}
                </span>
              </span>
            </div>
          ) : (
            <p className="text-[13px] font-semibold text-ink-3">{employee ? 'Not assigned' : '—'}</p>
          )}
          {team?.departmentHead && (
            <div className="mt-2.5 border-t border-hairline pt-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">Dept. Head · {team.department?.name}</p>
              <p className="mt-0.5 truncate text-[12px] font-semibold text-ink" title={team.departmentHead.workEmail}>
                {team.departmentHead.displayName}
              </p>
            </div>
          )}
        </div>

        {/* HR Support — assigned reporting HR first, HR team fallback */}
        <div className="rounded-md border border-hairline bg-gradient-to-br from-violet-500/[0.07] to-fuchsia-500/[0.07] bg-surface p-4">
          <p className="text-[10px] font-semibold text-ink-3 uppercase tracking-wide mb-2">My HR Support</p>
          {team?.reportingHr ? (
            <a href={`mailto:${team.reportingHr.workEmail}`} className="flex items-center gap-2.5 rounded-md p-1 transition-colors hover:bg-surface-2" title={`Email ${team.reportingHr.displayName}`}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-600 text-xs font-bold text-white">
                {team.reportingHr.avatarUrl ? (
                  <img
                    src={team.reportingHr.avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  team.reportingHr.displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-bold text-ink">{team.reportingHr.displayName}</span>
                <span className="block truncate text-[11px] text-ink-3">{team.reportingHr.workEmail}</span>
              </span>
            </a>
          ) : (team?.hrContacts || []).length > 0 ? (
            <div className="space-y-2">
              {team!.hrContacts.slice(0, 2).map((hr) => (
                <a key={hr.email} href={`mailto:${hr.email}`} className="flex items-center gap-2.5 rounded-md p-1 transition-colors hover:bg-surface-2" title={`Email ${hr.name}`}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-600 text-xs font-bold text-white">
                    {hr.avatarUrl ? (
                      <img
                        src={hr.avatarUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      hr.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-bold text-ink">{hr.name}</span>
                    <span className="block truncate text-[11px] text-ink-3">{hr.email}</span>
                  </span>
                </a>
              ))}
              {team!.hrContacts.length > 2 && (
                <p className="text-[11px] text-ink-3">+{team!.hrContacts.length - 2} more in HR team</p>
              )}
            </div>
          ) : (
            <p className="text-[13px] font-semibold text-ink-3">Contact HR via front desk</p>
          )}
        </div>
      </div>

      {/* ── ROW 5: Quick Links ───────────────────────────────────────────── */}
      <div className="rounded-md border border-hairline bg-surface p-4">
        <h2 className="text-[12.5px] font-bold text-ink mb-3 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />
          Quick Links
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {[
            { label: 'My Attendance', icon: '🕐', href: '/attendance', color: 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border-teal-100 dark:border-teal-800/40' },
            { label: 'My Leaves',     icon: '✈️', href: '/leave',       color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-800/40' },
            { label: 'Holidays',      icon: '🎉', href: '/holidays',    color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-100 dark:border-orange-800/40' },
            { label: 'Org Chart',     icon: '🌳', href: '/organization/chart', color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-800/40' },
            { label: employeeId ? 'My Employee File' : 'My Profile', icon: '👤', href: employeeId ? `/employees/${employeeId}` : '/profile', color: 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border-violet-100 dark:border-violet-800/40' },
          ].map(link => (
            <Link key={link.label} to={link.href}
              className={`flex items-center gap-2 p-3 rounded-md border font-medium text-[12px] hover:opacity-80 transition-opacity ${link.color}`}>
              <span className="text-base">{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Shortcut: apply leave without leaving the dashboard */}
      <ApplyLeaveModal
        isOpen={applyOpen}
        summary={leaveSummary}
        onClose={() => setApplyOpen(false)}
        onApplied={reloadLeave}
      />

      {/* Shortcut: raise attendance punch with selectable date/time */}
      <Modal
        isOpen={raiseAttendanceOpen}
        onClose={() => setRaiseAttendanceOpen(false)}
        title="Raise Attendance"
      >
        <CheckInOutCard
          record={punch}
          onChanged={(updated) => {
            setPunch(updated);
            setRaiseAttendanceOpen(false);
          }}
        />
      </Modal>

    </div>
  );
}
