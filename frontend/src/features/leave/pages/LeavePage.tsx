import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { PageHeader } from '../../../components/common/PageHeader';
import { SegmentedTabs } from '../../../components/ui';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/toast';
import { useAuth } from '../../auth/context/AuthContext';
import { leaveApi } from '../api/leave.api';
import type { MyLeaveSummary } from '../types/leave-balance.types';
import { MyLeaveBalances } from '../components/MyLeaveBalances';
import { TeamLeaveBalances } from '../components/TeamLeaveBalances';
import { LeaveTypesManager } from '../components/LeaveTypesManager';

type LeaveTab = 'mine' | 'team' | 'types';

function isHr(userRoles?: string[]) {
  return Boolean(
    userRoles?.some((r) => ['SUPER_ADMIN', 'HR_ADMIN'].includes(r.toUpperCase())),
  );
}

export function LeavePage() {
  const toast = useToast();
  const { user } = useAuth();
  const hr = isHr(user?.roles);
  const [tab, setTab] = useState<LeaveTab>('mine');
  const [myYear, setMyYear] = useState(() => new Date().getFullYear());
  const [teamYear, setTeamYear] = useState(() => new Date().getFullYear());
  const [summary, setSummary] = useState<MyLeaveSummary | null>(null);
  const [isLoadingMine, setIsLoadingMine] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoadingMine(true);
    leaveApi
      .getMyBalances(myYear)
      .then((data) => {
        if (active) setSummary(data);
      })
      .catch((err: any) => {
        if (active) {
          if (err?.response?.status !== 404) {
            toast.error(err?.response?.data?.message || 'Could not load your leave balances.');
          }
          setSummary(null);
        }
      })
      .finally(() => {
        if (active) setIsLoadingMine(false);
      });
    return () => {
      active = false;
    };
  }, [myYear, toast]);

  const tabs: { id: LeaveTab; label: string; visible: boolean }[] = [
    { id: 'mine', label: 'My Balances', visible: true },
    { id: 'team', label: 'Team Balances', visible: hr },
    { id: 'types', label: 'Leave Types', visible: hr },
  ];

  return (
    <div className="w-full space-y-4">
      <PageHeader
        title="Leaves"
        description="Yearly leave wallets, carry-forward balances and holiday entitlements."
        actions={
          <Link
            to="/holidays"
            className="flex items-center gap-1.5 rounded-md border border-teal-700 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-950/40"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            Holiday Calendar
          </Link>
        }
      />

      <SegmentedTabs<LeaveTab>
        active={tab}
        onChange={setTab}
        tabs={tabs.filter((t) => t.visible).map((t) => ({ id: t.id, label: t.label }))}
      />

      {tab === 'mine' &&
        (isLoadingMine ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" variant="violet" />
          </div>
        ) : summary ? (
          <MyLeaveBalances summary={summary} isLoading={false} year={myYear} onYearChange={setMyYear} />
        ) : (
          <div className="rounded-md border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              No employee record linked to this login
            </p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-slate-400">
              Leave wallets appear once HR links your employee file and assigns balances.
            </p>
          </div>
        ))}

      {tab === 'team' && hr && <TeamLeaveBalances year={teamYear} onYearChange={setTeamYear} />}

      {tab === 'types' && hr && <LeaveTypesManager />}
    </div>
  );
}

export default LeavePage;
