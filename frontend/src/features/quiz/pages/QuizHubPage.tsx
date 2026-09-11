import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Library,
  Sparkles,
  Play,
  Clock,
  CheckCircle2,
  Award,
  Layers,
  Bot,
  BrainCircuit,
  FileText,
  Users,
} from 'lucide-react';
import { quizApi } from '../api/quiz.api';
import type {
  Quiz,
  QuizAssignmentItem,
  LeaderboardEntry,
  MyGamificationStats,
} from '../types/quiz.types';
import { ASSIGNABLE_STATUSES } from '../types/quiz.types';
import { LeaderboardPodium } from '../components/LeaderboardPodium';
import { AssignQuizModal } from '../components/AssignQuizModal';
import { QuizLifecycleActions, QuizStatusBadge } from '../components/QuizLifecycleActions';
import { QuestionBankModal } from '../components/QuestionBankModal';
import { SkillPassportPanel } from '../components/SkillPassportPanel';
import { TrainingRoiPanel } from '../components/TrainingRoiPanel';
import { PageHeader } from '../../../components/common/PageHeader';
import { Button, SegmentedTabs } from '../../../components/ui';
import { StatTile, StatTileRow } from '../../../components/ui/StatTile';
import { useAuth } from '../../auth/context/AuthContext';
import { useToast } from '../../../components/ui/toast';
import { cn } from '../../../utils/cn';

type TabType = 'challenges' | 'passport' | 'leaderboard' | 'management' | 'assign' | 'roi';

/** A quiz that has cleared review may go to people; anything else may not. */
const isAssignable = (q: Quiz) => ASSIGNABLE_STATUSES.includes(q.status);
const needsReview = (q: Quiz) => q.status === 'DRAFT' || q.status === 'IN_REVIEW';

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

  /*
   * `?create=` used to open a builder modal here. The modal is gone, so the
   * parameter redirects to the studio instead — old links and bookmarks still
   * land somewhere that makes sense rather than doing nothing.
   */
  useEffect(() => {
    if (searchParams.get('create')) {
      navigate('/agents/quiz', { replace: true });
    }
  }, [searchParams, navigate]);

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

  /**
   * Opens the most recent sitting of a quiz.
   *
   * A completed challenge used to send people back into the player, which for
   * a one-attempt quiz meant a dead end. What they actually want after finishing
   * is the questions, the answers and the reasons.
   */
  const openLatestAttempt = async (quizId: string) => {
    try {
      const attempts = await quizApi.listMyAttempts(quizId);
      if (attempts.length === 0) {
        toast.info('No sitting recorded for that quiz yet.');
        return;
      }
      navigate(`/quizzes/attempts/${attempts[0].attemptId}`);
    } catch {
      toast.error('Could not open that attempt.');
    }
  };

  const replaceQuiz = (updated: Quiz) =>
    setAllQuizzes((prev) => prev.map((q) => (q._id === updated._id ? updated : q)));

  const dropQuiz = (quizId: string) =>
    setAllQuizzes((prev) => prev.filter((q) => q._id !== quizId));

  const pendingCount = myAssignments.filter((a) => a.status === 'PENDING').length;
  const reviewCount = allQuizzes.filter(needsReview).length;
  const readyToAssign = allQuizzes.filter(isAssignable);

  const visibleQuizzes = allQuizzes.filter((q) => {
    if (statusFilter === 'REVIEW') return needsReview(q);
    if (statusFilter === 'LIVE') return isAssignable(q);
    return true;
  });

  const tabs = [
    { id: 'challenges', label: 'My challenges', count: pendingCount },
    // Before the leaderboard on purpose: what you can do is the point, and a
    // ranking is a side effect of it.
    { id: 'passport', label: 'Skill passport' },
    { id: 'leaderboard', label: 'Leaderboard' },
    ...(canManage
      ? [
          { id: 'assign', label: 'Assign to people', count: readyToAssign.length },
          { id: 'management', label: 'Quiz management', count: allQuizzes.length },
          { id: 'roi', label: 'Training ROI' },
        ]
      : []),
  ];

  return (
    <div className="w-full space-y-5">
      {/* The shared page header, so the arena sits at the same rhythm as every
          other page rather than carrying its own hand-rolled banner. */}
      <PageHeader
        title="Quiz Arena"
        description="Take assigned challenges, climb the leaderboard, and put approved quizzes in front of your people."
        actions={
          canManage ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/agents')}
                className="gap-1.5"
              >
                <Bot className="h-3.5 w-3.5" />
                AI Agents Hub
              </Button>
              {/* One way to build a quiz. The modal that used to sit beside
                  this could publish and assign in a single click, skipping the
                  review gate the rest of the module is built around. */}
              <Button size="sm" onClick={() => navigate('/agents/quiz')} className="gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Create a quiz
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Your standing. Neutral tiles rather than four accent colours, so the
          numbers read as data instead of decoration. */}
      <StatTileRow>
        <StatTile label="My rank" value={stats?.rank ? `#${stats.rank}` : '—'} />
        <StatTile label="Level" value={stats?.level || 1} />
        <StatTile label="Total XP" value={stats?.totalXp?.toLocaleString() || 0} unit="points" />
        <StatTile label="Streak" value={`${stats?.currentStreak || 0}x`} unit="in a row" />
      </StatTileRow>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <SegmentedTabs tabs={tabs} active={activeTab} onChange={(id) => setActiveTab(id as TabType)} />

        {canManage && (activeTab === 'management' || activeTab === 'assign') && (
          <Button variant="outline" size="sm" onClick={() => setIsBankOpen(true)} className="gap-1.5">
            <Library className="h-3.5 w-3.5" />
            Question bank
          </Button>
        )}
      </div>

      {/* Tab 1: the quizzes assigned to me */}
      {activeTab === 'challenges' && (
        <div className="space-y-4">
          {isLoading ? (
            <div className="py-16 text-center text-xs text-ink-3">Loading challenges...</div>
          ) : myAssignments.length === 0 ? (
            <div className="rounded-md border border-hairline bg-surface px-6 py-16 text-center">
              <Award className="mx-auto mb-2 h-8 w-8 text-ink-3 opacity-50" />
              <h3 className="text-sm font-semibold text-ink">Nothing assigned yet</h3>
              <p className="mx-auto mt-1 max-w-sm text-xs text-ink-3">
                When HR or your manager assigns a quiz, it appears here with its deadline.
              </p>
              {canManage && (
                <Button size="sm" onClick={() => navigate('/agents/quiz')} className="mt-4">
                  Create the first quiz
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {myAssignments.map((assignment) => {
                const isCompleted = assignment.status === 'COMPLETED';
                const isExpired =
                  assignment.status === 'EXPIRED' ||
                  (assignment.dueDate && new Date(assignment.dueDate) < new Date() && !isCompleted);

                return (
                  <div
                    key={assignment.assignmentId}
                    className="flex flex-col justify-between rounded-md border border-hairline bg-surface p-5 transition-colors hover:border-ink-3/30"
                  >
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="line-clamp-1 text-[10px] font-bold tracking-wider text-ink-3 uppercase">
                          {assignment.category || 'General'}
                        </span>
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" /> Completed
                          </span>
                        ) : isExpired ? (
                          <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                            Expired
                          </span>
                        ) : (
                          <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                            To do
                          </span>
                        )}
                      </div>

                      <h3 className="line-clamp-1 text-sm font-bold text-ink">{assignment.title}</h3>
                      <p className="mt-1 line-clamp-2 text-xs text-ink-3">
                        {assignment.description || 'Test your proficiency and earn points.'}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-ink-3">
                        <span className="flex items-center gap-1">
                          <Layers className="h-3.5 w-3.5" />
                          {assignment.questionCount} questions
                        </span>
                        {assignment.timeLimitMinutes > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {assignment.timeLimitMinutes} min
                          </span>
                        )}
                        <span className="flex items-center gap-1 font-semibold text-ink-2">
                          +{assignment.xpReward} XP
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-2 border-t border-hairline pt-3">
                      <span className="text-[11px] text-ink-3">
                        {assignment.dueDate
                          ? `Due ${new Date(assignment.dueDate).toLocaleDateString()}`
                          : 'No deadline'}
                      </span>

                      <Button
                        size="sm"
                        variant={isCompleted ? 'outline' : 'primary'}
                        onClick={() =>
                          isCompleted
                            ? openLatestAttempt(assignment.quizId)
                            : handleStartQuiz(assignment.quizId)
                        }
                        className="gap-1.5 text-[11px]"
                      >
                        {isCompleted ? <FileText className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        {isCompleted ? 'See answers' : 'Start'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: what this person can actually do */}
      {activeTab === 'passport' && <SkillPassportPanel />}

      {/* Tab 3: standings */}
      {activeTab === 'leaderboard' && (
        <LeaderboardPodium
          entries={leaderboard}
          currentEmployeeId={user?.linkedEmployeeId || user?.id}
        />
      )}

      {/*
       * Tab 3: the assignment desk.
       *
       * Assigning is a different job from authoring, and mixing them meant
       * hunting for the approved quizzes among the drafts. This lists only what
       * has cleared review, as rows rather than cards, because the question here
       * is "which one" and not "what is in it".
       */}
      {activeTab === 'assign' && canManage && (
        <div className="space-y-3">
          {readyToAssign.length === 0 ? (
            <div className="rounded-md border border-hairline bg-surface px-6 py-16 text-center">
              <Users className="mx-auto mb-2 h-8 w-8 text-ink-3 opacity-50" />
              <h3 className="text-sm font-semibold text-ink">Nothing is ready to assign</h3>
              <p className="mx-auto mt-1 max-w-sm text-xs text-ink-3">
                A quiz can only go to people once it has been approved. Approve one in Quiz
                management and it appears here.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setStatusFilter('REVIEW');
                  setActiveTab('management');
                }}
                className="mt-4"
              >
                Open the review queue{reviewCount ? ` (${reviewCount})` : ''}
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-hairline bg-surface">
              {readyToAssign.map((quiz, i) => (
                <div
                  key={quiz._id}
                  className={cn(
                    'flex flex-wrap items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2/50',
                    i > 0 && 'border-t border-hairline',
                  )}
                >
                  <div className="min-w-[220px] flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold text-ink">{quiz.title}</h4>
                      <QuizStatusBadge status={quiz.status} />
                      {quiz.isAiGenerated && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-ink-2">
                          <BrainCircuit className="h-2.5 w-2.5" /> AI built
                        </span>
                      )}
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-3">
                      <span className="uppercase">{quiz.category || 'General'}</span>
                      <span>{quiz.questions?.length || 0} questions</span>
                      <span>{quiz.timeLimitMinutes || 0} min</span>
                      <span>Pass {quiz.passingScorePct}%</span>
                      <span>+{quiz.xpReward} XP</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleStartQuiz(quiz._id)}
                      className="gap-1.5 text-[11px]"
                    >
                      <Play className="h-3.5 w-3.5" />
                      Preview
                    </Button>

                    <QuizLifecycleActions
                      quiz={quiz}
                      onChanged={replaceQuiz}
                      onAssign={setAssigningQuiz}
                      onDeleted={dropQuiz}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: authoring and the review queue */}
      {activeTab === 'management' && canManage && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SegmentedTabs
              size="sm"
              active={statusFilter}
              onChange={(id) => setStatusFilter(id as 'ALL' | 'REVIEW' | 'LIVE')}
              tabs={[
                { id: 'ALL', label: 'All', count: allQuizzes.length },
                { id: 'REVIEW', label: 'Needs review', count: reviewCount },
                { id: 'LIVE', label: 'Approved & live', count: readyToAssign.length },
              ]}
            />
            <span className="text-xs text-ink-3">{visibleQuizzes.length} shown</span>
          </div>

          {visibleQuizzes.length === 0 ? (
            <div className="rounded-md border border-hairline bg-surface px-6 py-16 text-center text-xs text-ink-3">
              No quizzes match this filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {visibleQuizzes.map((quiz) => (
                <div
                  key={quiz._id}
                  className="flex flex-col rounded-md border border-hairline bg-surface transition-colors hover:border-ink-3/30"
                >
                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="truncate text-[10px] font-bold tracking-wider text-ink-3 uppercase">
                          {quiz.category || 'General'}
                        </span>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <QuizStatusBadge status={quiz.status} />
                          <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold text-ink-2 capitalize">
                            {quiz.difficulty?.toLowerCase()}
                          </span>
                        </div>
                      </div>

                      <h4 className="line-clamp-2 text-sm font-bold text-ink">{quiz.title}</h4>
                      <p className="mt-1 line-clamp-2 text-xs text-ink-3">
                        {quiz.description || 'Knowledge challenge.'}
                      </p>

                      {/* The numbers on one line, laid out rather than run
                          together with bullet separators. */}
                      <div className="mt-3 grid grid-cols-4 gap-2 rounded-md bg-surface-2/60 px-2.5 py-2">
                        {[
                          { label: 'Questions', value: quiz.questions?.length || 0 },
                          { label: 'Pass', value: `${quiz.passingScorePct}%` },
                          { label: 'Time', value: `${quiz.timeLimitMinutes || 0}m` },
                          { label: 'XP', value: `+${quiz.xpReward}` },
                        ].map((m) => (
                          <div key={m.label} className="min-w-0">
                            <p className="truncate text-[9.5px] font-semibold tracking-wide text-ink-3 uppercase">
                              {m.label}
                            </p>
                            <p className="truncate text-xs font-bold tabular-nums text-ink">
                              {m.value}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {[
                          quiz.attemptPolicy?.maxAttempts === 0
                            ? 'Unlimited attempts'
                            : `${quiz.attemptPolicy?.maxAttempts ?? 1} attempt${(quiz.attemptPolicy?.maxAttempts ?? 1) === 1 ? '' : 's'}`,
                          quiz.shuffleOptions ? 'Options shuffled' : '',
                          quiz.locale && quiz.locale !== 'en' ? quiz.locale.toUpperCase() : '',
                          quiz.isAiGenerated ? 'AI built' : '',
                        ]
                          .filter(Boolean)
                          .map((tag) => (
                            <span
                              key={tag}
                              className="rounded-md border border-hairline px-1.5 py-0.5 text-[10px] text-ink-3"
                            >
                              {tag}
                            </span>
                          ))}
                      </div>

                      {quiz.status === 'APPROVED' && quiz.approvedByName && (
                        <p className="mt-2 text-[10.5px] text-ink-3">
                          Approved by {quiz.approvedByName}
                        </p>
                      )}
                    </div>

                    {/* One row. Five stacked buttons made every card a
                        different height and pushed the real action out of
                        sight. */}
                    <div className="mt-4 flex items-center gap-1 border-t border-hairline pt-3">
                      <QuizLifecycleActions
                        quiz={quiz}
                        onChanged={replaceQuiz}
                        onAssign={setAssigningQuiz}
                        onDeleted={dropQuiz}
                        onPreview={() => handleStartQuiz(quiz._id)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Did any of it work. Managers only; the route refuses anyone else. */}
      {activeTab === 'roi' && canManage && <TrainingRoiPanel quizzes={allQuizzes} />}

      <QuestionBankModal isOpen={isBankOpen} onClose={() => setIsBankOpen(false)} />

      {assigningQuiz && (
        <AssignQuizModal
          quiz={assigningQuiz}
          isOpen={!!assigningQuiz}
          onClose={() => setAssigningQuiz(null)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
};
