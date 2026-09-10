import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Brain,
  CheckCircle2,
  ArrowRight,
  UserCheck,
  ShieldCheck,
  Briefcase,
  Trophy,
  Sliders,
  Search,
  FileText,
  Clock,
} from 'lucide-react';
import { PageHeader } from '../../../components/common/PageHeader';
import { Button } from '../../../components/ui';
import { useTheme } from '../../../hooks/useTheme';
import { cn } from '../../../utils/cn';
import aiProviderLightBg from '../../../assets/ai_provider_light_banner.jpg';
import aiProviderDarkBg from '../../../assets/ai_provider_dark_banner.jpg';

export interface AgentDescriptor {
  id: string;
  name: string;
  codename: string;
  role: string;
  domain: string;
  description: string;
  capabilities: string[];
  status: 'ACTIVE' | 'UPCOMING';
  actionLabel: string;
  actionHref?: string;
  onClickAction?: string;
  icon: typeof Brain;
  accentColor: string;
  modelFamily: string;
}

export const AGENTS_REGISTRY: AgentDescriptor[] = [
  {
    id: 'quiz-master',
    name: 'Quiz Master Agent',
    codename: 'AGENT-QZ-01',
    role: 'Employee Assessment & Gamification',
    domain: 'Learning & Development',
    description:
      'Creates domain-specific training quizzes in seconds, formulates multiple-choice questions with answer explanations, and organizes team challenges.',
    capabilities: [
      '1-Click AI Quiz Generation on any topic',
      'Difficulty tuning (Beginner to Advanced)',
      'Automated company-wide assignment',
      'XP rewards & accuracy streak grading',
    ],
    status: 'ACTIVE',
    actionLabel: 'Open Quiz Agent Studio',
    actionHref: '/agents/quiz',
    icon: Trophy,
    accentColor: 'text-amber-500 bg-amber-500/10 border-amber-500/25',
    modelFamily: 'Connected to Active Engine',
  },
  {
    id: 'recruitment-screener',
    name: 'Candidate Screening Agent',
    codename: 'AGENT-RC-02',
    role: 'Talent Acquisition & Scoring',
    domain: 'Recruitment',
    description:
      'Parses candidate resumes against job requisitions, computes objective skill-match scores, and flags candidate red/green flags.',
    capabilities: [
      'Deep resume text extraction & keyword matching',
      'Quantitative fit score (0-100%)',
      'Automated stage recommendations',
      'Bias-reduced evaluation criteria',
    ],
    status: 'ACTIVE',
    actionLabel: 'Open Recruitment Screener',
    actionHref: '/recruitment',
    icon: UserCheck,
    accentColor: 'text-sky-500 bg-sky-500/10 border-sky-500/25',
    modelFamily: 'Connected to Active Engine',
  },
  {
    id: 'hr-copilot',
    name: 'HR Policy & Benefits Copilot',
    codename: 'AGENT-PL-03',
    role: 'Employee Support & Inquiries',
    domain: 'People Operations',
    description:
      'Answers employee queries about leave policies, insurance coverage, payroll schedules, and internal company protocols instantly.',
    capabilities: [
      'Company policy retrieval & citations',
      'Leave balance & holiday calendar assistance',
      'Confidential HR inquiry guidance',
      '24/7 autonomous employee response',
    ],
    status: 'ACTIVE',
    actionLabel: 'Open HR Atrium',
    actionHref: '/atrium',
    icon: ShieldCheck,
    accentColor: 'text-violet-500 bg-violet-500/10 border-violet-500/25',
    modelFamily: 'Connected to Active Engine',
  },
  {
    id: 'performance-evaluator',
    name: 'Performance Review Synthesis Agent',
    codename: 'AGENT-PF-04',
    role: 'Continuous Feedback & OKRs',
    domain: 'Performance Management',
    description:
      'Synthesizes peer feedback, project milestones, and self-assessments into constructive quarterly appraisal drafts.',
    capabilities: [
      'Multi-source review compilation',
      'Actionable growth goal suggestions',
      'Sentiment balance & objectivity audit',
      'Skill gap detection across departments',
    ],
    status: 'UPCOMING',
    actionLabel: 'Coming Soon',
    icon: Briefcase,
    accentColor: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/25',
    modelFamily: 'In Development',
  },
  {
    id: 'onboarding-guide',
    name: 'Onboarding Experience Agent',
    codename: 'AGENT-OB-05',
    role: 'New Hire Concierge',
    domain: 'Lifecycle & Induction',
    description:
      'Guides new team members through their first 90 days, checking off paperwork, introducing team rituals, and scheduling 1-on-1s.',
    capabilities: [
      'Personalized day 1-30-60-90 checklists',
      'Buddy matching and intro orchestration',
      'Equipment & tools setup verification',
      'First-month retention feedback pulse',
    ],
    status: 'UPCOMING',
    actionLabel: 'Coming Soon',
    icon: FileText,
    accentColor: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/25',
    modelFamily: 'In Development',
  },
];

export function AgentsHubPage() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'UPCOMING'>('ALL');
  const bgBanner = theme === 'dark' ? aiProviderDarkBg : aiProviderLightBg;

  const filteredAgents = AGENTS_REGISTRY.filter((a) => {
    if (activeFilter !== 'ALL' && a.status !== activeFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.domain.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.capabilities.some((c) => c.toLowerCase().includes(q))
    );
  });

  return (
    <div className="w-full space-y-5">
      {/* Page Header */}
      <PageHeader
        title="AI Agents Hub"
        description="Autonomous specialized AI agents powering recruitment, employee learning, policy guidance, and HR workflows."
        actions={
          <div className="flex items-center gap-2">
            <Link to="/settings/ai-providers">
              <Button variant="outline" size="sm" className="gap-1.5 rounded-md text-xs">
                <Sliders className="h-3.5 w-3.5" />
                <span>AI Engine Settings</span>
              </Button>
            </Link>
            <Link to="/quizzes">
              <Button size="sm" className="gap-1.5 rounded-md text-xs">
                <Trophy className="h-3.5 w-3.5" />
                <span>Enter Quiz Arena</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* Hero Showcase Banner */}
      <div
        className="relative rounded-md border border-hairline bg-cover bg-center overflow-hidden"
        style={{ backgroundImage: `url(${bgBanner})` }}
      >
        <div className="bg-gradient-to-r from-surface/95 via-surface/85 to-surface/65 backdrop-blur-md p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Active Multi-Agent Architecture
              </span>
              <span className="text-xs text-ink-3">· Unified LLM Routing</span>
            </div>
            <h2 className="text-lg md:text-xl font-bold text-ink tracking-tight">
              Enterprise AI Intelligence at Every Level
            </h2>
            <p className="text-xs text-ink-2 leading-relaxed">
              Every agent uses your organization’s active AI provider credentials. Configure custom prompts,
              generate quizzes for teams, assess candidates, and automate HR support with zero context switching.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-md border border-hairline bg-surface/85 backdrop-blur-sm p-3 text-center min-w-[100px]">
              <div className="text-xl font-bold text-ink">3</div>
              <div className="text-[10px] uppercase font-semibold text-ink-3">Live Agents</div>
            </div>
            <div className="rounded-md border border-hairline bg-surface/85 backdrop-blur-sm p-3 text-center min-w-[100px]">
              <div className="text-xl font-bold text-ink">3</div>
              <div className="text-[10px] uppercase font-semibold text-ink-3">In Pipeline</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 rounded-md border border-hairline bg-surface p-1">
          {(['ALL', 'ACTIVE', 'UPCOMING'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-colors cursor-pointer',
                activeFilter === filter
                  ? 'bg-surface-2 text-ink font-semibold border border-hairline'
                  : 'text-ink-3 hover:text-ink hover:bg-surface-2/50',
              )}
            >
              {filter === 'ALL' ? 'All Agents' : filter === 'ACTIVE' ? 'Ready to Use' : 'Upcoming'}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents or capabilities..."
            className="w-full h-8 pl-8 pr-3 text-xs rounded-md border border-hairline bg-surface text-ink placeholder:text-ink-3/60 focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAgents.map((agent) => {
          const Icon = agent.icon;
          const isActive = agent.status === 'ACTIVE';

          return (
            <div
              key={agent.id}
              className={cn(
                'flex flex-col justify-between rounded-md border border-hairline bg-surface p-5 transition-colors relative',
                isActive ? 'hover:border-primary/50' : 'opacity-85',
              )}
            >
              <div>
                {/* Agent Header */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-hairline">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-11 w-11 shrink-0 items-center justify-center rounded-md border p-2.5',
                        agent.accentColor,
                      )}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-ink leading-snug">{agent.name}</h3>
                      <p className="text-[11px] text-ink-3 font-mono">{agent.codename}</p>
                    </div>
                  </div>

                  {isActive ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 border border-hairline px-2 py-0.5 text-[10px] font-medium text-ink-3">
                      <Clock className="h-3 w-3" />
                      Soon
                    </span>
                  )}
                </div>

                {/* Role & Domain */}
                <div className="pt-3 pb-2 flex items-center gap-2 flex-wrap">
                  <span className="rounded-md bg-surface-2 border border-hairline px-2 py-0.5 text-[10.5px] font-medium text-ink-2">
                    {agent.domain}
                  </span>
                  <span className="text-[11px] text-ink-3">· {agent.role}</span>
                </div>

                {/* Description */}
                <p className="text-xs text-ink-2 leading-relaxed pt-1 pb-3">{agent.description}</p>

                {/* Capabilities List */}
                <div className="space-y-1.5 pt-1 pb-4">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-3">
                    Key Capabilities
                  </div>
                  {agent.capabilities.map((cap, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs text-ink-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <span>{cap}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="border-t border-hairline pt-3 flex items-center justify-between">
                <span className="text-[10px] text-ink-3 font-mono">{agent.modelFamily}</span>

                {isActive && agent.actionHref ? (
                  <Button
                    size="sm"
                    onClick={() => navigate(agent.actionHref!)}
                    className="gap-1.5 rounded-md text-xs"
                  >
                    <span>{agent.actionLabel}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" disabled className="rounded-md text-xs opacity-60">
                    <span>Upcoming</span>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
