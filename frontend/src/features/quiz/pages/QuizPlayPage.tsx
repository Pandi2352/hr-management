import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Trophy,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Zap,
  HelpCircle,
  RotateCcw,
  Check,
  FileText,
} from 'lucide-react';
import { quizApi } from '../api/quiz.api';
import type { Quiz, QuizSubmissionResult, GradedAnswer, LearningLoop } from '../types/quiz.types';
import { Button } from '../../../components/ui';
import { LearningLoopPanel } from '../components/LearningLoopPanel';
import { useToast } from '../../../components/ui/toast';
import { cn } from '../../../utils/cn';

export const QuizPlayPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  /*
   * An absolute deadline, not a counter that ticks down.
   *
   * A decrementing counter is only as accurate as its interval, and a browser
   * throttles timers in a background tab — so switching away used to hand the
   * person extra minutes. Remaining time is derived from the wall clock on
   * every tick instead, and the tick exists only to trigger a re-render.
   */
  const [deadline, setDeadline] = useState<number | null>(null);
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number | null>(null);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  /** Guards against the deadline firing a second submission mid-flight. */
  const hasSubmittedRef = useRef(false);
  /** Mirrors `autoSubmitted` for the memoised submit handler. */
  const autoSubmittedRef = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<QuizSubmissionResult | null>(null);
  /*
   * The diagnosis that goes with the score.
   *
   * Fetched after submitting rather than returned by the grader, because the
   * loop is a record about the person that outlives this attempt — it is read
   * the same way whether you just sat the quiz or came back to it a week later.
   */
  const [loop, setLoop] = useState<LearningLoop | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (id) {
      loadQuiz(id);
    }
  }, [id]);

  const loadQuiz = async (quizId: string) => {
    try {
      setIsLoading(true);
      const data = await quizApi.getQuizForPlay(quizId);
      setQuiz(data);

      if (data.timeLimitMinutes && data.timeLimitMinutes > 0) {
        /*
         * The deadline is kept in session storage against this quiz id.
         *
         * Reloading the page used to restart the clock, which turned a timed
         * assessment into an untimed one for anyone who pressed F5. Restoring
         * the original deadline closes that, and session storage means it does
         * not outlive the tab.
         */
        const key = `quiz-deadline:${quizId}`;
        const stored = Number(sessionStorage.getItem(key) || 0);
        const isUsable = stored > Date.now();
        const endsAt = isUsable ? stored : Date.now() + data.timeLimitMinutes * 60 * 1000;

        if (!isUsable) {
          try {
            sessionStorage.setItem(key, String(endsAt));
          } catch {
            // A private window may refuse. The timer still runs, it just does
            // not survive a reload.
          }
        }

        setDeadline(endsAt);
        startTimeRef.current = endsAt - data.timeLimitMinutes * 60 * 1000;
        setTimeRemainingSeconds(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000)));
      } else {
        startTimeRef.current = Date.now();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load quiz');
      navigate('/quizzes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!quiz || isSubmitting) return;

    try {
      setIsSubmitting(true);
      if (timerRef.current) clearInterval(timerRef.current);

      const elapsedSeconds = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
      /*
       * `optionOrder` travels back with every answer.
       *
       * The server shuffles the options and hands out the mapping it used. The
       * position clicked here is a position in the shuffled list, not in the
       * original; without the mapping the grader compares a position against
       * the original answer key and marks nearly everything wrong.
       *
       * `questionIndex` is the question's original index, which the play
       * payload also supplies, so question shuffling needs nothing extra.
       */
      const submissionAnswers = quiz.questions.map((q: any, idx: number) => ({
        questionIndex: typeof q.index === 'number' ? q.index : idx,
        selectedOptionIndex: answers[idx] !== undefined ? answers[idx] : -1,
        optionOrder: q.optionOrder,
      }));

      const res = await quizApi.submitAttempt(quiz._id, {
        answers: submissionAnswers,
        timeTakenSeconds: elapsedSeconds,
        // Recorded with the attempt, because it changes how a low score should
        // be read later: a paper handed in at the bell is different evidence.
        autoSubmitted: autoSubmittedRef.current,
      });

      setResult(res);
      hasSubmittedRef.current = true;

      // A failure here costs the person nothing: they still have their score.
      quizApi
        .getLearningLoop(quiz._id)
        .then(setLoop)
        .catch(() => {});

      try {
        sessionStorage.removeItem(`quiz-deadline:${quiz._id}`);
      } catch {
        // Nothing to clean up if storage was unavailable to begin with.
      }
      toast.success(
        autoSubmittedRef.current
          ? 'Time is up. Your answered questions were submitted.'
          : 'Challenge submitted.',
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit quiz');
    } finally {
      setIsSubmitting(false);
    }
  }, [quiz, isSubmitting, answers, toast]);

  /**
   * The clock.
   *
   * One interval for the life of the attempt, rather than one per second: the
   * old effect listed the remaining seconds as a dependency, so it tore the
   * interval down and rebuilt it on every tick, and rebuilt it again whenever
   * an answer changed.
   *
   * At zero it submits whatever has been answered. Unanswered questions go in
   * as -1 and score nothing, which is what "auto-submit with the completed
   * questions only" means — the attempt is recorded rather than lost.
   */
  useEffect(() => {
    if (deadline === null || result) return;

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setTimeRemainingSeconds(remaining);

      if (remaining === 0 && !hasSubmittedRef.current) {
        hasSubmittedRef.current = true;
        autoSubmittedRef.current = true;
        setAutoSubmitted(true);
        handleSubmit();
      }
    };

    tick();
    timerRef.current = setInterval(tick, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [deadline, result, handleSubmit]);

  /*
   * A tab that was in the background can miss ticks entirely. Re-deriving on
   * the way back means a person cannot gain time by switching away.
   */
  useEffect(() => {
    if (deadline === null || result) return;

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setTimeRemainingSeconds(remaining);
      if (remaining === 0 && !hasSubmittedRef.current) {
        hasSubmittedRef.current = true;
        autoSubmittedRef.current = true;
        setAutoSubmitted(true);
        handleSubmit();
      }
    };

    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [deadline, result, handleSubmit]);

  const handleSelectOption = (questionIdx: number, optionIdx: number) => {
    if (result) return;
    setAnswers((prev) => ({
      ...prev,
      [questionIdx]: optionIdx,
    }));
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-ink-3 font-medium">Entering Quiz Arena...</p>
      </div>
    );
  }

  if (!quiz) return null;

  // Results Screen View
  if (result) {
    return (
      // Full width like every other page: the loop's concept cards sit two to
      // a row, and a 3xl column squeezed them into a single stack with empty
      // gutters either side.
      <div className="w-full space-y-5">
        {/* Celebration / Score Header Card */}
        <div
          className={`p-6 rounded-md border text-center relative overflow-hidden ${
            result.passed
              ? 'bg-emerald-500/5 border-emerald-500/30'
              : 'bg-amber-500/5 border-amber-500/30'
          }`}
        >
          <div className="inline-flex p-3 rounded-full mb-3 bg-surface border border-hairline">
            {result.passed ? (
              <Trophy className="w-8 h-8 text-amber-500" />
            ) : (
              <RotateCcw className="w-8 h-8 text-amber-500" />
            )}
          </div>

          <h2 className="text-xl font-bold text-ink">
            {result.passed ? 'Challenge Completed!' : 'Attempt Completed'}
          </h2>
          <p className="text-xs text-ink-3 mt-1 max-w-md mx-auto">
            {result.passed
              ? 'Outstanding performance! Your knowledge is powering the organization.'
              : `You achieved ${result.scorePct}%. Keep learning and try again to unlock full points!`}
          </p>

          {/* Said plainly, because a score that arrived without the person
              pressing submit needs explaining. */}
          {autoSubmitted && (() => {
            const unanswered = result.answers.filter((a) => a.selectedOptionIndex < 0).length;
            return (
            <p className="mx-auto mt-3 max-w-md rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              Time ran out, so the quiz submitted itself.
              {unanswered > 0
                ? ` ${unanswered} question${unanswered === 1 ? '' : 's'} went unanswered and scored nothing.`
                : ' Every question had been answered.'}
              </p>
            );
          })()}

          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-3 mt-6 max-w-lg mx-auto">
            <div className="p-3 bg-surface border border-hairline rounded-md">
              <div className="text-[10px] uppercase font-bold text-ink-3">Score</div>
              <div className="text-lg font-extrabold text-ink mt-0.5">
                {result.score} / {result.totalPoints}
              </div>
            </div>
            <div className="p-3 bg-surface border border-hairline rounded-md">
              <div className="text-[10px] uppercase font-bold text-ink-3">Accuracy</div>
              <div className="text-lg font-extrabold text-primary dark:text-primary mt-0.5">
                {result.scorePct}%
              </div>
            </div>
            <div className="p-3 bg-surface border border-hairline rounded-md">
              <div className="text-[10px] uppercase font-bold text-ink-3">XP Earned</div>
              <div className="text-lg font-extrabold text-amber-500 mt-0.5 flex items-center justify-center gap-1">
                <Sparkles className="w-4 h-4" />+{result.xpEarned}
              </div>
            </div>
          </div>

          {/* Badges unlocked */}
          {result.badgesUnlocked && result.badgesUnlocked.length > 0 && (
            <div className="mt-5 p-3 rounded-md bg-primary-light border border-primary/20 inline-flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary dark:text-primary">
                New Badges Unlocked: {result.badgesUnlocked.join(', ')}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
            {result.attemptId && (
              <Button
                size="sm"
                onClick={() => navigate(`/quizzes/attempts/${result.attemptId}`)}
                className="gap-1.5"
              >
                <FileText className="h-3.5 w-3.5" />
                All questions, answers & working
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => navigate('/quizzes')}>
              Back to the arena
            </Button>
          </div>
        </div>

        {/*
          * The loop comes before the answer-by-answer review on purpose.
          *
          * A list of what you got wrong is a record; the loop is the thing to
          * do about it. Put the record first and most people stop reading at
          * the first red cross.
          */}
        {loop && (
          <LearningLoopPanel quizId={quiz._id} loop={loop} onLoopChange={setLoop} />
        )}

        {/* Detailed Breakdown */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-primary" />
            Review Answers & Explanations
          </h3>

          {result.answers.map((item: GradedAnswer, idx: number) => {
            const question = quiz.questions[item.questionIndex] || quiz.questions[idx];
            return (
              <div
                key={idx}
                className={`p-4 rounded-md border bg-surface transition-all ${
                  item.isCorrect ? 'border-emerald-500/30' : 'border-rose-500/30'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="text-xs font-bold text-ink-3 mt-0.5">Q{idx + 1}.</span>
                    <div>
                      <p className="text-xs font-medium text-ink">{question?.prompt || `Question ${idx + 1}`}</p>
                      <div className="mt-3 space-y-1.5">
                        <div
                          className={`text-xs p-2 rounded-md border flex items-center gap-2 ${
                            item.isCorrect
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                              : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          {item.isCorrect ? (
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span>
                            <strong>Your Answer:</strong>{' '}
                            {item.selectedOptionIndex >= 0
                              ? `Option ${String.fromCharCode(65 + item.selectedOptionIndex)}: ${question?.options?.[item.selectedOptionIndex] || ''}`
                              : 'Not answered'}
                          </span>
                        </div>

                        {!item.isCorrect && (
                          <div className="text-xs p-2 rounded-md border bg-surface-2/30 border-hairline text-ink flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>
                              <strong>Correct Answer:</strong>{' '}
                              Option {String.fromCharCode(65 + item.correctOptionIndex)}: {question?.options?.[item.correctOptionIndex] || ''}
                            </span>
                          </div>
                        )}

                        {item.explanation && (
                          <p className="text-[11px] text-ink-3 mt-2 italic bg-surface-2/20 p-2 rounded-md border border-hairline">
                            💡 <strong>Insight:</strong> {item.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                      item.isCorrect
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : 'bg-rose-500/10 text-rose-600'
                    }`}
                  >
                    +{item.pointsAwarded} pts
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Active Play Session View
  const currentQ = quiz.questions[currentIdx];
  const progressPercent = Math.round(((currentIdx + 1) / quiz.questions.length) * 100);
  const isTimeCritical = timeRemainingSeconds !== null && timeRemainingSeconds < 60;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 space-y-5">
      {/* Top Banner & Timer */}
      <div className="bg-surface border border-hairline rounded-md p-4 flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase font-bold text-ink-3 tracking-wider">
            {quiz.category || 'Knowledge Arena'}
          </span>
          <h2 className="text-sm font-bold text-ink line-clamp-1">{quiz.title}</h2>
        </div>

        {timeRemainingSeconds !== null && (
          <div className="flex items-center gap-2">
            {/* Warned at a minute, not only at zero: an auto-submit that
                arrives with no notice reads as the page breaking. */}
            {isTimeCritical && !result && (
              <span className="text-[11px] font-semibold text-rose-500">
                Auto-submits at zero
              </span>
            )}
            <div
              className={cn(
                'flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-xs font-bold',
                isTimeCritical
                  ? 'animate-pulse border-rose-500/30 bg-rose-500/10 text-rose-500'
                  : 'border-hairline bg-surface-2 text-ink',
              )}
              role="timer"
              aria-live={isTimeCritical ? 'assertive' : 'off'}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>{formatTimer(timeRemainingSeconds)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-ink-3">
          <span>
            Question {currentIdx + 1} of {quiz.questions.length}
          </span>
          <span>{answeredCount} of {quiz.questions.length} answered</span>
        </div>
        <div className="h-1.5 w-full bg-surface-2 rounded-full overflow-hidden border border-hairline">
          <div
            className="h-full bg-primary transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Current Question Card */}
      <div className="bg-surface border border-hairline rounded-md p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-ink leading-relaxed">
            {currentQ.prompt}
          </h3>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 whitespace-nowrap">
            {currentQ.points || 10} pts
          </span>
        </div>

        {/* Options List */}
        <div className="space-y-2.5">
          {currentQ.options.map((option, optIdx) => {
            const isSelected = answers[currentIdx] === optIdx;
            const letter = String.fromCharCode(65 + optIdx);
            return (
              <button
                key={optIdx}
                type="button"
                onClick={() => handleSelectOption(currentIdx, optIdx)}
                className={`w-full cursor-pointer text-left p-3.5 rounded-md border flex items-center gap-3 transition-all ${
                  isSelected
                    ? 'border-primary bg-primary-light text-ink ring-1 ring-primary/30'
                    : 'border-hairline bg-surface-2/20 hover:border-border text-ink hover:bg-surface-2'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                    isSelected
                      ? 'bg-primary text-white'
                      : 'bg-surface border border-hairline text-ink-3'
                  }`}
                >
                  {letter}
                </div>
                <span className="text-xs font-medium flex-1">{option}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation & Controls */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
          disabled={currentIdx === 0}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Previous
        </Button>

        <div className="flex items-center gap-2">
          {currentIdx < quiz.questions.length - 1 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentIdx((prev) => Math.min(quiz.questions.length - 1, prev + 1))}
            >
              Next
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={handleSubmit} disabled={isSubmitting}>
              <CheckCircle2 className="h-4 w-4" />
              {isSubmitting ? 'Grading...' : 'Finish & submit'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
