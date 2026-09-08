import { useState, useEffect } from 'react';
import { Plus, Search, Sparkles } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useToast } from '../../../components/ui/toast';
import { onboardingApi } from '../api/onboarding.api';
import { OnboardingMetricsGrid } from '../components/OnboardingMetricsGrid';
import { OnboardingRosterTable } from '../components/OnboardingRosterTable';
import { InitializeOnboardingModal } from '../components/InitializeOnboardingModal';
import type { OnboardingSession, OnboardingMetrics } from '../types/onboarding.types';

export function OnboardingTrackerPage() {
  const toast = useToast();
  const [sessions, setSessions] = useState<OnboardingSession[]>([]);
  const [metrics, setMetrics] = useState<OnboardingMetrics>({
    total: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
    avgCompletion: 0,
  });
  const [activeTab, setActiveTab] = useState<'ALL' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isInitModalOpen, setIsInitModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const res = await onboardingApi.getOnboardings({
        status: activeTab === 'ALL' ? undefined : activeTab,
        search: searchQuery.trim() || undefined,
      });
      setSessions(res.items || []);
      if (res.metrics) {
        setMetrics(res.metrics);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load onboarding workflows');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleRemind = async (id: string, name: string) => {
    try {
      await onboardingApi.sendReminder(id);
      toast.success(`Automated reminder dispatched to stakeholders for ${name}!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to dispatch reminder');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-outfit text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Digital Onboarding Tracker
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400 border border-violet-200 dark:border-violet-800/60">
              <Sparkles className="h-3 w-3" />
              Sprint 5 Engine
            </span>
          </div>
          <p className="font-jakarta text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Supervise multi-role onboarding checklists across HR, IT, Managers, and Candidates with automated probation gating.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setIsInitModalOpen(true)}
          className="shrink-0"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          <span>Initialize Onboarding</span>
        </Button>
      </div>

      {/* KPI Metrics Strip */}
      <OnboardingMetricsGrid metrics={metrics} />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold">
          {[
            { id: 'ALL', label: 'All Sessions' },
            { id: 'IN_PROGRESS', label: 'In-Progress' },
            { id: 'COMPLETED', label: 'Completed (Gated)' },
            { id: 'OVERDUE', label: 'Overdue Action' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-violet-600 text-white shadow-none font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-xs w-full">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search candidate or role..."
              className="pl-8 text-xs h-9"
            />
          </div>
          <Button type="submit" variant="outline" size="sm" className="shrink-0 h-9">
            Search
          </Button>
        </form>
      </div>

      {/* Roster Table */}
      <OnboardingRosterTable
        sessions={sessions}
        onRemind={handleRemind}
        isLoading={isLoading}
      />

      {/* Initialize Modal */}
      <InitializeOnboardingModal
        isOpen={isInitModalOpen}
        onClose={() => setIsInitModalOpen(false)}
        onSuccess={loadData}
      />
    </div>
  );
}
