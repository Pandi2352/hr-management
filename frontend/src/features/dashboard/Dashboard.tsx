import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UsersRound, UserPlus, Network, Send, ArrowRight } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { StatTile, StatTileRow } from '../../components/ui/StatTile';
import { Spinner } from '../../components/ui/Spinner';
import { dashboardApi, type EmployeeStats } from './api/dashboard.api';
import { auditApi } from '../audit/api/audit.api';
import { securityApi } from '../security/api/security.api';
import type { AuditLog } from '../audit/types/audit.types';
import { HeadcountByDepartment } from './components/HeadcountByDepartment';
import { WorkforceStatusBar } from './components/WorkforceStatusBar';
import { AdminActivityFeed } from './components/AdminActivityFeed';
import { useAuth } from '../auth/context/AuthContext';
import { EmployeeDashboard } from './EmployeeDashboard';

/**
 * Top-level dashboard router: employees see EmployeeDashboard,
 * admins / HR / managers see the full HR overview.
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
 * HR / Admin overview panel.
 *
 * Every figure here is fetched from the server. Metrics that would require the
 * Attendance or Leave modules (on-duty today, punctuality trends) are
 * deliberately absent rather than estimated — those modules don't exist yet.
 */
function AdminDashboard() {
  const [stats, setStats] = useState<EmployeeStats | null>(null);
  const [pendingInvites, setPendingInvites] = useState<number | null>(null);
  const [activity, setActivity] = useState<AuditLog[]>([]);
  const [activityForbidden, setActivityForbidden] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // Each panel degrades on its own — a user without audit:read still gets the
    // headcount figures rather than an empty dashboard.
    Promise.allSettled([
      dashboardApi.getEmployeeStats(),
      securityApi.getMetrics(),
      auditApi.getLogs({ limit: 8 }),
    ]).then(([statsRes, metricsRes, auditRes]) => {
      if (!active) return;

      if (statsRes.status === 'fulfilled') setStats(statsRes.value);
      if (metricsRes.status === 'fulfilled') setPendingInvites(metricsRes.value.pendingInvitations);

      if (auditRes.status === 'fulfilled') {
        setActivity(auditRes.value.data);
      } else {
        const status = (auditRes.reason as any)?.response?.status;
        setActivityForbidden(status === 403);
      }

      setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <Spinner size="lg" variant="violet" />
        <p className="animate-pulse text-xs font-medium text-ink-3">Loading workforce overview…</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2.5">
      <PageHeader
        title="Workforce Overview"
        description="Live headcount, workforce composition, and recent administrative activity."
      />

      <StatTileRow>
        <StatTile
          label="Total Headcount"
          value={stats ? stats.total.toLocaleString() : '—'}
          unit="Employees"
          swatch="bg-indigo-500"
        />
        <StatTile
          label="New Joiners"
          value={stats ? stats.newJoinersThisMonth.toLocaleString() : '—'}
          unit="This month"
          swatch="bg-emerald-500"
        />
        <StatTile
          label="Departments"
          value={stats ? stats.departmentCount.toLocaleString() : '—'}
          unit="Active units"
          swatch="bg-violet-500"
        />
        <StatTile
          label="Pending Invites"
          value={pendingInvites !== null ? pendingInvites.toLocaleString() : '—'}
          unit="Awaiting acceptance"
          swatch="bg-amber-500"
        />
      </StatTileRow>

      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <HeadcountByDepartment data={stats?.byDepartment ?? []} total={stats?.total ?? 0} />
        </div>
        <AdminActivityFeed logs={activity} forbidden={activityForbidden} />
      </div>

      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <WorkforceStatusBar byStatus={stats?.byStatus ?? {}} total={stats?.total ?? 0} />
        </div>

        {/* Quick actions */}
        <div className="rounded-md border border-hairline bg-surface p-5">
          <h3 className="text-[12.5px] font-semibold text-ink">Quick Actions</h3>
          <p className="mt-0.5 text-[11px] text-ink-3">Common workforce operations</p>

          <div className="mt-4 space-y-1">
            {[
              { to: '/employees/new', icon: UserPlus, label: 'Onboard an employee' },
              { to: '/employees', icon: UsersRound, label: 'Browse the directory' },
              { to: '/organization/departments', icon: Network, label: 'Manage departments' },
              { to: '/security/users', icon: Send, label: 'Invite an administrator' },
            ].map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="group flex items-center gap-2.5 rounded-md px-2 py-2 text-[11.5px] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <action.icon className="h-3.5 w-3.5 shrink-0 text-ink-3" />
                <span className="truncate">{action.label}</span>
                <ArrowRight className="ml-auto h-3 w-3 shrink-0 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
