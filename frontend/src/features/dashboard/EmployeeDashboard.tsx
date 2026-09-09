import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { employeesApi } from '../employees/api/employees.api';
import type { Employee } from '../employees/types/employees.types';
import { useAuth } from '../auth/context/AuthContext';

// ─── helpers ────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// ─── Leave ring gauge ────────────────────────────────────────────────────────
function LeaveRing({ used, total, label, color }: { used: number; total: number; label: string; color: string }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = circ - (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <svg width={70} height={70} className="-rotate-90">
          <circle cx={35} cy={35} r={r} fill="none" strokeWidth={6} className="stroke-slate-100 dark:stroke-slate-800" />
          <circle
            cx={35} cy={35} r={r} fill="none" strokeWidth={6}
            stroke={color}
            strokeDasharray={circ}
            strokeDashoffset={dash}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[15px] font-bold text-ink rotate-90">{used}</span>
      </div>
      <p className="text-[10.5px] text-ink-3 text-center leading-tight font-medium">{label}<br /><span className="text-ink-4">/ {total}</span></p>
    </div>
  );
}

// ─── Quick Chip ─────────────────────────────────────────────────────────────
function QuickChip({ label }: { label: string }) {
  return (
    <button className="text-left text-[11px] text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 group">
      <span className="w-1.5 h-1.5 rounded-full bg-teal-400 group-hover:scale-125 transition-transform flex-shrink-0" />
      {label}
    </button>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export function EmployeeDashboard() {
  const { user } = useAuth();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Live clock
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Attendance check-in state
  const [checkedIn, setCheckedIn] = useState(() => {
    const s = localStorage.getItem('emp_checked_in');
    return s === 'true';
  });
  const [checkInTime, setCheckInTime] = useState<Date | null>(() => {
    const s = localStorage.getItem('emp_check_in_time');
    return s ? new Date(s) : null;
  });

  // AI Assist
  const [aiQuery, setAiQuery] = useState('');
  const [aiReplies, setAiReplies] = useState<string[]>([]);
  const aiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    employeesApi.getMyProfile()
      .then(res => { if (active) setEmployee(res); })
      .catch(() => { if (active) setEmployee(null); })
      .finally(() => { if (active) setIsLoading(false); });
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

  const displayName = employee
    ? `${employee.firstName} ${employee.lastName}`.trim()
    : user ? `${user.firstName} ${user.lastName}`.trim() : 'Employee';

  const department = employee?.departmentName || 'Engineering';
  const designation = employee?.designationTitle || 'Software Engineer';
  const location = employee?.locationName || 'Bengaluru';
  const joiningDate = employee?.joiningDate
    ? new Date(employee.joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Jan 01, 2024';

  // Static demo data (will be replaced by API when leave/payroll modules exist)
  const leaveBalance = [
    { label: 'Annual Leave', used: 12, total: 20, color: '#0ea5e9' },
    { label: 'Sick Leave',   used: 8,  total: 12, color: '#8b5cf6' },
    { label: 'Casual Leave', used: 3,  total: 6,  color: '#f59e0b' },
    { label: 'Unpaid Leave', used: 1,  total: 5,  color: '#f87171' },
  ];

  const holidays = [
    { date: 'May 01', day: 'Thursday', name: 'Labour Day',     type: 'Holiday' },
    { date: 'May 12', day: 'Monday',   name: 'Buddha Purnima', type: 'Holiday' },
    { date: 'Jun 07', day: 'Saturday', name: 'Eid al-Adha',    type: 'Holiday' },
    { date: 'Aug 15', day: 'Friday',   name: 'Independence Day',type: 'Holiday' },
  ];

  const pendingRequests = [
    { icon: '📋', label: 'Leave Requests',         count: 2, href: '/leave' },
    { icon: '📄', label: 'Document Verification',  count: 1, href: '/profile' },
    { icon: '👤', label: 'Profile Update',          count: 1, href: '/profile' },
  ];

  const payslips = [
    { month: 'Apr 2025', label: 'Salary for April 2025',   amount: '₹ 85,000' },
    { month: 'Mar 2025', label: 'Salary for March 2025',   amount: '₹ 85,000' },
    { month: 'Feb 2025', label: 'Salary for February 2025', amount: '₹ 83,500' },
    { month: 'Jan 2025', label: 'Salary for January 2025',  amount: '₹ 83,500' },
  ];

  const birthdays = [
    { name: 'Priya Sharma',   initials: 'PS', days: 3,  color: '#8b5cf6' },
    { name: 'Rahul Mehta',    initials: 'RM', days: 7,  color: '#0ea5e9' },
    { name: 'Sneha Iyer',     initials: 'SI', days: 11, color: '#10b981' },
  ];

  const announcements = [
    {
      title: 'New Health Insurance Policy',
      desc: "We're excited to announce an enhanced health-insurance plan for all employees.",
      tag: 'HR', date: 'Apr 18, 2025',
    },
    {
      title: 'Q2 Town Hall Meeting',
      desc: 'Join us for the quarterly town hall meeting on Apr 25, 2025 at 11:00 AM.',
      tag: 'Leadership', date: 'Apr 18, 2025',
    },
    {
      title: 'Remote Work Guidelines',
      desc: 'Updated remote-work policy is now live. Please review the new guidelines.',
      tag: 'HR', date: 'Apr 19, 2025',
    },
  ];

  const aiQuickQuestions = [
    'How many leave days do I have?',
    "What's my next payday?",
    'Holiday calendar for 2025',
  ];

  const handleAiSend = () => {
    if (!aiQuery.trim()) return;
    const q = aiQuery.trim();
    setAiReplies(prev => [
      ...prev,
      `You asked: "${q}" — AI responses coming soon! 🚀`,
    ]);
    setAiQuery('');
    setTimeout(() => aiRef.current?.scrollTo({ top: 9999, behavior: 'smooth' }), 100);
  };

  const profilePct = 85;
  const profileR = 36;
  const profileCirc = 2 * Math.PI * profileR;
  const profileDash = profileCirc - (profilePct / 100) * profileCirc;

  const monthColors: Record<string, string> = {
    Apr: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    Mar: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    Feb: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
    Jan: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  };

  return (
    <div className="w-full space-y-4 pb-8">

      {/* ── TOP BANNER ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left: Greeting + meta */}
        <div className="lg:col-span-2 rounded-xl border border-hairline bg-gradient-to-br from-teal-500 via-emerald-500 to-cyan-600 p-6 text-white relative overflow-hidden shadow-lg">
          {/* decorative blobs */}
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-4 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />

          <div className="relative z-10">
            <p className="text-sm font-medium text-white/80">{getGreeting()},</p>
            <h1 className="text-3xl font-extrabold mt-0.5 tracking-tight">{displayName} 👋</h1>
            <p className="text-sm text-white/70 mt-1">Here's what's happening with your work today.</p>

            <div className="mt-5 flex flex-wrap gap-4 text-[12px] text-white/85">
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white/70"><path d="M3 7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7Zm4-2a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H7Z"/><path d="M12 11a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"/></svg>
                <span className="opacity-70">Department</span> <strong className="text-white">{department}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white/70"><path d="M12 2a5 5 0 1 1 0 10A5 5 0 0 1 12 2Zm0 12c5.33 0 8 2.67 8 4v2H4v-2c0-1.33 2.67-4 8-4Z"/></svg>
                <span className="opacity-70">Designation</span> <strong className="text-white">{designation}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white/70"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z"/></svg>
                <span className="opacity-70">Location</span> <strong className="text-white">{location}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white/70"><path d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 16H5V10h14v10ZM5 8V6h14v2H5Z"/></svg>
                <span className="opacity-70">Joining Date</span> <strong className="text-white">{joiningDate}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Profile Completion */}
        <div className="rounded-xl border border-hairline bg-surface p-5 shadow-xs flex flex-col justify-between gap-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-semibold text-ink-3 uppercase tracking-wide">Profile Completion</p>
              <p className="text-3xl font-extrabold text-ink mt-1">{profilePct}%</p>
              <p className="text-[11px] text-ink-3 mt-1 leading-snug">Complete your profile to get<br />the best experience on PeopleOS.</p>
            </div>
            {/* Radial gauge */}
            <svg width={80} height={80} className="-rotate-90">
              <circle cx={40} cy={40} r={profileR} fill="none" strokeWidth={7} className="stroke-slate-100 dark:stroke-slate-800" />
              <circle cx={40} cy={40} r={profileR} fill="none" strokeWidth={7}
                stroke="#0ea5e9" strokeDasharray={profileCirc} strokeDashoffset={profileDash}
                strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
            </svg>
          </div>
          <div className="w-full rounded-full bg-slate-100 dark:bg-slate-800 h-2 overflow-hidden">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-teal-400 to-sky-500"
              style={{ width: `${profilePct}%`, transition: 'width 1s ease' }}
            />
          </div>
          <Link
            to="/profile"
            className="block text-center text-[12px] font-semibold py-2 px-4 rounded-lg bg-gradient-to-r from-teal-500 to-sky-500 text-white hover:opacity-90 transition-opacity"
          >
            Complete Profile
          </Link>
        </div>
      </div>

      {/* ── ATTENDANCE CARD (full width below banner on large, inline on XL) ── */}
      <div className="rounded-xl bg-gradient-to-br from-slate-800 via-slate-900 to-teal-900 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950 border border-white/10 p-6 shadow-xl relative overflow-hidden">
        {/* circles decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full border-2 border-white/5 -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="absolute top-10 right-20 w-40 h-40 rounded-full border border-white/5 pointer-events-none" />

        <div className="relative z-10 flex flex-wrap gap-6 items-center justify-between">
          {/* Left: date + time */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              {checkedIn && (
                <span className="flex items-center gap-1 text-[11px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Checked In
                </span>
              )}
              <p className="text-slate-400 text-[12px]">{formatDate(now)}</p>
            </div>
            <p className="text-5xl font-black text-white tracking-tight leading-none">{formatTime(now)}</p>
            <p className="text-slate-300 text-sm mt-1">{checkedIn ? 'You clocked in' : 'Not clocked in yet'}</p>
          </div>

          {/* Middle: stats */}
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-[11px] text-slate-400 font-medium">Work Hours</p>
              <p className="text-white font-semibold text-sm mt-0.5">9:00 AM – 6:00 PM</p>
            </div>
            <div className="text-center">
              <p className="text-[11px] text-slate-400 font-medium">Elapsed</p>
              <p className="text-white font-semibold text-sm mt-0.5">
                {checkedIn ? `${elapsedH}h ${elapsedM}m` : '0h 0m'}
              </p>
            </div>
          </div>

          {/* Right: action */}
          <button
            onClick={checkedIn ? handleCheckOut : handleCheckIn}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all duration-200 shadow-lg ${
              checkedIn
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
                : 'bg-white text-slate-900 hover:bg-teal-50'
            }`}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
              {checkedIn
                ? <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Zm0 4c.55 0 1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V7c0-.55.45-1 1-1Zm0 14c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1Z"/>
                : <path d="M11 7 9.6 8.4l2.6 2.6H2v2h10.2l-2.6 2.6L11 17l5-5-5-5Zm9 12h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-8v2h8v14Z"/>
              }
            </svg>
            {checkedIn ? 'Check Out' : 'Check In'}
          </button>
        </div>
      </div>

      {/* ── MIDDLE ROW ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* Leave Balance */}
        <div className="rounded-xl border border-hairline bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[12.5px] font-bold text-ink flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-400" /> Leave Balance
            </h2>
            <Link to="/leave" className="text-[11px] text-[var(--primary)] hover:underline font-medium">View Details →</Link>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {leaveBalance.map(lb => (
              <LeaveRing key={lb.label} used={lb.used} total={lb.total} label={lb.label} color={lb.color} />
            ))}
          </div>
        </div>

        {/* Upcoming Holidays */}
        <div className="rounded-xl border border-hairline bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[12.5px] font-bold text-ink flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> Upcoming Holidays
            </h2>
            <button className="text-[11px] text-[var(--primary)] hover:underline font-medium">View Calendar →</button>
          </div>
          <div className="space-y-2">
            {holidays.map(h => (
              <div key={h.name} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 text-center">
                    <p className="text-[9px] text-ink-3 leading-none">{h.date.split(' ')[0]}</p>
                    <p className="text-[14px] font-black text-ink leading-tight">{h.date.split(' ')[1]}</p>
                  </div>
                  <div>
                    <p className="text-[11.5px] font-semibold text-ink leading-tight">{h.name}</p>
                    <p className="text-[10px] text-ink-3">{h.day}</p>
                  </div>
                </div>
                <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 flex-shrink-0">{h.type}</span>
              </div>
            ))}
          </div>
          <button className="mt-3 text-[11px] text-[var(--primary)] hover:underline font-medium">View all holidays →</button>
        </div>

        {/* Pending Requests */}
        <div className="rounded-xl border border-hairline bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[12.5px] font-bold text-ink flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400" /> Pending Requests
            </h2>
            <button className="text-[11px] text-[var(--primary)] hover:underline font-medium">View All →</button>
          </div>
          <div className="space-y-2">
            {pendingRequests.map(req => (
              <Link key={req.label} to={req.href}
                className="flex items-center justify-between p-2.5 rounded-lg bg-surface-2/60 hover:bg-surface-2 border border-hairline transition-colors group">
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{req.icon}</span>
                  <div>
                    <p className="text-[11.5px] font-semibold text-ink">{req.label}</p>
                    <p className="text-[10.5px] text-rose-500 font-medium">{req.count} pending</p>
                  </div>
                </div>
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-ink-3 group-hover:text-ink transition-colors fill-current">
                  <path d="M9.3 18.7 15 13l-5.7-5.7L11 5.6l7.4 7.4-7.4 7.4-1.7-1.7Z"/>
                </svg>
              </Link>
            ))}
          </div>
        </div>

        {/* AI Assist */}
        <div className="rounded-xl border border-hairline bg-surface p-4 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[12.5px] font-bold text-ink flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-400" /> PeopleOS Assist
              <span className="text-[9px] bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300 px-1.5 py-0.5 rounded font-bold ml-0.5">Beta</span>
            </h2>
          </div>
          <p className="text-[11px] text-ink-3 mb-3">Ask me anything about your leaves, policies, or HR processes.</p>

          {/* Replies */}
          <div ref={aiRef} className="flex-1 min-h-[60px] max-h-24 overflow-y-auto space-y-1.5 mb-2">
            {aiReplies.map((r, i) => (
              <div key={i} className="text-[11px] bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 rounded-lg px-2.5 py-1.5 border border-violet-100 dark:border-violet-800/40">{r}</div>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-1.5 mb-2">
            <input
              value={aiQuery}
              onChange={e => setAiQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAiSend()}
              placeholder="What can I help you with?"
              className="flex-1 text-[11.5px] bg-surface-2 border border-hairline rounded-lg px-2.5 py-1.5 text-ink placeholder:text-ink-3 focus:outline-none focus:border-violet-400 transition-colors"
            />
            <button
              onClick={handleAiSend}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-violet-500 hover:bg-violet-600 text-white transition-colors flex-shrink-0"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2 .01 7Z"/></svg>
            </button>
          </div>

          {/* Quick chips */}
          <div className="space-y-1">
            {aiQuickQuestions.map(q => (
              <QuickChip key={q} label={q} />
            ))}
          </div>
        </div>
      </div>

      {/* ── BOTTOM ROW ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* Recent Payslips */}
        <div className="rounded-xl border border-hairline bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[12.5px] font-bold text-ink flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Recent Payslips
            </h2>
            <button className="text-[11px] text-[var(--primary)] hover:underline font-medium">View All →</button>
          </div>
          <div className="space-y-2">
            {payslips.map(p => {
              const mon = p.month.split(' ')[0];
              return (
                <div key={p.month} className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-surface-2/60 transition-colors group">
                  <div className="flex items-center gap-2.5">
                    <span className={`text-[11px] font-bold px-2 py-1 rounded-lg min-w-[36px] text-center ${monthColors[mon] || 'bg-slate-100 text-slate-600'}`}>{mon}</span>
                    <div>
                      <p className="text-[11px] font-semibold text-ink leading-tight">{p.month}</p>
                      <p className="text-[10px] text-ink-3">{p.label}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-bold text-emerald-600 dark:text-emerald-400">{p.amount}</span>
                    <button className="flex items-center gap-1 text-[10px] text-[var(--primary)] hover:underline font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current"><path d="M19 9h-4V3H9v6H5l7 7 7-7ZM5 18v2h14v-2H5Z"/></svg>
                      Save
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Document Action Center */}
        <div className="rounded-xl border border-hairline bg-surface p-4 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[12.5px] font-bold text-ink flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-400" /> Document Action Center
            </h2>
            <button className="text-[11px] text-[var(--primary)] hover:underline font-medium">View All →</button>
          </div>
          <div className="space-y-2.5 flex-1">
            <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30">
              <span className="text-lg">⚠️</span>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 font-medium leading-snug">2 documents expiring soon<br /><span className="font-normal text-amber-600 dark:text-amber-400">Passport, Health Insurance</span></p>
            </div>
            <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/30">
              <span className="text-lg">📋</span>
              <p className="text-[11px] text-rose-800 dark:text-rose-300 font-medium leading-snug">1 document pending verification<br /><span className="font-normal text-rose-600 dark:text-rose-400">Experience Letter</span></p>
            </div>
            <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-sky-50 dark:bg-sky-900/10 border border-sky-100 dark:border-sky-800/30">
              <span className="text-lg">📤</span>
              <p className="text-[11px] text-sky-800 dark:text-sky-300 font-medium leading-snug">Upload missing documents<br /><span className="font-normal text-sky-600 dark:text-sky-400">Address Proof, Bank Statement</span></p>
            </div>
          </div>
          <Link to="/profile" className="mt-3 block text-center text-[12px] font-semibold py-2 px-4 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:opacity-90 transition-opacity">
            Go to Documents →
          </Link>
        </div>

        {/* Team Birthdays */}
        <div className="rounded-xl border border-hairline bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[12.5px] font-bold text-ink flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-pink-400" /> Team Birthdays 🎉
            </h2>
            <button className="text-[11px] text-[var(--primary)] hover:underline font-medium">View All →</button>
          </div>
          <div className="space-y-2.5">
            {birthdays.map(b => (
              <div key={b.name} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                    style={{ background: b.color }}
                  >{b.initials}</div>
                  <div>
                    <p className="text-[11.5px] font-semibold text-ink">{b.name}</p>
                    <p className="text-[10px] text-ink-3">Apr {24 + b.days - 3} · {b.days} days</p>
                  </div>
                </div>
                <span className="text-lg">🎂</span>
              </div>
            ))}
          </div>
          <div className="mt-3 py-2 px-3 rounded-lg bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/10 dark:to-purple-900/10 border border-pink-100 dark:border-pink-800/30 text-center">
            <p className="text-[10.5px] text-pink-700 dark:text-pink-300 font-medium">🎊 Let's celebrate the amazing people in our team!</p>
          </div>
        </div>

        {/* Company Announcements */}
        <div className="rounded-xl border border-hairline bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[12.5px] font-bold text-ink flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400" /> Company Announcements
            </h2>
            <button className="text-[11px] text-[var(--primary)] hover:underline font-medium">View All →</button>
          </div>
          <div className="space-y-3">
            {announcements.map(a => (
              <div key={a.title} className="flex items-start gap-2.5 group cursor-pointer">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 fill-current">
                    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2Z"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11.5px] font-semibold text-ink group-hover:text-[var(--primary)] transition-colors leading-tight">{a.title}</p>
                  <p className="text-[10.5px] text-ink-3 mt-0.5 line-clamp-2 leading-snug">{a.desc}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">{a.tag}</span>
                    <span className="text-[9.5px] text-ink-4">{a.date}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
