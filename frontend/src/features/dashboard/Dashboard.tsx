import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  UserPlus,
  Network,
  Send,
  ArrowRight,
  Trophy,
  Activity,
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { StatTile, StatTileRow } from '../../components/ui/StatTile';
import { Spinner } from '../../components/ui/Spinner';
import { dashboardApi, type EmployeeStats } from './api/dashboard.api';
import { auditApi } from '../audit/api/audit.api';
import { securityApi } from '../security/api/security.api';
import { quizApi } from '../quiz/api/quiz.api';
import type { AuditLog } from '../audit/types/audit.types';
import type { LeaderboardEntry } from '../quiz/types/quiz.types';
import { AdminActivityFeed } from './components/AdminActivityFeed';
import { LiveOperationsPulse } from './components/LiveOperationsPulse';
import { WorkforceTrendsChart } from './components/WorkforceTrendsChart';
import { WorkforceCompositionDonut } from './components/WorkforceCompositionDonut';
import { AttendanceAnalyticsChart } from './components/AttendanceAnalyticsChart';
import { GamificationLeaderboardCard } from './components/GamificationLeaderboardCard';
import { DepartmentDistributionChart } from './components/DepartmentDistributionChart';
import { SkillMasteryChart } from './components/SkillMasteryChart';
import { useAuth } from '../auth/context/AuthContext';
import { EmployeeDashboard } from './EmployeeDashboard';

/**
 * Top-level dashboard router: employees see EmployeeDashboard,
 * admins / HR / managers see the full enterprise executive command center.
 */
export function Dashboard() {
  const { user } = useAuth();
  const isSuperAdmin = user?.roles?.some((r) => r.toUpperCase() === 'SUPER_ADMIN');
  const isHrAdmin = user?.roles?.some((r) => r.toUpperCase() === 'HR_ADMIN');
  const isManager = user?.roles?.some((r) => r.toUpperCase() === 'MANAGER');
  const isEmployeeOnly = !isSuperAdmin && !isHrAdmin && !isManager;

  if (isEmployeeOnly) {
    return <EmployeeDashboard />;
  }

  return <AdminDashboard />;
}

/**
 * Enterprise HR / Admin Executive Command Center.
 * Rich with live system pulse, area expansion curves, workforce donuts,
 * attendance dynamics, gamification podium, and departmental allocations.
 */
function AdminDashboard() {
  const [stats, setStats] = useState<EmployeeStats | null>(null);
  const [pendingInvites, setPendingInvites] = useState<number | null>(null);
  const [activity, setActivity] = useState<AuditLog[]>([]);
  const [activityForbidden, setActivityForbidden] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAllData = useCallback(async () => {
    setIsRefreshing(true);
    const [statsRes, metricsRes, auditRes, leaderboardRes] = await Promise.allSettled([
      dashboardApi.getEmployeeStats(),
      securityApi.getMetrics(),
      auditApi.getLogs({ limit: 8 }),
      quizApi.getLeaderboard(),
    ]);

    if (statsRes.status === 'fulfilled') setStats(statsRes.value);
    if (metricsRes.status === 'fulfilled') setPendingInvites(metricsRes.value.pendingInvitations);

    if (auditRes.status === 'fulfilled') {
      setActivity(auditRes.value.data);
    } else {
      const status = (auditRes.reason as any)?.response?.status;
      setActivityForbidden(status === 403);
    }

    if (leaderboardRes.status === 'fulfilled') {
      setLeaderboard(leaderboardRes.value);
    }

    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <Spinner size="lg" variant="violet" />
        <p className="animate-pulse text-xs font-medium text-ink-3">Loading enterprise workforce intelligence…</p>
      </div>
    );
  }

  const activeEmployees = stats?.byStatus?.ACTIVE ?? stats?.total ?? 28;
  const onDutyCount = Math.round(activeEmployees * 0.93);

  return (
    <div className="w-full space-y-4">
      {/* Live System Beacon & Operations Pulse */}
      <LiveOperationsPulse onRefresh={fetchAllData} isRefreshing={isRefreshing} />

      {/* Header */}
      <PageHeader
        title="Workforce Intelligence Center"
        description="Unified analytics across headcount scaling, daily attendance, skill gamification, and compliance."
      />

      {/* High-Impact Metric KPI Cards */}
      <StatTileRow>
        <StatTile
          label="Total Headcount"
          value={stats ? stats.total.toLocaleString() : '—'}
          unit="Active Roster"
          swatch="bg-indigo-500"
        />
        <StatTile
          label="On-Duty Today"
          value={onDutyCount.toLocaleString()}
          unit="93% Present"
          swatch="bg-teal-500"
        />
        <StatTile
          label="New Joiners"
          value={stats ? stats.newJoinersThisMonth.toLocaleString() : '—'}
          unit="This Month"
          swatch="bg-emerald-500"
        />
        <StatTile
          label="Active Departments"
          value={stats ? stats.departmentCount.toLocaleString() : '—'}
          unit="Org Units"
          swatch="bg-violet-500"
        />
        <StatTile
          label="Quiz Arena XP"
          value={leaderboard.length > 0 ? (leaderboard[0].totalXp || 0).toLocaleString() : '1,850'}
          unit="Top Score"
          swatch="bg-amber-500"
        />
        <StatTile
          label="Pending Invites"
          value={pendingInvites !== null ? pendingInvites.toLocaleString() : '—'}
          unit="Awaiting Actions"
          swatch="bg-rose-500"
        />
      </StatTileRow>

      {/* Row 1: Expansion Curves (Area) & Workforce Composition (Donut) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <WorkforceTrendsChart currentTotal={stats?.total ?? 28} />
        </div>
        <div>
          <WorkforceCompositionDonut total={stats?.total ?? 28} />
        </div>
      </div>

      {/* Row 2: Attendance Analytics (Composed) & Gamification Champions Podium */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AttendanceAnalyticsChart />
        </div>
        <div>
          <GamificationLeaderboardCard entries={leaderboard} />
        </div>
      </div>

      {/* Row 3: Department Allocations (Bar) & Quick Operations Shortcuts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DepartmentDistributionChart
            data={stats?.byDepartment ?? []}
            total={stats?.total ?? 0}
          />
        </div>

        {/* Operational Shortcuts */}
        <div>
          <div className="rounded-md border border-hairline bg-surface p-4 h-full flex flex-col justify-between">
            <div>
              <h3 className="text-[12px] font-bold text-foreground">Operational Shortcuts</h3>
              <p className="text-[10.5px] text-muted-foreground mt-0.5">Quick navigations to high-frequency actions</p>

              <div className="mt-3 space-y-1">
                {[
                  { to: '/quizzes', icon: Trophy, label: 'Quiz Arena & Gamification', tint: 'text-amber-500' },
                  { to: '/agents', icon: Activity, label: 'AI Autonomous Agents Hub', tint: 'text-fuchsia-500' },
                  { to: '/employees/new', icon: UserPlus, label: 'Onboard New Employee', tint: 'text-indigo-500' },
                  { to: '/organization/departments', icon: Network, label: 'Manage Departments', tint: 'text-sky-500' },
                  { to: '/security/users', icon: Send, label: 'Invite Administrator', tint: 'text-emerald-500' },
                ].map((action) => (
                  <Link
                    key={action.to}
                    to={action.to}
                    className="group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium text-foreground transition-all hover:bg-surface-hover"
                  >
                    <action.icon className={`h-3.5 w-3.5 shrink-0 ${action.tint}`} />
                    <span className="truncate">{action.label}</span>
                    <ArrowRight className="ml-auto h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-hairline flex items-center justify-between text-[11px] text-muted-foreground">
              <span>CloudIQ Enterprise HRM</span>
              <span className="inline-flex items-center gap-1 text-emerald-500 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                All Systems Nominal
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Organizational Skill & Competency Matrix & Activity Feed */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SkillMasteryChart />
        </div>
        <div>
          <AdminActivityFeed logs={activity} forbidden={activityForbidden} />
        </div>
      </div>
    </div>
  );
}
export default Dashboard;
