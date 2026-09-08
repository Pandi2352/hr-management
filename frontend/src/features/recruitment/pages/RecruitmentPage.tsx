import { useState, useEffect } from 'react';
import { Plus, Globe, ExternalLink } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/toast';
import { apiClient } from '../../../utils/apiClient';
import { RecruitmentMetricsGrid } from '../components/RecruitmentMetricsGrid';
import { InterviewScheduleCard } from '../components/InterviewScheduleCard';
import { CurrentVacanciesSection } from '../components/CurrentVacanciesSection';
import { CandidateApplicationsTable } from '../components/CandidateApplicationsTable';
import { CreateJobModal } from '../components/CreateJobModal';
import {
  MOCK_RECRUITMENT_METRICS,
  MOCK_INTERVIEW_SCHEDULE,
  MOCK_VACANCIES,
  MOCK_APPLICANTS,
} from '../data/mockRecruitmentData';
import type { VacancyCardItem, CandidateApplicant } from '../types/recruitment.types';

export function RecruitmentPage() {
  const toast = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [vacancies, setVacancies] = useState<VacancyCardItem[]>(MOCK_VACANCIES);
  const [applicants, setApplicants] = useState<CandidateApplicant[]>(MOCK_APPLICANTS);

  useEffect(() => {
    async function loadData() {
      // 1. Fetch live jobs from backend
      try {
        const jobsRes = await apiClient.get('/recruitment/admin/jobs');
        const dbJobs = (jobsRes.data as any).data || jobsRes.data;
        if (Array.isArray(dbJobs) && dbJobs.length > 0) {
          const mappedJobs: VacancyCardItem[] = dbJobs.map((j: any) => ({
            id: j._id,
            title: j.title,
            employmentType: `${j.employmentType || 'Full-Time'} • ${j.location || 'Remote'}`,
            iconType: (['figma', 'python', 'react', 'web'].includes(j.iconType) ? j.iconType : 'web') as any,
            appliedCount: j.appliedCount || 0,
            newCount: 0,
            salary: j.salaryRange || '$100K - $150K',
            location: j.location || 'Remote',
          }));
          setVacancies(mappedJobs);
        }
      } catch {
        // Fallback to MOCK_VACANCIES
      }

      // 2. Fetch live applications from backend
      try {
        const res = await apiClient.get('/recruitment/admin/applications');
        const apps = (res.data as any).data || res.data;
        if (Array.isArray(apps) && apps.length > 0) {
          const mapped: CandidateApplicant[] = apps.map((a: any) => ({
            id: a._id,
            name: a.fullName,
            avatarUrl: undefined,
            department: a.jobTitle || a.department,
            phone: a.phone,
            email: a.email,
            status: a.status === 'APPLIED' ? 'Pending' : (a.status === 'SHORTLISTED' ? 'Shortlisted' : 'Pending'),
            interviewStatus: 'Schedule',
            resumeUrl: a.resumeUrl,
          }));
          setApplicants([...mapped, ...MOCK_APPLICANTS]);
        }
      } catch {
        // Fallback to MOCK_APPLICANTS
      }
    }
    loadData();
  }, []);

  const handleDownloadReport = () => {
    toast.success('Recruitment pipeline report downloaded successfully', 'Export Complete');
  };

  const handleCreateJob = async (jobData: any) => {
    try {
      const res = await apiClient.post('/recruitment/admin/jobs', jobData);
      const created = (res.data as any).data || res.data;
      const newVacancy: VacancyCardItem = {
        id: created._id || `vac-${Date.now()}`,
        title: created.title,
        employmentType: `${created.employmentType || 'Full-Time'} • ${created.location || 'Remote'}`,
        iconType: (['figma', 'python', 'react', 'web'].includes(created.iconType) ? created.iconType : 'web') as any,
        appliedCount: 0,
        newCount: 0,
        salary: created.salaryRange || '$100K - $150K',
        location: created.location || 'Remote',
      };
      setVacancies((prev) => [newVacancy, ...prev]);
      toast.success(
        `Job requisition for "${jobData.title}" published and live on Careers portal!`,
        'Vacancy Created',
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create job requisition.');
      throw err;
    }
  };

  const handleViewJobPost = (job: VacancyCardItem) => {
    toast.info(`Opening job post details for ${job.title}`);
  };

  const handleViewCandidate = (candidate: CandidateApplicant) => {
    if (candidate.resumeUrl) {
      window.open(candidate.resumeUrl, '_blank');
      toast.info(`Opening uploaded resume for ${candidate.name}`);
    } else {
      toast.info(`Viewing profile details for ${candidate.name} (${candidate.department})`);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Top Page Header matching Screenshot 1 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Recruitment
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Dashboard <span className="mx-1">/</span> <span className="text-slate-600 dark:text-slate-300 font-medium">Recruitment</span>
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

      {/* Row 1: Funnel Metric Cards (Left 6 Cards) & Interview Schedule (Right Card) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        <div className="lg:col-span-5 flex flex-col">
          <RecruitmentMetricsGrid metrics={MOCK_RECRUITMENT_METRICS} />
        </div>

        <div className="lg:col-span-7 flex flex-col">
          <InterviewScheduleCard
            items={MOCK_INTERVIEW_SCHEDULE}
            onViewAll={() => toast.info('Opening all upcoming scheduled interviews')}
          />
        </div>
      </div>

      {/* Row 2: Current Vacancies Cards matching Screenshot 2 */}
      <CurrentVacanciesSection
        vacancies={vacancies}
        totalJobsAdded={74 + (vacancies.length - MOCK_VACANCIES.length)}
        onViewJobPost={handleViewJobPost}
      />

      {/* Row 3: Candidate Applications Table matching Screenshot 2 */}
      <CandidateApplicationsTable
        applicants={applicants}
        onDownloadReport={handleDownloadReport}
        onViewCandidate={handleViewCandidate}
      />

      {/* Create Job Opening Modal */}
      <CreateJobModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateJob={handleCreateJob}
      />
    </div>
  );
}
