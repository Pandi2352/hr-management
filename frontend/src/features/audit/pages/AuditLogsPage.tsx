import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Download,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Search as SearchIcon,
  Filter,
  Layers,
  Lock,
  Activity,
  Calendar,
  RotateCcw,
  X,
  Sparkles,
} from 'lucide-react';
import { SelectField, SearchInput, Button } from '../../../components/ui';
import { PageHeader } from '../../../components/common/PageHeader';
import { Pagination } from '../../../components/data-table/Pagination';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/toast';
import { cn } from '../../../utils/cn';
import { auditApi } from '../api/audit.api';
import { AuditDetailDrawer } from '../components/AuditDetailDrawer';
import {
  auditActionTone,
  humanizeAction,
  humanizeResource,
  relativeTime,
  type AuditLog,
  type AuditMeta,
  type AuditVocabulary,
} from '../types/audit.types';

/** Quick category scope tabs. */
const CATEGORY_TABS = [
  { id: 'ALL', label: 'All Operations', icon: Layers },
  { id: 'SECURITY', label: 'Security & Auth', icon: Lock },
  { id: 'USER', label: 'User Management', icon: ShieldCheck },
  { id: 'EMPLOYEE', label: 'Employee Records', icon: Activity },
  { id: 'ORGANIZATION', label: 'Organization', icon: Sparkles },
] as const;

/** Date presets from checklist §12 with custom date range option. */
const DATE_PRESETS = [
  { value: 'ALL', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'custom', label: 'Custom range…' },
];

function presetToRange(preset: string, customFrom?: string, customTo?: string): { from?: string; to?: string } {
  if (preset === 'custom') {
    return {
      from: customFrom ? new Date(customFrom).toISOString() : undefined,
      to: customTo ? new Date(`${customTo}T23:59:59.999Z`).toISOString() : undefined,
    };
  }

  const startOfDay = (d: Date) => {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy.toISOString();
  };
  const endOfDay = (d: Date) => {
    const copy = new Date(d);
    copy.setHours(23, 59, 59, 999);
    return copy.toISOString();
  };

  const now = new Date();
  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case '7d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return { from: startOfDay(d), to: endOfDay(now) };
    }
    case '30d': {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return { from: startOfDay(d), to: endOfDay(now) };
    }
    default:
      return {};
  }
}

export function AuditLogsPage() {
  const toast = useToast();
  // Filters live in the URL so a filtered view is shareable and survives reload (§13).
  const [searchParams, setSearchParams] = useSearchParams();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [meta, setMeta] = useState<AuditMeta | null>(null);
  const [vocabulary, setVocabulary] = useState<AuditVocabulary | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const search = searchParams.get('search') ?? '';
  const action = searchParams.get('action') ?? 'ALL';
  const resourceType = searchParams.get('resourceType') ?? 'ALL';
  const status = searchParams.get('status') ?? 'ALL';
  const datePreset = searchParams.get('date') ?? 'ALL';
  const customFrom = searchParams.get('customFrom') ?? '';
  const customTo = searchParams.get('customTo') ?? '';
  const activeCategory = searchParams.get('category') ?? 'ALL';
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

  const activeFilters = useMemo(
    () => ({
      search: search || undefined,
      action,
      resourceType,
      status,
      ...presetToRange(datePreset, customFrom, customTo),
    }),
    [search, action, resourceType, status, datePreset, customFrom, customTo],
  );

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await auditApi.getLogs({ ...activeFilters, page, limit });
      setLogs(res.data);
      setMeta(res.meta);
    } catch (err: any) {
      const errStatus = err?.response?.status;
      setError(
        errStatus === 403
          ? "You don't have permission to view the audit trail."
          : err?.response?.data?.message || 'Failed to load the audit trail.',
      );
      setLogs([]);
      setMeta(null);
    } finally {
      setIsLoading(false);
    }
  }, [activeFilters, page, limit]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    auditApi.getVocabulary().then(setVocabulary).catch(() => setVocabulary(undefined));
  }, []);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await auditApi.exportLogs(activeFilters);
      toast.success('Audit log export downloaded', 'Export complete');
    } catch (err: any) {
      toast.error(
        err?.response?.status === 403
          ? 'You do not have permission to export audit logs.'
          : 'Failed to export audit logs.',
      );
    } finally {
      setIsExporting(false);
    }
  };

  const hasActiveFilters =
    !!search ||
    action !== 'ALL' ||
    resourceType !== 'ALL' ||
    status !== 'ALL' ||
    datePreset !== 'ALL' ||
    !!customFrom ||
    !!customTo ||
    activeCategory !== 'ALL';

  // Compute live KPI metrics
  const kpiStats = useMemo(() => {
    const total = meta?.total ?? logs.length;
    let success = 0;
    let failure = 0;
    let security = 0;

    logs.forEach((log) => {
      if (log.status === 'SUCCESS') success++;
      if (log.status === 'FAILURE') failure++;
      if (
        ['USER', 'ROLE', 'SECURITY_POLICY'].includes(log.resourceType) ||
        log.action.includes('LOGIN') ||
        log.action.includes('PASSWORD') ||
        log.action.includes('SESSION')
      ) {
        security++;
      }
    });

    return { total, success, failure, security };
  }, [meta, logs]);

  return (
    <div className="w-full space-y-4">
      {/* Page Header with Integrated Actions - No more empty gap */}
      <PageHeader
        title="Audit Trail"
        description="Immutable, append-only record of every administrative action across the platform."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
              className="rounded-md h-9 text-xs font-medium border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 shadow-xs"
            >
              <Download className="h-3.5 w-3.5 mr-1 text-slate-500" />
              {isExporting ? 'Exporting…' : 'Export CSV'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLogs}
              disabled={isLoading}
              className="rounded-md h-9 text-xs font-medium border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 shadow-xs"
            >
              <RefreshCw className={cn('h-3.5 w-3.5 mr-1 text-violet-600 dark:text-violet-400', isLoading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        }
      />

      {/* 4 Colorful KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total Events (Violet Theme) */}
        <div className="rounded-md border border-violet-200/80 bg-gradient-to-br from-violet-50/80 via-white to-violet-50/30 dark:from-violet-950/30 dark:via-slate-900 dark:to-slate-900 dark:border-violet-900/50 p-3.5 shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-violet-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Activity className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-400">
              Total Logged
            </p>
            <p className="text-xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {kpiStats.total.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Card 2: Successful Ops (Emerald Theme) */}
        <div className="rounded-md border border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30 dark:from-emerald-950/30 dark:via-slate-900 dark:to-slate-900 dark:border-emerald-900/50 p-3.5 shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Successful Ops
            </p>
            <p className="text-xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {logs.length > 0 ? `${Math.round((kpiStats.success / logs.length) * 100)}%` : '100%'}
            </p>
          </div>
        </div>

        {/* Card 3: Security & Access (Indigo Theme) */}
        <div className="rounded-md border border-indigo-200/80 bg-gradient-to-br from-indigo-50/80 via-white to-indigo-50/30 dark:from-indigo-950/30 dark:via-slate-900 dark:to-slate-900 dark:border-indigo-900/50 p-3.5 shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Lock className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
              Security & Auth
            </p>
            <p className="text-xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {kpiStats.security.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Card 4: Flagged / Failures (Rose Theme) */}
        <div className="rounded-md border border-rose-200/80 bg-gradient-to-br from-rose-50/80 via-white to-rose-50/30 dark:from-rose-950/30 dark:via-slate-900 dark:to-slate-900 dark:border-rose-900/50 p-3.5 shadow-xs flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              Failures / Alerts
            </p>
            <p className="text-xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
              {kpiStats.failure.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Rich Colorful Filter Panel Card */}
      <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3.5 transition-all">
        {/* Top: Category Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="h-3 w-3 text-violet-500" />
              Scope:
            </span>
            {CATEGORY_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    patchParams({
                      category: tab.id === 'ALL' ? undefined : tab.id,
                      resourceType: tab.id === 'ALL' ? undefined : tab.id === 'SECURITY' ? 'USER' : tab.id === 'EMPLOYEE' ? 'EMPLOYEE' : tab.id === 'ORGANIZATION' ? 'DEPARTMENT' : tab.id,
                    });
                  }}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer border select-none',
                    isActive
                      ? 'bg-violet-600 text-white border-violet-600 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {meta && !isLoading && (
            <div className="inline-flex items-center gap-1.5 rounded-md bg-violet-50 dark:bg-violet-950/40 px-2.5 py-1 border border-violet-100 dark:border-violet-900/40 text-[11px] font-semibold text-violet-700 dark:text-violet-300">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
              <span>{meta.total.toLocaleString()} total logged events</span>
            </div>
          )}
        </div>

        {/* Middle: Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {/* Search */}
          <div className="lg:col-span-1">
            <SearchInput
              label="Search Query"
              value={search}
              onChange={(val) => patchParams({ search: val })}
              onClear={() => patchParams({ search: undefined })}
              placeholder="Actor, IP, entity or ID…"
            />
          </div>

          {/* Resource Filter */}
          <div>
            <SelectField
              label="Module / Resource"
              value={resourceType}
              onChange={(e) => patchParams({ resourceType: e.target.value })}
              options={[
                { value: 'ALL', label: 'All Modules' },
                ...(vocabulary?.resources.map((r) => ({ value: r.value, label: r.label })) ?? []),
              ]}
            />
          </div>

          {/* Action Filter */}
          <div>
            <SelectField
              label="Action Type"
              value={action}
              onChange={(e) => patchParams({ action: e.target.value })}
              options={[
                { value: 'ALL', label: 'All Actions' },
                ...(vocabulary?.actions.map((a) => ({ value: a.value, label: a.label })) ?? []),
              ]}
            />
          </div>

          {/* Status Filter */}
          <div>
            <SelectField
              label="Operation Status"
              value={status}
              onChange={(e) => patchParams({ status: e.target.value })}
              options={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'SUCCESS', label: 'Success (Verified OK)' },
                { value: 'FAILURE', label: 'Failure (Alerted/Blocked)' },
              ]}
            />
          </div>

          {/* Date Filter */}
          <div>
            <SelectField
              label="Time Horizon"
              value={datePreset}
              onChange={(e) => patchParams({ date: e.target.value })}
              options={DATE_PRESETS}
            />
          </div>
        </div>

        {/* Optional Custom Date Range Inputs (visible if datePreset === 'custom') */}
        {datePreset === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 p-2.5 rounded-md">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-violet-500" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Custom Date Range:</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">From:</span>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => patchParams({ customFrom: e.target.value })}
                className="h-8 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:border-violet-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">To:</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => patchParams({ customTo: e.target.value })}
                className="h-8 rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:border-violet-400 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>
          </div>
        )}

        {/* Active Filter Badges & Reset */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active Filters:</span>

            {search && (
              <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 border border-violet-200 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:bg-violet-950/40 dark:border-violet-800 dark:text-violet-300">
                Search: "{search}"
                <X className="h-3 w-3 cursor-pointer hover:text-violet-900" onClick={() => patchParams({ search: undefined })} />
              </span>
            )}

            {activeCategory !== 'ALL' && (
              <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 border border-violet-200 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:bg-violet-950/40 dark:border-violet-800 dark:text-violet-300">
                Scope: {activeCategory}
                <X className="h-3 w-3 cursor-pointer hover:text-violet-900" onClick={() => patchParams({ category: undefined, resourceType: undefined })} />
              </span>
            )}

            {resourceType !== 'ALL' && (
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300">
                Module: {humanizeResource(resourceType, vocabulary?.resources)}
                <X className="h-3 w-3 cursor-pointer hover:text-blue-900" onClick={() => patchParams({ resourceType: undefined })} />
              </span>
            )}

            {action !== 'ALL' && (
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300">
                Action: {humanizeAction(action, vocabulary?.actions)}
                <X className="h-3 w-3 cursor-pointer hover:text-indigo-900" onClick={() => patchParams({ action: undefined })} />
              </span>
            )}

            {status !== 'ALL' && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold',
                  status === 'SUCCESS'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300',
                )}
              >
                Status: {status}
                <X className="h-3 w-3 cursor-pointer" onClick={() => patchParams({ status: undefined })} />
              </span>
            )}

            {datePreset !== 'ALL' && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300">
                Date: {DATE_PRESETS.find((d) => d.value === datePreset)?.label || datePreset}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-amber-900"
                  onClick={() => patchParams({ date: undefined, customFrom: undefined, customTo: undefined })}
                />
              </span>
            )}

            <button
              type="button"
              onClick={() => setSearchParams(new URLSearchParams(), { replace: true })}
              className="inline-flex items-center gap-1 ml-auto text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Reset All Filters
            </button>
          </div>
        )}
      </div>


      {/* Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-hairline bg-surface p-12">
          <Spinner size="lg" variant="violet" />
          <p className="animate-pulse text-xs font-medium text-ink-3">Loading audit trail…</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-hairline bg-surface p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-ink">Unable to show the audit trail</h3>
          <p className="mt-1 max-w-sm text-xs text-ink-3">{error}</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-hairline bg-surface p-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-surface-2 text-ink-3">
            <SearchIcon className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-sm font-semibold text-ink">
            {hasActiveFilters ? 'No events match these filters' : 'No audit events yet'}
          </h3>
          <p className="mt-1 max-w-sm text-xs text-ink-3">
            {hasActiveFilters
              ? 'Try widening the date range or clearing a filter.'
              : 'Administrative actions will appear here as they happen.'}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-hairline bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-hairline bg-surface-2 text-[10.5px] font-medium uppercase tracking-[0.06em] text-ink-3">
                  <th className="px-3 py-2 font-medium whitespace-nowrap">When</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Actor</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Action</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Resource</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">IP</th>
                  <th className="px-3 py-2 font-medium whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {logs.map((log) => {
                  const tone = auditActionTone(log.action);
                  return (
                    <tr
                      key={log._id}
                      onClick={() => setSelectedId(log._id)}
                      className="cursor-pointer transition-colors hover:bg-surface-2"
                    >
                      <td
                        className="whitespace-nowrap px-3 py-2 align-middle text-[11.5px] text-ink-3"
                        title={new Date(log.createdAt).toLocaleString()}
                      >
                        {relativeTime(log.createdAt)}
                      </td>

                      <td className="px-3 py-2 align-middle">
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-medium text-ink">
                            {log.actorName || log.actorEmail || 'System'}
                          </p>
                          {log.actorEmail && (
                            <p className="truncate text-[10.5px] text-ink-3">{log.actorEmail}</p>
                          )}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-3 py-2 align-middle">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold',
                            tone.chip,
                          )}
                        >
                          <span className={cn('h-1.5 w-1.5 rounded-full', tone.dot)} />
                          {humanizeAction(log.action, vocabulary?.actions)}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-3 py-2 align-middle text-[11.5px] text-ink-2">
                        {humanizeResource(log.resourceType, vocabulary?.resources)}
                      </td>

                      <td className="max-w-sm px-3 py-2 align-middle">
                        <p className="truncate text-[11.5px] text-ink-2" title={log.description}>
                          {log.description || '—'}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-3 py-2 align-middle font-mono text-[11px] text-ink-3">
                        {log.ipAddress || '—'}
                      </td>

                      <td className="whitespace-nowrap px-3 py-2 align-middle">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold',
                            log.status === 'SUCCESS'
                              ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50'
                              : 'text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/50',
                          )}
                        >
                          {log.status === 'SUCCESS' ? (
                            <ShieldCheck className="h-3 w-3" />
                          ) : (
                            <ShieldAlert className="h-3 w-3" />
                          )}
                          {log.status === 'SUCCESS' ? 'OK' : 'Failed'}
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

      <AuditDetailDrawer
        auditId={selectedId}
        vocabulary={vocabulary}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
