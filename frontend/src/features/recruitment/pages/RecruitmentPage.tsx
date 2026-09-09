import { useCallback, useEffect, useState } from 'react';
import { Plus, Globe, ExternalLink } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { SearchInput } from '../../../components/ui';
import { Spinner } from '../../../components/ui/Spinner';
import { useToast } from '../../../components/ui/toast';
import { apiClient } from '../../../utils/apiClient';
import { RecruitmentMetricsGrid } from '../components/RecruitmentMetricsGrid';
import { InterviewScheduleCard } from '../components/InterviewScheduleCard';
import { CurrentVacanciesSection } from '../components/CurrentVacanciesSection';
import { PipelineBoard } from '../components/PipelineBoard';
import { CandidateDetailDrawer } from '../components/CandidateDetailDrawer';
import { CreateJobModal } from '../components/CreateJobModal';
import { pipelineApi } from '../api/pipeline.api';
import type { InterviewScheduleItem, RecruitmentMetrics, VacancyCardItem } from '../types/recruitment.types';
import type { PipelineApplication, PipelineStats } from '../types/pipeline.types';

export function RecruitmentPage() {
  const toast = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [vacancies, setVacancies] = useState<VacancyCardItem[]>([]);
  const [applications, setApplications] = useState<PipelineApplication[]>([]);
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    try {
      const [jobsRes, apps, pipeline] = await Promise.all([
        apiClient.get('/recruitment/admin/jobs'),
        pipelineApi.applications(debouncedSearch ? { search: debouncedSearch } : undefined),
        pipelineApi.stats(),
      ]);
      const dbJobs = (jobsRes.data as { data?: unknown }).data ?? jobsRes.data;
      if (Array.isArray(dbJobs)) {
        setVacancies(
          (dbJobs as Record<string, unknown>[]).map((j) => ({
            id: String(j._id),
            title: String(j.title),
            employmentType: `${(j.employmentType as string) || 'Full-Time'} • ${(j.location as string) || 'Remote'}`,
            iconType: (['figma', 'python', 'react', 'web'].includes(j.iconType as string) ? j.iconType : 'web') as VacancyCardItem['iconType'],
            appliedCount: (j.appliedCount as number) || 0,
            newCount: 0,
            salary: (j.salaryRange as string) || '$100K - $150K',
            location: (j.location as string) || 'Remote',
          })),
        );
      }
      setApplications(apps);
      setStats(pipeline);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Could not load recruitment pipeline.');
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const metrics: RecruitmentMetrics = {
    totalJobOpenings: stats?.totalJobOpenings ?? 0,
    totalApplications: stats?.totalApplications ?? 0,
    shortlisted: stats?.shortlisted ?? 0,
    interviewed: stats?.interviewing ?? 0,
    rejected: stats?.rejected ?? 0,
    hired: stats?.hired ?? 0,
  };

  const scheduleItems: InterviewScheduleItem[] = (stats?.upcoming || []).map((u) => ({
    id: u._id,
    candidateName: u.candidateName,
    candidateRole: `${u.title} · ${u.scheduledDate} ${u.scheduledTime}`,
    scheduledTimeOrDate: u.scheduledDate.slice(5),
    badgeVariant: 'blue' as const,
  }));

  const handleCreateJob = async (jobData: Record<string, unknown>) => {
    try {
      await apiClient.post('/recruitment/admin/jobs', jobData);
      toast.success(`Job requisition for "${jobData.title}" published and live on Careers portal!`, 'Vacancy Created');
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to create job requisition.');
      throw err;
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Recruitment
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Dashboard <span className="mx-1">/</span>{' '}
            <span className="text-slate-600 dark:text-slate-300 font-medium">Recruitment</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="/careers"
            target="_blank"
            rel="noopener noreferrer"
            className="h-9 px-3.5 rounded-md text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer"
            title="Open public-facing Careers portal in a new tab"
          >
            <Globe className="h-3.5 w-3.5 text-violet-500" />
            <span>Preview Public Careers</span>
            <ExternalLink className="h-3 w-3 text-slate-400" />
          </a>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="h-9 px-4 rounded-md text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Create Job
          </Button>
        </div>
      </div>

      {isLoading || !stats ? (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" variant="violet" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            <div className="lg:col-span-5 flex flex-col">
              <RecruitmentMetricsGrid metrics={metrics} />
            </div>
            <div className="lg:col-span-7 flex flex-col">
              <InterviewScheduleCard
                items={scheduleItems}
                onViewAll={() => toast.info('All upcoming interviews live in each candidate file')}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Hiring Pipeline{' '}
                <span className="ml-1 rounded bg-surface-3 px-1.5 py-0.5 text-[11px] font-bold text-ink-3 tabular-nums">
                  {applications.length}
                </span>
              </h2>
              <div className="w-64">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  onClear={() => setSearch('')}
                  placeholder="Search name, email, role…"
                />
              </div>
            </div>
            <PipelineBoard applications={applications} onSelect={(a) => setSelectedId(a._id)} />
          </div>

          <CurrentVacanciesSection
            vacancies={vacancies}
            totalJobsAdded={vacancies.length}
            onViewJobPost={(job) => toast.info(`Opening job post details for ${job.title}`)}
          />
        </>
      )}

      <CreateJobModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateJob={handleCreateJob}
      />

      <CandidateDetailDrawer
        candidateId={selectedId}
        onClose={() => setSelectedId(null)}
        onChanged={load}
      />
    </div>
  );
}
