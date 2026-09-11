import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Library,
  Trophy,
  Sparkles,
  Zap,
  Flame,
  Plus,
  Play,
  Clock,
  CheckCircle2,
  Award,
  Layers,
  Bot,
  BrainCircuit,
} from 'lucide-react';
import { quizApi } from '../api/quiz.api';
import type {
  Quiz,
  QuizAssignmentItem,
  LeaderboardEntry,
  MyGamificationStats,
} from '../types/quiz.types';
import { LeaderboardPodium } from '../components/LeaderboardPodium';
import { QuizBuilderModal } from '../components/QuizBuilderModal';
import { AssignQuizModal } from '../components/AssignQuizModal';
import { QuizLifecycleActions, QuizStatusBadge } from '../components/QuizLifecycleActions';
import { QuestionBankModal } from '../components/QuestionBankModal';
import { useAuth } from '../../auth/context/AuthContext';
import { useToast } from '../../../components/ui/toast';
import { cn } from '../../../utils/cn';

type TabType = 'challenges' | 'leaderboard' | 'management';

export const QuizHubPage: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  /*
   * The tab and the status filter live in the URL.
   *
   * The studio links straight here after saving a draft, and a review queue
   * that lands you on a different tab than the one you asked for is a link that
   * does not work. It also makes the queue shareable: "look at this one" is a
   * URL rather than a set of directions.
   */
  const [activeTab, setActiveTab] = useState<TabType>(
    (searchParams.get('tab') as TabType) || 'challenges',
  );
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'REVIEW' | 'LIVE'>(
    searchParams.get('filter') === 'review' ? 'REVIEW' : 'ALL',
  );
  const [stats, setStats] = useState<MyGamificationStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myAssignments, setMyAssignments] = useState<QuizAssignmentItem[]>([]);
  const [allQuizzes, setAllQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals state
  const [isBuilderOpen, setIsBuilderOpen] = useState<boolean>(false);
  const [initialAiMode, setInitialAiMode] = useState<boolean>(false);
  const [assigningQuiz, setAssigningQuiz] = useState<Quiz | null>(null);
  const [isBankOpen, setIsBankOpen] = useState(false);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', activeTab);
    if (statusFilter === 'REVIEW') next.set('filter', 'review');
    else next.delete('filter');
    setSearchParams(next, { replace: true });
    // `searchParams` is deliberately not a dependency: writing to it here would
    // re-trigger this effect on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, statusFilter]);

  // Super Admin, HR Admin, HR, Manager roles
  const userRoles = [
    ...(user?.roles || []),
    (user as any)?.role,
  ]
    .filter(Boolean)
    .map((r: string) => String(r).toUpperCase());

  const canManage =
    userRoles.some((r) =>
      ['SUPER_ADMIN', 'SUPERADMIN', 'HR_ADMIN', 'MANAGER', 'ADMIN', 'HR', 'OWNER', 'ORG_ADMIN'].includes(r)
    ) ||
    Boolean(user?.email?.toLowerCase().includes('admin')) ||
    Boolean(user?.email?.toLowerCase().includes('manager'));

  // Automatically open quiz creator when ?create=... is in URL
  useEffect(() => {
    const createParam = searchParams.get('create');
    if (createParam) {
      setInitialAiMode(createParam === 'ai' || createParam === 'true');
      setIsBuilderOpen(true);
      searchParams.delete('create');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [statsRes, leaderboardRes, assignmentsRes] = await Promise.all([
        quizApi.getMyStats().catch(() => null),
        quizApi.getLeaderboard().catch(() => []),
        quizApi.getMyAssignments().catch(() => []),
      ]);

      if (statsRes) setStats(statsRes);
      if (leaderboardRes) setLeaderboard(leaderboardRes);
      if (assignmentsRes) setMyAssignments(assignmentsRes);

      if (canManage) {
        const quizzesRes = await quizApi.listQuizzes().catch(() => []);
        setAllQuizzes(quizzesRes || []);
      }
    } catch {
      toast.error('Failed to refresh arena data');
    } finally {
      setIsLoading(false);
    }
  }, [canManage, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStartQuiz = (quizId: string) => {
    navigate(`/quizzes/${quizId}/play`);
  };

  // Anything a person still has to act on.
  const reviewCount = allQuizzes.filter(
    (q) => q.status === 'DRAFT' || q.status === 'IN_REVIEW',
  ).length;

  const visibleQuizzes = allQuizzes.filter((q) => {
    if (statusFilter === 'REVIEW') return q.status === 'DRAFT' || q.status === 'IN_REVIEW';
    if (statusFilter === 'LIVE') return q.status === 'APPROVED' || q.status === 'PUBLISHED';
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner with Gamification Profile */}
      <div className="bg-surface border border-hairline rounded-md p-6 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-semibold mb-2">
              <Trophy className="w-3.5 h-3.5" />
              <span>Nexora Quiz Arena</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-ink">
              Level Up Your Knowledge & Earn XP
            </h1>
            <p className="text-xs text-ink-3 mt-1 max-w-xl">
              Challenge yourself with company skill quizzes, climb the enterprise leaderboard,
              and showcase your department expertise!
            </p>

            {canManage && (
              <div className="mt-3.5 flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    setInitialAiMode(true);
                    setIsBuilderOpen(true);
                  }}
                  className="px-3.5 py-1.5 text-xs font-bold bg-primary hover:bg-primary-hover text-white rounded-md transition-all shadow-none flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Create & Assign with AI</span>
                </button>
                <button
                  onClick={() => {
                    setInitialAiMode(false);
                    setIsBuilderOpen(true);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold bg-surface-2 hover:bg-surface-2/80 text-ink border border-hairline rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Manual Quiz Studio</span>
                </button>
              </div>
            )}
          </div>

          {/* User Quick Stats Widget */}
          <div className="flex items-center gap-3 bg-surface-2 p-2.5 rounded-md border border-hairline self-stretch sm:self-auto">
            {/* Rank */}
            <div className="px-3 py-1.5 text-center">
              <div className="text-[10px] uppercase font-bold text-ink-3">My Rank</div>
              <div className="text-base font-extrabold text-ink flex items-center justify-center gap-1">
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                {stats?.rank ? `#${stats.rank}` : '—'}
              </div>
            </div>

            <div className="w-px h-8 bg-hairline" />

            {/* Level */}
            <div className="px-3 py-1.5 text-center">
              <div className="text-[10px] uppercase font-bold text-ink-3">Level</div>
              <div className="text-base font-extrabold text-ink flex items-center justify-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                {stats?.level || 1}
              </div>
            </div>

            <div className="w-px h-8 bg-hairline" />

            {/* Total XP */}
            <div className="px-3 py-1.5 text-center">
              <div className="text-[10px] uppercase font-bold text-ink-3">Total XP</div>
              <div className="text-base font-extrabold text-primary dark:text-primary flex items-center justify-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                {stats?.totalXp?.toLocaleString() || 0}
              </div>
            </div>

            <div className="w-px h-8 bg-hairline" />

            {/* Streak */}
            <div className="px-3 py-1.5 text-center">
              <div className="text-[10px] uppercase font-bold text-ink-3">Streak</div>
              <div className="text-base font-extrabold text-orange-500 flex items-center justify-center gap-1">
                <Flame className="w-3.5 h-3.5" />
                {stats?.currentStreak || 0}x
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Arena Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-hairline">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab('challenges')}
            className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-all relative ${
              activeTab === 'challenges'
                ? 'text-primary dark:text-primary border-b-2 border-primary'
                : 'text-ink-3 hover:text-ink'
            }`}
          >
            Active Challenges ({myAssignments.filter((a) => a.status === 'PENDING').length})
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-all relative ${
              activeTab === 'leaderboard'
                ? 'text-primary dark:text-primary border-b-2 border-primary'
                : 'text-ink-3 hover:text-ink'
            }`}
          >
            Leaderboard & Badges
          </button>

          {canManage && (
            <button
              onClick={() => setActiveTab('management')}
              className={`pb-3 text-xs font-semibold uppercase tracking-wider transition-all relative ${
                activeTab === 'management'
                  ? 'text-primary dark:text-primary border-b-2 border-primary'
                  : 'text-ink-3 hover:text-ink'
              }`}
            >
              Quiz Management ({allQuizzes.length})
            </button>
          )}
        </div>

        {canManage && (
          <div className="flex items-center gap-2 pb-2">
            <button
              onClick={() => navigate('/agents')}
              className="px-3 py-1.5 text-xs font-semibold bg-surface-2 hover:bg-surface-2/80 text-ink border border-hairline rounded-md transition-colors flex items-center gap-1.5"
            >
              <Bot className="w-3.5 h-3.5 text-primary" />
              AI Agents Hub
            </button>
            <button
              onClick={() => setIsBuilderOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold bg-primary hover:bg-primary-hover text-white rounded-md transition-all shadow-none flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Challenge
            </button>
          </div>
        )}
      </div>

      {/* Tab 1: Challenges (My Assigned Quizzes) */}
      {activeTab === 'challenges' && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="py-16 text-center text-xs text-ink-3">
              Loading challenges...
            </div>
          ) : myAssignments.length === 0 ? (
            <div className="py-16 text-center bg-surface border border-hairline rounded-md p-6">
              <Award className="w-8 h-8 text-ink-3 mx-auto mb-2 opacity-50" />
              <h3 className="text-sm font-semibold text-ink">No Challenges Assigned Yet</h3>
              <p className="text-xs text-ink-3 mt-1 max-w-sm mx-auto">
                When HR or your manager assigns quizzes or company knowledge assessments, they will appear here.
              </p>
              {canManage && (
                <button
                  onClick={() => setIsBuilderOpen(true)}
                  className="mt-4 px-4 py-2 text-xs font-semibold bg-primary text-white rounded-md hover:bg-primary-hover"
                >
                  Create First Quiz
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myAssignments.map((assignment) => {
                const isCompleted = assignment.status === 'COMPLETED';
                const isExpired =
                  assignment.status === 'EXPIRED' ||
                  (assignment.dueDate && new Date(assignment.dueDate) < new Date() && !isCompleted);

                return (
                  <div
                    key={assignment.assignmentId}
                    className="bg-surface border border-hairline rounded-md p-5 flex flex-col justify-between transition-all hover:border-border"
                  >
                    <div>
                      {/* Category & Status */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] uppercase font-bold text-ink-3 tracking-wider line-clamp-1">
                          {assignment.category || 'General'}
                        </span>
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" /> Completed
                          </span>
                        ) : isExpired ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                            Expired
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            Action Required
                          </span>
                        )}
                      </div>

                      {/* Title & Description */}
                      <h3 className="text-sm font-bold text-ink line-clamp-1">
                        {assignment.title}
                      </h3>
                      <p className="text-xs text-ink-3 mt-1 line-clamp-2">
                        {assignment.description || 'Test your proficiency and gain points.'}
                      </p>

                      {/* Badges / Metrics */}
                      <div className="flex flex-wrap items-center gap-3 mt-4 text-[11px] text-ink-3">
                        <div className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5" />
                          <span>{assignment.questionCount} Questions</span>
                        </div>
                        {assignment.timeLimitMinutes > 0 && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{assignment.timeLimitMinutes} mins</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-amber-500 font-semibold">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>+{assignment.xpReward} XP</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer / Action */}
                    <div className="mt-5 pt-3 border-t border-hairline flex items-center justify-between">
                      {assignment.dueDate ? (
                        <span className="text-[11px] text-ink-3">
                          Due: {new Date(assignment.dueDate).toLocaleDateString()}
                        </span>
                      ) : (
                        <span className="text-[11px] text-ink-3">No expiration</span>
                      )}

                      <button
                        onClick={() => handleStartQuiz(assignment.quizId)}
                        className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all shadow-none flex items-center gap-1.5 ${
                          isCompleted
                            ? 'bg-surface-2 hover:bg-surface-2/80 text-ink border border-hairline'
                            : 'bg-primary hover:bg-primary-hover text-white'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        {isCompleted ? 'Review / Retry' : 'Start Challenge'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Enterprise Leaderboard */}
      {activeTab === 'leaderboard' && (
        <LeaderboardPodium
          entries={leaderboard}
          currentEmployeeId={user?.linkedEmployeeId || user?.id}
        />
      )}

      {/* Tab 3: HR / Manager Quiz Management */}
      {activeTab === 'management' && canManage && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              All quizzes
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-0.5 rounded-md bg-surface-2 p-0.5">
                {([
                  { key: 'ALL' as const, label: 'All' },
                  { key: 'REVIEW' as const, label: `Needs review${reviewCount ? ` (${reviewCount})` : ''}` },
                  { key: 'LIVE' as const, label: 'Live' },
                ]).map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setStatusFilter(f.key)}
                    className={cn(
                      'cursor-pointer rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors',
                      statusFilter === f.key ? 'bg-surface text-ink' : 'text-ink-3 hover:text-ink-2',
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <span className="text-xs text-ink-3">{visibleQuizzes.length} shown</span>
              <button
                type="button"
                onClick={() => setIsBankOpen(true)}
                className="flex cursor-pointer items-center gap-1.5 rounded-md border border-hairline px-2.5 py-1.5 text-[11px] font-semibold text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
              >
                <Library className="h-3.5 w-3.5" />
                Question bank
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleQuizzes.map((quiz) => (
              <div
                key={quiz._id}
                className="bg-surface border border-hairline rounded-md p-5 flex flex-col justify-between transition-all hover:border-border"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] uppercase font-bold text-ink-3 tracking-wider">
                      {quiz.category || 'Skill Test'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <QuizStatusBadge status={quiz.status} />
                      {quiz.isAiGenerated && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-surface-2 border border-hairline text-ink-2">
                          <BrainCircuit className="w-2.5 h-2.5" /> AI built
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-surface-2 border border-hairline text-ink capitalize">
                        {quiz.difficulty}
                      </span>
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-ink line-clamp-1">{quiz.title}</h4>
                  <p className="text-xs text-ink-3 mt-1 line-clamp-2">
                    {quiz.description || 'Enterprise knowledge challenge.'}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-3">
                    <span>{quiz.questions?.length || 0} questions</span>
                    <span>•</span>
                    <span>Pass: {quiz.passingScorePct}%</span>
                    <span>•</span>
                    <span className="font-bold text-amber-500">+{quiz.xpReward} XP</span>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-ink-3">
                    <span>
                      {quiz.attemptPolicy?.maxAttempts === 0
                        ? 'Unlimited attempts'
                        : `${quiz.attemptPolicy?.maxAttempts ?? 1} attempt${(quiz.attemptPolicy?.maxAttempts ?? 1) === 1 ? '' : 's'}`}
                    </span>
                    {quiz.shuffleOptions && (
                      <>
                        <span>•</span>
                        <span>Options shuffled</span>
                      </>
                    )}
                    {quiz.locale && quiz.locale !== 'en' && (
                      <>
                        <span>•</span>
                        <span className="uppercase">{quiz.locale}</span>
                      </>
                    )}
                  </div>

                  {quiz.status === 'APPROVED' && quiz.approvedByName && (
                    <p className="mt-1.5 text-[10.5px] text-ink-3">
                      Approved by {quiz.approvedByName}
                    </p>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-hairline pt-3">
                  <button
                    onClick={() => handleStartQuiz(quiz._id)}
                    className="flex cursor-pointer items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Preview
                  </button>

                  <QuizLifecycleActions
                    quiz={quiz}
                    onChanged={(updated) =>
                      setAllQuizzes((prev) =>
                        prev.map((q) => (q._id === updated._id ? updated : q)),
                      )
                    }
                    onAssign={setAssigningQuiz}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <QuestionBankModal isOpen={isBankOpen} onClose={() => setIsBankOpen(false)} />

      {/* Quiz Builder Modal */}
      <QuizBuilderModal
        isOpen={isBuilderOpen}
        initialAiMode={initialAiMode}
        onClose={() => setIsBuilderOpen(false)}
        onSuccess={() => {
          loadData();
          setActiveTab(canManage ? 'management' : 'challenges');
        }}
      />

      {/* Assign Quiz Modal */}
      {assigningQuiz && (
        <AssignQuizModal
          quiz={assigningQuiz}
          isOpen={!!assigningQuiz}
          onClose={() => setAssigningQuiz(null)}
          onSuccess={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
};
