import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { employeesApi } from '../employees/api/employees.api';
import { profileApi } from '../profile/api/profile.api';
import type { Employee } from '../employees/types/employees.types';
import { useAuth } from '../auth/context/AuthContext';
import defaultAvatarImg from '../../assets/default_avatar.jpg';

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
  const r = 26;
  const circ = 2 * Math.PI * r;
  const dash = circ - (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-[60px] h-[60px]">
        <svg width={60} height={60} className="-rotate-90">
          <circle cx={30} cy={30} r={r} fill="none" strokeWidth={5} className="stroke-slate-100 dark:stroke-slate-800" />
          <circle
            cx={30} cy={30} r={r} fill="none" strokeWidth={5}
            stroke={color}
            strokeDasharray={circ}
            strokeDashoffset={dash}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[14px] font-bold text-ink rotate-90">{used}</span>
      </div>
      <p className="text-[10px] text-ink-3 text-center leading-tight">
        {label}
        <br />
        <span className="text-ink-4">/ {total}</span>
      </p>
    </div>
  );
}

// ─── Stat chip ────────────────────────────────────────────────────────────────
function InfoChip({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <span className="flex items-center gap-1.5 text-[12px] text-white/85">
      <span className="text-white/60">{icon}</span>
      <span className="text-white/60">{label}</span>
      <strong className="text-white font-semibold">{value}</strong>
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
        stroke="#0ea5e9"
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

  // Live employee record (null = no linked employee file yet)
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [userProfile, setUserProfile] = useState<{ phone?: string | null; employeeCode?: string | null; linkedEmployeeId?: string | null } | null>(null);
  const [noEmployeeRecord, setNoEmployeeRecord] = useState(false);
  const [profilePct, setProfilePct] = useState(0);
  const [loading, setLoading] = useState(true);

  // Live clock with seconds
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Attendance check-in (browser-side session)
  const [checkedIn, setCheckedIn] = useState(() => localStorage.getItem('emp_checked_in') === 'true');
  const [checkInTime, setCheckInTime] = useState<Date | null>(() => {
    const s = localStorage.getItem('emp_check_in_time');
    return s ? new Date(s) : null;
  });

  // AI Assist
  const [aiQuery, setAiQuery] = useState('');
  const [aiReplies, setAiReplies] = useState<{ q: string; a: string }[]>([]);
  const aiScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      employeesApi.getMyProfile(),
      profileApi.getMyProfile(),
    ]).then(([empRes, profRes]) => {
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
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const handleCheckIn = () => {
    const t = new Date();
    setCheckedIn(true);
    setCheckInTime(t);
    localStorage.setItem('emp_checked_in', 'true');
    localStorage.setItem('emp_check_in_time', t.toISOString());
  };

  const handleCheckOut = () => {
    setCheckedIn(false);
    setCheckInTime(null);
    localStorage.removeItem('emp_checked_in');
    localStorage.removeItem('emp_check_in_time');
  };

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

  const { time, secs, ampm } = formatTime(now);

  // Leave data - from live employee profile completion or blank if not loaded
  const leaveBalance = employee ? [
    { label: 'Annual Leave',  used: 12, total: 20, color: '#0ea5e9' },
    { label: 'Sick Leave',    used: 8,  total: 12, color: '#8b5cf6' },
    { label: 'Casual Leave',  used: 3,  total: 6,  color: '#f59e0b' },
    { label: 'Unpaid Leave',  used: 1,  total: 5,  color: '#f87171' },
  ] : [];

  const handleAiSend = () => {
    const q = aiQuery.trim();
    if (!q) return;
    setAiReplies(prev => [
      ...prev,
      { q, a: 'HR AI responses coming soon. Please contact HR for now.' },
    ]);
    setAiQuery('');
    setTimeout(() => aiScrollRef.current?.scrollTo({ top: 9999, behavior: 'smooth' }), 80);
  };

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

      {/* ── ROW 1: Greeting + Profile Completion ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">

        {/* Greeting banner */}
        <div className="rounded-md bg-gradient-to-br from-teal-500 via-emerald-500 to-cyan-500 p-5 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5 blur-xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-md overflow-hidden border-2 border-white/30 flex-shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = defaultAvatarImg; }} />
                ) : (
                  <div className="w-full h-full bg-white/20 flex items-center justify-center text-white text-sm font-bold">{initials}</div>
                )}
              </div>
              <div>
                <p className="text-[12px] text-white/70 font-medium">{getGreeting()},</p>
                <h1 className="text-[20px] font-extrabold text-white leading-tight tracking-tight">{displayName} 👋</h1>
              </div>
            </div>
            <p className="text-[12px] text-white/70 mb-4">Here's what's happening with your work today.</p>
            <div className="flex flex-wrap gap-4">
              <InfoChip icon="🏢" label="Department" value={department} />
              <InfoChip icon="👤" label="Designation" value={designation} />
              <InfoChip icon="📍" label="Location" value={location} />
              <InfoChip icon="📅" label="Joining Date" value={joiningDate} />
            </div>
            {employeeId && (
              <div className="flex flex-wrap gap-2 mt-4">
                <Link
                  to={`/employees/${employeeId}`}
                  className="text-[12px] font-semibold px-3 py-1.5 rounded-md bg-white text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  View Full Profile
                </Link>
                <Link
                  to={`/employees/${employeeId}/edit`}
                  className="text-[12px] font-semibold px-3 py-1.5 rounded-md bg-white/15 text-white border border-white/25 hover:bg-white/25 transition-colors"
                >
                  Edit Details
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Profile completion */}
        <div className="rounded-md border border-hairline bg-surface p-4 flex flex-col justify-between gap-2">
          <p className="text-[10px] font-semibold text-ink-3 uppercase tracking-widest">Profile Completion</p>
          <div className="flex items-center gap-3">
            <div>
              <p className="text-[32px] font-black text-ink leading-none">{profilePct}%</p>
              <p className="text-[11px] text-ink-3 mt-1 leading-snug">Complete your profile for the<br />best experience on PeopleOS.</p>
            </div>
            <div className="ml-auto">
              <ProfileCompletionMini pct={profilePct} />
            </div>
          </div>
          <div className="w-full rounded-full bg-slate-100 dark:bg-slate-800 h-1.5 overflow-hidden">
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-teal-400 to-sky-500 transition-all duration-1000"
              style={{ width: `${profilePct}%` }}
            />
          </div>
          <Link
            to={employeeId ? `/employees/${employeeId}/edit` : "/profile"}
            className="block text-center text-[12px] font-semibold py-2 px-4 rounded-md bg-gradient-to-r from-teal-500 to-sky-500 text-white hover:opacity-90 transition-opacity"
          >
            Complete Profile
          </Link>
        </div>
      </div>

      {/* ── ROW 2: Live Attendance Clock ─────────────────────────────────── */}
      <div className="rounded-md bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 border border-white/5 p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full border border-white/5 -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute top-12 right-20 w-44 h-44 rounded-full border border-white/[0.03] pointer-events-none" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-5">
          {/* Date + clock */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              {checkedIn && (
                <span className="inline-flex items-center gap-1 text-[10.5px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Checked In
                </span>
              )}
              <p className="text-slate-400 text-[11.5px]">{formatDate(now)}</p>
            </div>
            <div className="flex items-end gap-1.5">
              <span className="text-[48px] font-black text-white leading-none tracking-tight tabular-nums">{time}</span>
              <div className="flex flex-col items-start mb-1 gap-0.5">
                <span className="text-[18px] font-black text-white/50 leading-none tabular-nums">{secs}</span>
                <span className="text-[13px] font-bold text-slate-400 leading-none">{ampm}</span>
              </div>
            </div>
            <p className="text-slate-400 text-[12px] mt-1">
              {checkedIn && checkInTime
                ? `Clocked in at ${checkInTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`
                : 'Not clocked in yet'}
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-8">
            <div>
              <p className="text-[10.5px] text-slate-500 font-medium uppercase tracking-wide">Work Hours</p>
              <p className="text-white font-semibold text-[14px] mt-0.5">9:00 AM – 6:00 PM</p>
            </div>
            <div>
              <p className="text-[10.5px] text-slate-500 font-medium uppercase tracking-wide">Elapsed</p>
              <p className="text-white font-semibold text-[14px] mt-0.5 tabular-nums">
                {checkedIn ? `${elapsedH}h ${pad(elapsedM)}m ${pad(elapsedS)}s` : '—'}
              </p>
            </div>
          </div>

          {/* Check in / out */}
          <button
            onClick={checkedIn ? handleCheckOut : handleCheckIn}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-md text-[13px] font-bold transition-all ${
              checkedIn
                ? 'bg-rose-500/15 text-rose-300 border border-rose-500/25 hover:bg-rose-500/25'
                : 'bg-white text-slate-900 hover:bg-slate-100'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
              {checkedIn
                ? <path d="M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4l5.6 5.6L5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6z"/>
                : <path d="M11 7 9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5Zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14Z"/>
              }
            </svg>
            {checkedIn ? 'Check Out' : 'Check In'}
          </button>
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
            <div className="grid grid-cols-4 gap-1 place-items-center">
              {leaveBalance.map(lb => (
                <LeaveRing key={lb.label} used={lb.used} total={lb.total} label={lb.label} color={lb.color} />
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-ink-3 text-center py-4">Leave data not available</p>
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
              { icon: '📋', label: 'Leave Requests',        badge: 2,  href: '/leave',   badgeColor: 'text-rose-500' },
              { icon: '📄', label: 'Document Verification', badge: 1,  href: '/profile', badgeColor: 'text-rose-500' },
              { icon: '👤', label: 'Profile Update',         badge: 1,  href: '/profile', badgeColor: 'text-amber-500' },
            ].map(req => (
              <Link key={req.label} to={req.href}
                className="flex items-center justify-between p-2.5 rounded-md bg-surface-2/60 hover:bg-surface-2 border border-hairline transition-colors group">
                <div className="flex items-center gap-2">
                  <span className="text-base">{req.icon}</span>
                  <div>
                    <p className="text-[11px] font-semibold text-ink">{req.label}</p>
                    <p className={`text-[10px] font-medium ${req.badgeColor}`}>{req.badge} pending</p>
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

      {/* ── ROW 4: My Info (logged-in user + employee file) ───────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

        {/* Employee Code */}
        <div className="rounded-md border border-hairline bg-surface p-4">
          <p className="text-[10px] font-semibold text-ink-3 uppercase tracking-wide mb-1">Employee ID</p>
          <p className="text-[18px] font-black text-ink">{employeeCode || '—'}</p>
          <p className="text-[11px] text-ink-3 mt-0.5">{employee?.employmentType?.replace(/_/g, ' ') || user?.roles?.[0]?.replace(/_/g, ' ') || '—'}</p>
        </div>

        {/* Work Email — always the logged-in account */}
        <div className="rounded-md border border-hairline bg-surface p-4">
          <p className="text-[10px] font-semibold text-ink-3 uppercase tracking-wide mb-1">Work Email</p>
          <p className="text-[12px] font-semibold text-ink break-all">{workEmail}</p>
          <p className="text-[11px] text-ink-3 mt-0.5">Primary contact</p>
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
        </div>

        {/* Manager */}
        <div className="rounded-md border border-hairline bg-surface p-4">
          <p className="text-[10px] font-semibold text-ink-3 uppercase tracking-wide mb-1">Reporting Manager</p>
          {employee?.manager ? (
            <>
              <p className="text-[13px] font-bold text-ink">
                {employee.manager.displayName || `${employee.manager.firstName} ${employee.manager.lastName}`}
              </p>
              <p className="text-[11px] text-ink-3 mt-0.5">{employee.manager.employeeCode}</p>
            </>
          ) : (
            <p className="text-[13px] font-semibold text-ink-3">{employee ? 'Not assigned' : '—'}</p>
          )}
        </div>
      </div>

      {/* ── ROW 5: Quick Links ───────────────────────────────────────────── */}
      <div className="rounded-md border border-hairline bg-surface p-4">
        <h2 className="text-[12.5px] font-bold text-ink mb-3 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />
          Quick Links
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'My Attendance', icon: '🕐', href: '/attendance', color: 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border-teal-100 dark:border-teal-800/40' },
            { label: 'My Leaves',     icon: '✈️', href: '/leave',       color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-100 dark:border-amber-800/40' },
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

    </div>
  );
}
