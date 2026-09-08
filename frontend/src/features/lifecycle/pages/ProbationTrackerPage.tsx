import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Search,
  RefreshCw,
  Star,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { PageHeader } from '../../../components/common/PageHeader';
import { Button } from '../../../components/ui/Button';
import { Avatar } from '../../../components/ui/Avatar';
import { useToast } from '../../../components/ui/toast';
import { lifecycleApi } from '../api/lifecycle.api';
import { organizationApi } from '../../organization/api/organization.api';
import { ProbationEvaluationModal } from '../components/ProbationEvaluationModal';
import type {
  ProbationReview,
  ProbationMetrics,
  RatingDimension,
} from '../types/lifecycle.types';
import type { Department } from '../../organization/types/organization.types';

export function ProbationTrackerPage() {
  const toast = useToast();
  const navigate = useNavigate();

  const [reviews, setReviews] = useState<ProbationReview[]>([]);
  const [metrics, setMetrics] = useState<ProbationMetrics | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('ALL');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [page] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // Modal state
  const [selectedReview, setSelectedReview] = useState<ProbationReview | null>(null);
  const [modalMode, setModalMode] = useState<'EVALUATE' | 'SIGNOFF'>('EVALUATE');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProbations = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await lifecycleApi.getProbations({
        search: search.trim() || undefined,
        status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
        urgency: selectedUrgency !== 'ALL' ? selectedUrgency : undefined,
        departmentId: selectedDepartment !== 'ALL' ? selectedDepartment : undefined,
        page,
        pageSize,
      });
      setReviews(res.data || []);
      if (res.meta?.metrics) {
        setMetrics(res.meta.metrics);
      }
      setTotal(res.meta?.total || (res.data || []).length);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to fetch probation records.');
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedStatus, selectedUrgency, selectedDepartment, page, pageSize, toast]);

  useEffect(() => {
    fetchProbations();
  }, [fetchProbations]);

  useEffect(() => {
    organizationApi
      .getDepartments()
      .then((data) => setDepartments(Array.isArray(data) ? data : []))
      .catch(() => setDepartments([]));
  }, []);

  const handleOpenEvaluate = (review: ProbationReview) => {
    setSelectedReview(review);
    setModalMode('EVALUATE');
    setIsModalOpen(true);
  };

  const handleOpenSignoff = (review: ProbationReview) => {
    setSelectedReview(review);
    setModalMode('SIGNOFF');
    setIsModalOpen(true);
  };

  const handleSubmitEvaluate = async (
    id: string,
    ratings: RatingDimension[],
    recommendation: any,
    comments: string,
  ) => {
    try {
      setIsSubmitting(true);
      await lifecycleApi.evaluateProbation(id, {
        ratings,
        recommendation,
        managerComments: comments,
      });
      toast.success('Probation evaluation submitted successfully', 'Evaluation Saved');
      setIsModalOpen(false);
      fetchProbations();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to submit evaluation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitSignoff = async (id: string, action: any, notes: string) => {
    try {
      setIsSubmitting(true);
      await lifecycleApi.signoffProbation(id, {
        action,
        hrNotes: notes,
      });
      toast.success('Probation decision finalized successfully', 'Sign-off Recorded');
      setIsModalOpen(false);
      fetchProbations();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to sign-off probation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_EVALUATION':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60">
            Pending Evaluation
          </span>
        );
      case 'UNDER_HR_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60">
            Under HR Review
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60">
            Confirmed Regular
          </span>
        );
      case 'EXTENDED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/60 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60">
            Extended
          </span>
        );
      case 'TERMINATED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60">
            Separated
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {status}
          </span>
        );
    }
  };

  const getUrgencyBadge = (review: ProbationReview) => {
    if (review.status === 'CONFIRMED') {
      return (
        <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Confirmed
        </span>
      );
    }
    if (review.status === 'TERMINATED') {
      return <span className="text-[11px] font-medium text-slate-400">Closed</span>;
    }
    if (review.isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
          <AlertTriangle className="h-3 w-3" />
          {Math.abs(review.daysRemaining)}d Overdue
        </span>
      );
    }
    if (review.isDueSoon) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          <Clock className="h-3 w-3" />
          {review.daysRemaining}d Due Soon
        </span>
      );
    }
    return (
      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
        {review.daysRemaining}d left
      </span>
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Probation & Confirmation Management"
        description="Oversee 30/60/90-day evaluation milestones, evaluate candidate competency, and record official employment confirmations."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchProbations}
              disabled={isLoading}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/lifecycle/transitions')}
              className="flex items-center gap-1.5 cursor-pointer"
            >
              <span>View Promotions & Transfers</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        }
      />

      {/* 4 Interactive Color Stat Cards (Click to Filter) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Probationers */}
        <button
          type="button"
          onClick={() => {
            setSelectedStatus('ALL');
            setSelectedUrgency('ALL');
          }}
          className={`p-4 rounded-md border text-left transition-all cursor-pointer ${
            selectedStatus === 'ALL' && selectedUrgency === 'ALL'
              ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 ring-1 ring-indigo-600'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Probationers</span>
            <div className="h-8 w-8 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {metrics?.totalProbationers ?? '...'}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Active roster candidates on probation</p>
        </button>

        {/* Card 2: Due in 15 Days */}
        <button
          type="button"
          onClick={() => {
            setSelectedUrgency('15_DAYS');
            setSelectedStatus('ALL');
          }}
          className={`p-4 rounded-md border text-left transition-all cursor-pointer ${
            selectedUrgency === '15_DAYS'
              ? 'border-amber-600 bg-amber-50/50 dark:bg-amber-950/20 ring-1 ring-amber-600'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Due in 15 Days</span>
            <div className="h-8 w-8 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {metrics?.dueIn15Days ?? '...'}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Evaluations requiring manager sign-off</p>
        </button>

        {/* Card 3: Overdue Evaluations */}
        <button
          type="button"
          onClick={() => {
            setSelectedUrgency('OVERDUE');
            setSelectedStatus('ALL');
          }}
          className={`p-4 rounded-md border text-left transition-all cursor-pointer ${
            selectedUrgency === 'OVERDUE'
              ? 'border-rose-600 bg-rose-50/50 dark:bg-rose-950/20 ring-1 ring-rose-600'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Overdue Reviews</span>
            <div className="h-8 w-8 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 flex items-center justify-center">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {metrics?.overdue ?? '...'}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Exceeded standard probation milestone</p>
        </button>

        {/* Card 4: Confirmed this Month */}
        <button
          type="button"
          onClick={() => {
            setSelectedStatus('CONFIRMED');
            setSelectedUrgency('ALL');
          }}
          className={`p-4 rounded-md border text-left transition-all cursor-pointer ${
            selectedStatus === 'CONFIRMED'
              ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 ring-1 ring-emerald-600'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Confirmed this Month</span>
            <div className="h-8 w-8 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {metrics?.confirmedThisMonth ?? '...'}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Successfully transitioned to ACTIVE</p>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search candidate name, employee code, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900 focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          {/* Department Filter */}
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-hidden"
          >
            <option value="ALL">All Departments</option>
            {departments.map((dept) => (
              <option key={dept._id} value={dept._id}>
                {dept.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus:outline-hidden"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING_EVALUATION">Pending Evaluation</option>
            <option value="UNDER_HR_REVIEW">Under HR Review</option>
            <option value="CONFIRMED">Confirmed Regular</option>
            <option value="EXTENDED">Extended</option>
            <option value="TERMINATED">Terminated</option>
          </select>
        </div>

        {/* Clear Filters Button */}
        {(search || selectedStatus !== 'ALL' || selectedUrgency !== 'ALL' || selectedDepartment !== 'ALL') && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setSelectedStatus('ALL');
              setSelectedUrgency('ALL');
              setSelectedDepartment('ALL');
            }}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 cursor-pointer"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Probation Review Roster Table */}
      <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-900/50 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Employee Candidate</th>
                <th className="py-3 px-4">Department & Role</th>
                <th className="py-3 px-4">Milestone Dates</th>
                <th className="py-3 px-4">Urgency</th>
                <th className="py-3 px-4">Review Status</th>
                <th className="py-3 px-4">Score</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading probation records...
                  </td>
                </tr>
              ) : reviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No probation records match your active criteria.
                  </td>
                </tr>
              ) : (
                reviews.map((rev) => (
                  <tr
                    key={rev._id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40 transition-colors"
                  >
                    {/* Employee Profile (Square Avatar) */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={rev.employee?.avatarUrl}
                          name={rev.employee?.displayName || 'Employee'}
                          size="sm"
                          shape="rounded"
                        />
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100">
                            {rev.employee?.displayName || 'Unknown Employee'}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {rev.employee?.employeeCode} • {rev.employee?.workEmail}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Department & Role */}
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {rev.employee?.designationTitle}
                      </p>
                      <p className="text-[11px] text-slate-400">{rev.employee?.departmentName}</p>
                    </td>

                    {/* Dates */}
                    <td className="py-3.5 px-4 font-mono text-[11px]">
                      <span className="text-slate-500 block">End: {rev.probationEndDate}</span>
                      <span className="text-slate-400 text-[10px]">Joined: {rev.joiningDate || 'N/A'}</span>
                    </td>

                    {/* Urgency */}
                    <td className="py-3.5 px-4">{getUrgencyBadge(rev)}</td>

                    {/* Review Status */}
                    <td className="py-3.5 px-4">{getStatusBadge(rev.status)}</td>

                    {/* Score */}
                    <td className="py-3.5 px-4 font-mono">
                      {rev.overallScore > 0 ? (
                        <span className="inline-flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {rev.overallScore.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Unscored</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {rev.status !== 'CONFIRMED' && rev.status !== 'TERMINATED' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEvaluate(rev)}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-[#524b6e] hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 transition-colors cursor-pointer"
                            >
                              Evaluate
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenSignoff(rev)}
                              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 transition-colors cursor-pointer"
                            >
                              Sign Off
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => navigate(`/employees/${rev.employeeId}`)}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                          title="View Employee Profile"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 px-4 py-3 text-xs text-slate-500">
          <span>Showing {reviews.length} of {total} total probationers</span>
          <span>Page {page}</span>
        </div>
      </div>

      {/* Evaluation & Sign-off Modal */}
      <ProbationEvaluationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        review={selectedReview}
        mode={modalMode}
        onSubmitEvaluate={handleSubmitEvaluate}
        onSubmitSignoff={handleSubmitSignoff}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
