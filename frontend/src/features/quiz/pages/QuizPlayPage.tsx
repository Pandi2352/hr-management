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
} from 'lucide-react';
import { quizApi } from '../api/quiz.api';
import type { Quiz, QuizSubmissionResult, GradedAnswer } from '../types/quiz.types';
import { useToast } from '../../../components/ui/toast';

export const QuizPlayPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeRemainingSeconds, setTimeRemainingSeconds] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [result, setResult] = useState<QuizSubmissionResult | null>(null);
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
      startTimeRef.current = Date.now();
      if (data.timeLimitMinutes && data.timeLimitMinutes > 0) {
        setTimeRemainingSeconds(data.timeLimitMinutes * 60);
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
      const submissionAnswers = quiz.questions.map((_, idx) => ({
        questionIndex: idx,
        selectedOptionIndex: answers[idx] !== undefined ? answers[idx] : -1,
      }));

      const res = await quizApi.submitAttempt(quiz._id, {
        answers: submissionAnswers,
        timeTakenSeconds: elapsedSeconds,
      });

      setResult(res);
      toast.success('Challenge submitted successfully!');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit quiz');
    } finally {
      setIsSubmitting(false);
    }
  }, [quiz, isSubmitting, answers, toast]);

  // Countdown timer effect
  useEffect(() => {
    if (timeRemainingSeconds === null || result) return;

    if (timeRemainingSeconds <= 0) {
      handleSubmit();
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeRemainingSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timerRef.current);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeRemainingSeconds, result, handleSubmit]);

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
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-muted-foreground font-medium">Entering Quiz Arena...</p>
      </div>
    );
  }

  if (!quiz) return null;

  // Results Screen View
  if (result) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-6">
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

          <h2 className="text-xl font-bold text-foreground">
            {result.passed ? 'Challenge Completed!' : 'Attempt Completed'}
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            {result.passed
              ? 'Outstanding performance! Your knowledge is powering the organization.'
              : `You achieved ${result.scorePct}%. Keep learning and try again to unlock full points!`}
          </p>

          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-3 mt-6 max-w-lg mx-auto">
            <div className="p-3 bg-surface border border-hairline rounded-md">
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Score</div>
              <div className="text-lg font-extrabold text-foreground mt-0.5">
                {result.score} / {result.totalPoints}
              </div>
            </div>
            <div className="p-3 bg-surface border border-hairline rounded-md">
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Accuracy</div>
              <div className="text-lg font-extrabold text-brand-600 dark:text-brand-400 mt-0.5">
                {result.scorePct}%
              </div>
            </div>
            <div className="p-3 bg-surface border border-hairline rounded-md">
              <div className="text-[10px] uppercase font-bold text-muted-foreground">XP Earned</div>
              <div className="text-lg font-extrabold text-amber-500 mt-0.5 flex items-center justify-center gap-1">
                <Sparkles className="w-4 h-4" />+{result.xpEarned}
              </div>
            </div>
          </div>

          {/* Badges unlocked */}
          {result.badgesUnlocked && result.badgesUnlocked.length > 0 && (
            <div className="mt-5 p-3 rounded-md bg-brand-500/10 border border-brand-500/20 inline-flex items-center gap-2">
              <Zap className="w-4 h-4 text-brand-500" />
              <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">
                New Badges Unlocked: {result.badgesUnlocked.join(', ')}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={() => navigate('/quizzes')}
              className="px-4 py-2 text-xs font-semibold bg-brand-500 hover:bg-brand-600 text-white rounded-md transition-all shadow-none"
            >
              Back to Quiz Arena
            </button>
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-brand-500" />
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
                    <span className="text-xs font-bold text-muted-foreground mt-0.5">Q{idx + 1}.</span>
                    <div>
                      <p className="text-xs font-medium text-foreground">{question?.prompt || `Question ${idx + 1}`}</p>
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
                          <div className="text-xs p-2 rounded-md border bg-surface-hover/30 border-hairline text-foreground flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>
                              <strong>Correct Answer:</strong>{' '}
                              Option {String.fromCharCode(65 + item.correctOptionIndex)}: {question?.options?.[item.correctOptionIndex] || ''}
                            </span>
                          </div>
                        )}

                        {item.explanation && (
                          <p className="text-[11px] text-muted-foreground mt-2 italic bg-surface-hover/20 p-2 rounded-md border border-hairline">
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
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
            {quiz.category || 'Knowledge Arena'}
          </span>
          <h2 className="text-sm font-bold text-foreground line-clamp-1">{quiz.title}</h2>
        </div>

        {timeRemainingSeconds !== null && (
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border font-mono text-xs font-bold ${
              isTimeCritical
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 animate-pulse'
                : 'bg-surface-hover border-hairline text-foreground'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTimer(timeRemainingSeconds)}</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Question {currentIdx + 1} of {quiz.questions.length}
          </span>
          <span>{answeredCount} of {quiz.questions.length} answered</span>
        </div>
        <div className="h-1.5 w-full bg-surface-hover rounded-full overflow-hidden border border-hairline">
          <div
            className="h-full bg-brand-500 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Current Question Card */}
      <div className="bg-surface border border-hairline rounded-md p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold text-foreground leading-relaxed">
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
                className={`w-full text-left p-3.5 rounded-md border flex items-center gap-3 transition-all ${
                  isSelected
                    ? 'border-brand-500 bg-brand-500/10 text-foreground ring-1 ring-brand-500/30'
                    : 'border-hairline bg-surface-hover/20 hover:border-border text-foreground hover:bg-surface-hover/50'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                    isSelected
                      ? 'bg-brand-500 text-white'
                      : 'bg-surface border border-hairline text-muted-foreground'
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
        <button
          type="button"
          onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
          disabled={currentIdx === 0}
          className="px-3.5 py-2 text-xs font-medium border border-hairline rounded-md hover:bg-surface-hover text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Previous
        </button>

        <div className="flex items-center gap-2">
          {currentIdx < quiz.questions.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentIdx((prev) => Math.min(quiz.questions.length - 1, prev + 1))}
              className="px-4 py-2 text-xs font-semibold bg-surface-hover hover:bg-surface-hover/80 border border-hairline text-foreground rounded-md transition-colors flex items-center gap-1.5"
            >
              Next
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold bg-brand-500 hover:bg-brand-600 text-white rounded-md transition-all shadow-none flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Grading Challenge...' : 'Finish & Submit'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
