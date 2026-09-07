import { useCallback, useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Search as SearchIcon,
  Monitor,
  Smartphone,
  Tablet,
  TerminalSquare,
  TriangleAlert,
} from 'lucide-react';
import { SelectField, SearchInput, Button } from '../../../components/ui';
import { PageHeader } from '../../../components/common/PageHeader';
import { Pagination } from '../../../components/data-table/Pagination';
import { Spinner } from '../../../components/ui/Spinner';
import { cn } from '../../../utils/cn';
import { auditApi } from '../api/audit.api';
import { relativeTime } from '../types/audit.types';
import type { LoginAttempt, SuspiciousIp } from '../types/login-history.types';
import type { AuditMeta } from '../types/audit.types';

const DEVICE_ICONS: Record<string, typeof Monitor> = {
  Desktop: Monitor,
  Mobile: Smartphone,
  Tablet: Tablet,
  'API Client': TerminalSquare,
};

/** Raw reason codes read poorly in a table. */
const REASON_LABELS: Record<string, string> = {
  USER_NOT_FOUND: 'Unknown account',
  INVALID_PASSWORD: 'Wrong password',
  ACCOUNT_LOCKED: 'Account locked',
  ACCOUNT_INACTIVE: 'Account inactive',
};

export function LoginHistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [attempts, setAttempts] = useState<LoginAttempt[]>([]);
  const [meta, setMeta] = useState<AuditMeta | null>(null);
  const [suspicious, setSuspicious] = useState<SuspiciousIp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const search = searchParams.get('search') ?? '';
  const outcome = searchParams.get('outcome') ?? 'ALL';
  const page = Number(searchParams.get('page') ?? 1);
  const limit = Number(searchParams.get('limit') ?? 25);

  const patchParams = useCallback(
    (patch: Record<string, string | number | undefined>, resetPage = true) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(patch).forEach(([key, value]) => {
        if (value === undefined || value === '' || value === 'ALL') next.delete(key);
        else next.set(key, String(value));
      });
      if (resetPage) next.delete('page');
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await auditApi.getLoginHistory({ search, outcome, page, limit });
      setAttempts(res.data);
      setMeta(res.meta);
    } catch (err: any) {
      setError(
        err?.response?.status === 403
          ? "You don't have permission to view login history."
          : err?.response?.data?.message || 'Failed to load login history.',
      );
      setAttempts([]);
      setMeta(null);
    } finally {
      setIsLoading(false);
    }
  }, [search, outcome, page, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    auditApi.getSuspiciousLogins().then(setSuspicious).catch(() => setSuspicious([]));
  }, []);

  const hasActiveFilters = !!search || outcome !== 'ALL';

  // Compute quick KPI metrics for current set
  const stats = useMemo(() => {
    const total = meta?.total ?? attempts.length;
    let success = 0;
    let failure = 0;
    attempts.forEach((a) => {
      if (a.success) success++;
      else failure++;
    });
    const successRate = attempts.length > 0 ? Math.round((success / attempts.length) * 100) : 100;
    return { total, success, failure, successRate };
  }, [meta, attempts]);

  return (
    <div className="w-full space-y-4">
      <PageHeader
        title="Login History"
        description="Authentication attempts with device, network, and failure context."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
            className="rounded-md h-9 text-xs font-medium border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 shadow-xs"
          >
            <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5 text-violet-600 dark:text-violet-400', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        }
      />

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total Attempts (Violet Theme) */}
        <div className="rounded-md border border-violet-200/80 bg-gradient-to-br from-violet-50/80 via-white to-violet-50/30 dark:from-violet-950/30 dark:via-slate-900 dark:to-slate-900 dark:border-violet-900/50 p-3.5 shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Monitor className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-400">
              Total Recorded
            </p>
            <p className="text-xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {stats.total.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Card 2: Success Rate (Emerald Theme) */}
        <div className="rounded-md border border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30 dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900 dark:border-emerald-900/50 p-3.5 shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Success Rate
            </p>
            <p className="text-xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {stats.successRate}%
            </p>
          </div>
        </div>

        {/* Card 3: Failed Logins (Rose Theme) */}
        <div className="rounded-md border border-rose-200/80 bg-gradient-to-br from-rose-50/80 via-white to-rose-50/30 dark:from-rose-950/30 dark:via-slate-900 dark:to-slate-900 dark:border-rose-900/50 p-3.5 shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              Failed Logins
            </p>
            <p className="text-xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {stats.failure.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Card 4: Flagged Sources (Amber Theme) */}
        <div className="rounded-md border border-amber-200/80 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30 dark:from-amber-950/30 dark:via-slate-900 dark:to-slate-900 dark:border-amber-900/50 p-3.5 shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <TriangleAlert className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Suspicious IPs
            </p>
            <p className="text-xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {suspicious.length}
            </p>
          </div>
        </div>
      </div>

      {/* Suspicious-pattern banner — computed from repeated recent failures */}
      {suspicious.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3.5 py-2.5 dark:border-amber-900 dark:bg-amber-950/40 shadow-xs">
          <div className="flex items-start gap-2.5">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="min-w-0">
              <p className="text-[11.5px] font-semibold text-amber-800 dark:text-amber-300">
                {suspicious.length} address{suspicious.length === 1 ? '' : 'es'} with repeated failures in the last 24h
              </p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                {suspicious.slice(0, 4).map((s) => (
                  <button
                    key={s.ipAddress}
                    type="button"
                    onClick={() => patchParams({ search: s.ipAddress, outcome: 'FAILURE' })}
                    className="cursor-pointer text-[11px] text-amber-700 underline-offset-2 hover:underline dark:text-amber-400"
                  >
                    <span className="font-mono">{s.ipAddress}</span> — {s.failures} failures across{' '}
                    {s.distinctAccounts} account{s.distinctAccounts === 1 ? '' : 's'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rich Colorful Filter Panel Card */}
      <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3.5 transition-all">
        {/* Top: Quick Scope Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">
              Filter By:
            </span>
            {[
              { id: 'ALL', label: 'All Attempts' },
              { id: 'SUCCESS', label: 'Successful Only' },
              { id: 'FAILURE', label: 'Failed Attempts' },
            ].map((tab) => {
              const isActive = outcome === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => patchParams({ outcome: tab.id === 'ALL' ? undefined : tab.id })}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer select-none',
                    isActive
                      ? 'bg-violet-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
                  )}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {meta && !isLoading && (
            <span className="text-[11px] tabular-nums text-slate-400 dark:text-slate-500 font-medium">
              Showing <span className="font-bold text-slate-700 dark:text-slate-300">{attempts.length}</span> of {meta.total.toLocaleString()} attempts
            </span>
          )}
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div className="sm:col-span-8">
            <SearchInput
              label="Search Identity or IP"
              value={search}
              onChange={(val) => patchParams({ search: val })}
              onClear={() => patchParams({ search: undefined })}
              placeholder="Search by email address, IP address or failure reason…"
            />
          </div>

          <div className="sm:col-span-4">
            <SelectField
              label="Outcome Status"
              value={outcome}
              onChange={(e) => patchParams({ outcome: e.target.value })}
              options={[
                { value: 'ALL', label: 'All Outcomes' },
                { value: 'SUCCESS', label: 'Successful Only' },
                { value: 'FAILURE', label: 'Failed Only' },
              ]}
            />
          </div>
        </div>

        {/* Active Filter Badges Strip */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-semibold text-slate-400">Active Filters:</span>
            {search && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border border-violet-200 dark:border-violet-900">
                Search: <strong className="font-semibold">"{search}"</strong>
                <button
                  type="button"
                  onClick={() => patchParams({ search: undefined })}
                  className="ml-0.5 hover:text-violet-900 dark:hover:text-violet-100 cursor-pointer"
                >
                  ✕
                </button>
              </span>
            )}
            {outcome !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border border-violet-200 dark:border-violet-900">
                Outcome: <strong className="font-semibold">{outcome === 'SUCCESS' ? 'Successful' : 'Failed'}</strong>
                <button
                  type="button"
                  onClick={() => patchParams({ outcome: undefined })}
                  className="ml-0.5 hover:text-violet-900 dark:hover:text-violet-100 cursor-pointer"
                >
                  ✕
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={() => setSearchParams(new URLSearchParams(), { replace: true })}
              className="ml-auto text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 cursor-pointer transition-colors"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-hairline bg-surface p-12">
          <Spinner size="lg" variant="violet" />
          <p className="animate-pulse text-xs font-medium text-ink-3">Loading login history…</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-hairline bg-surface p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-ink">Unable to show login history</h3>
          <p className="mt-1 max-w-sm text-xs text-ink-3">{error}</p>
        </div>
      ) : attempts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-hairline bg-surface p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-surface-2 text-ink-3">
            <SearchIcon className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-ink">
            {hasActiveFilters ? 'No attempts match these filters' : 'No login attempts recorded'}
          </h3>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-hairline bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-hairline bg-surface-2 text-[10.5px] font-medium uppercase tracking-[0.06em] text-ink-3">
                  <th className="px-3 py-2 font-medium whitespace-nowrap">When</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Account</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Outcome</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Reason</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">IP Address</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Device</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {attempts.map((a) => {
                  const DeviceIcon = DEVICE_ICONS[a.deviceType] || Monitor;
                  return (
                    <tr key={a._id} className="transition-colors hover:bg-surface-2">
                      <td
                        className="whitespace-nowrap px-3 py-2 align-middle text-[11.5px] text-ink-3"
                        title={new Date(a.createdAt).toLocaleString()}
                      >
                        {relativeTime(a.createdAt)}
                      </td>
                      <td className="px-3 py-2 align-middle text-[12px] text-ink">{a.email}</td>
                      <td className="whitespace-nowrap px-3 py-2 align-middle">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold',
                            a.success
                              ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50'
                              : 'text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/50',
                          )}
                        >
                          {a.success ? (
                            <ShieldCheck className="h-3 w-3" />
                          ) : (
                            <ShieldAlert className="h-3 w-3" />
                          )}
                          {a.success ? 'Success' : 'Failed'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 align-middle text-[11.5px] text-ink-2">
                        {a.failureReason ? REASON_LABELS[a.failureReason] || a.failureReason : '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 align-middle font-mono text-[11px] text-ink-3">
                        {a.ipAddress}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 align-middle">
                        <span
                          className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-2"
                          title={a.userAgent}
                        >
                          <DeviceIcon className="h-3.5 w-3.5 text-ink-3" />
                          {a.deviceType}
                          {a.browser !== 'Unknown' && (
                            <span className="text-ink-3">· {a.browser}</span>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {meta && meta.total > 0 && !error && (
        <Pagination
          page={meta.page}
          pageSize={meta.limit}
          totalItems={meta.total}
          pageSizeOptions={[25, 50, 100]}
          onPageChange={(p) => patchParams({ page: p }, false)}
          onPageSizeChange={(size) => patchParams({ limit: size })}
          loading={isLoading}
        />
      )}
    </div>
  );
}
