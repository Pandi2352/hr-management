import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Shuffle,
  Users,
  UserCheck,
  Plus,
  Search,
  RefreshCw,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { PageHeader } from '../../../components/common/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Avatar } from '../../../components/ui/Avatar';
import { useToast } from '../../../components/ui/toast';
import { lifecycleApi } from '../api/lifecycle.api';
import { InitiateTransitionModal } from '../components/InitiateTransitionModal';
import type {
  LifecycleTransition,
  TransitionMetrics,
  CreateTransitionPayload,
} from '../types/lifecycle.types';

export function PromotionsTransfersPage() {
  const toast = useToast();
  const navigate = useNavigate();

  const [transitions, setTransitions] = useState<LifecycleTransition[]>([]);
  const [metrics, setMetrics] = useState<TransitionMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [page] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTransitions = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await lifecycleApi.getTransitions({
        search: search.trim() || undefined,
        type: selectedType !== 'ALL' ? selectedType : undefined,
        page,
        pageSize,
      });
      setTransitions(res.data || []);
      if (res.meta?.metrics) {
        setMetrics(res.meta.metrics);
      }
      setTotal(res.meta?.total || (res.data || []).length);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to fetch transitions.');
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedType, page, pageSize, toast]);

  useEffect(() => {
    fetchTransitions();
  }, [fetchTransitions]);

  const handleCreateTransition = async (payload: CreateTransitionPayload) => {
    try {
      setIsSubmitting(true);
      await lifecycleApi.createTransition(payload);
      toast.success('Lifecycle transition executed and applied successfully', 'Transition Recorded');
      setIsModalOpen(false);
      fetchTransitions();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to create transition');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'PROMOTION':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60">
            <TrendingUp className="h-3 w-3" />
            Promotion
          </span>
        );
      case 'DEPARTMENT_TRANSFER':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200/60 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800/60">
            <Shuffle className="h-3 w-3" />
            Transfer
          </span>
        );
      case 'MANAGER_CHANGE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60">
            <Users className="h-3 w-3" />
            Manager Realignment
          </span>
        );
      case 'CONFIRMATION':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60">
            <UserCheck className="h-3 w-3" />
            Confirmation
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="Promotions, Transfers & Role Movements"
        description="Audit all internal staff promotions, lateral department transfers, and manager reassignments with full organizational history."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTransitions}
              disabled={isLoading}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Initiate Transition</span>
            </Button>
          </div>
        }
      />

      {/* 4 Interactive Color Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Movements */}
        <button
          type="button"
          onClick={() => setSelectedType('ALL')}
          className={`p-4 rounded-md border text-left transition-all cursor-pointer ${
            selectedType === 'ALL'
              ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 ring-1 ring-indigo-600'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Movements</span>
            <div className="h-8 w-8 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 flex items-center justify-center">
              <Shuffle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {metrics?.totalTransitions ?? '...'}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">All recorded organizational changes</p>
        </button>

        {/* Card 2: Promotions */}
        <button
          type="button"
          onClick={() => setSelectedType('PROMOTION')}
          className={`p-4 rounded-md border text-left transition-all cursor-pointer ${
            selectedType === 'PROMOTION'
              ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/20 ring-1 ring-purple-600'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Promotions</span>
            <div className="h-8 w-8 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-purple-600 dark:text-purple-400">
            {metrics?.promotions ?? '...'}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Seniority & grade advancements</p>
        </button>

        {/* Card 3: Department Transfers */}
        <button
          type="button"
          onClick={() => setSelectedType('DEPARTMENT_TRANSFER')}
          className={`p-4 rounded-md border text-left transition-all cursor-pointer ${
            selectedType === 'DEPARTMENT_TRANSFER'
              ? 'border-teal-600 bg-teal-50/50 dark:bg-teal-950/20 ring-1 ring-teal-600'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Department Transfers</span>
            <div className="h-8 w-8 rounded-md bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-teal-600 dark:text-teal-400">
            {metrics?.transfers ?? '...'}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Lateral cross-functional shifts</p>
        </button>

        {/* Card 4: Manager Changes */}
        <button
          type="button"
          onClick={() => setSelectedType('MANAGER_CHANGE')}
          className={`p-4 rounded-md border text-left transition-all cursor-pointer ${
            selectedType === 'MANAGER_CHANGE'
              ? 'border-amber-600 bg-amber-50/50 dark:bg-amber-950/20 ring-1 ring-amber-600'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Manager Changes</span>
            <div className="h-8 w-8 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {metrics?.managerChanges ?? '...'}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Reporting line adjustments</p>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search transition title, employee name, or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-hidden"
          >
            <option value="ALL">All Transition Types</option>
            <option value="PROMOTION">Promotions</option>
            <option value="DEPARTMENT_TRANSFER">Department Transfers</option>
            <option value="MANAGER_CHANGE">Manager Changes</option>
            <option value="CONFIRMATION">Confirmations</option>
          </select>
        </div>

        {(search || selectedType !== 'ALL') && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setSelectedType('ALL');
            }}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 cursor-pointer"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Roster Table */}
      <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/50 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Transition</th>
                <th className="py-3 px-4">Organizational Realignment</th>
                <th className="py-3 px-4">Effective Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Timeline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading transition records...
                  </td>
                </tr>
              ) : transitions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No transition records found. Click "Initiate Transition" to record a promotion or transfer.
                  </td>
                </tr>
              ) : (
                transitions.map((t) => (
                  <tr
                    key={t._id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors"
                  >
                    {/* Employee Profile (Square Avatar) */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={t.employee?.avatarUrl}
                          name={t.employee?.displayName || 'Employee'}
                          size="sm"
                          shape="rounded"
                        />
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {t.employee?.displayName || 'Unknown Employee'}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {t.employee?.employeeCode} • {t.employee?.departmentName}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Transition Info */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        {getTypeBadge(t.type)}
                        <p className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                          {t.title}
                        </p>
                        {t.justification && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 italic">
                            "{t.justification}"
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Before -> After Diff */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        {t.type === 'PROMOTION' && (
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 line-through">
                              {t.previousState?.designationTitle || 'Previous'}
                            </span>
                            <ArrowRight className="h-3 w-3 text-slate-400" />
                            <span className="px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-semibold">
                              {t.newState?.designationTitle || 'New Role'}
                            </span>
                          </div>
                        )}

                        {t.type === 'DEPARTMENT_TRANSFER' && (
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {t.previousState?.departmentName || 'Previous Dept'}
                            </span>
                            <ArrowRight className="h-3 w-3 text-slate-400" />
                            <span className="px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 font-semibold">
                              {t.newState?.departmentName || 'New Dept'}
                            </span>
                          </div>
                        )}

                        {t.type === 'MANAGER_CHANGE' && (
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {t.previousState?.managerName || 'None'}
                            </span>
                            <ArrowRight className="h-3 w-3 text-slate-400" />
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-semibold">
                              {t.newState?.managerName || 'New Manager'}
                            </span>
                          </div>
                        )}

                        {t.type === 'CONFIRMATION' && (
                          <span className="text-[11px] text-emerald-600 font-semibold">
                            Full-time Confirmation
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Effective Date */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      {t.effectiveDate}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        {t.status}
                      </span>
                    </td>

                    {/* Timeline Action */}
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(`/employees/${t.employeeId}?tab=timeline`)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        <span>History</span>
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-4 py-3 text-xs text-slate-500">
          <span>Showing {transitions.length} of {total} total transitions</span>
          <span>Page {page}</span>
        </div>
      </div>

      {/* Modal */}
      <InitiateTransitionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateTransition}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
