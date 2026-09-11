import { useState } from 'react';
import { BookmarkPlus, Check, Loader2, Plus, RefreshCw, Stethoscope, Trash2, X } from 'lucide-react';
import { Button, Input } from '../../../components/ui';
import { useToast } from '../../../components/ui/toast';
import { cn } from '../../../utils/cn';
import { quizApi } from '../api/quiz.api';
import { toQuestionPayload } from '../utils/question.util';
import { QuestionDoctorPanel } from './QuestionDoctorPanel';
import {
  QUESTION_TYPES,
  QUESTION_TYPE_HINTS,
  QUESTION_TYPE_LABELS,
  type QuestionType,
  type QuizQuestion,
} from '../types/quiz.types';
import type { QuestionDiagnosis } from '../types/quiz.types';

interface Props {
  question: QuizQuestion;
  index: number;
  /** Present once the quiz is saved, which is what regeneration needs. */
  quizId?: string;
  locale?: string;
  difficulty?: string;
  category?: string;
  onChange: (question: QuizQuestion) => void;
  onRemove?: () => void;
  /** Replaces the whole quiz after a server-side regeneration. */
  onRegenerated?: (question: QuizQuestion) => void;
  canRemove?: boolean;
}

/**
 * One question, editable.
 *
 * Everything about a question is changeable here — wording, options, which one
 * is right, the explanation and its tags — because a generated question is a
 * first draft and the reviewer is the one who makes it correct.
 *
 * The three AI affordances sit together at the bottom: diagnose it, rewrite it,
 * or keep it. They are deliberately separate from the fields: a reviewer edits
 * with their own judgement first and asks the model second.
 */
export function QuestionEditor({
  question,
  index,
  quizId,
  locale,
  difficulty,
  category,
  onChange,
  onRemove,
  onRegenerated,
  canRemove = true,
}: Props) {
  const toast = useToast();
  const [diagnosis, setDiagnosis] = useState<QuestionDiagnosis | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isBanking, setIsBanking] = useState(false);
  const [tagDraft, setTagDraft] = useState('');

  const patch = (changes: Partial<QuizQuestion>) => onChange({ ...question, ...changes });

  const type: QuestionType = (question.type as QuestionType) || 'SINGLE';

  /**
   * Changing the type rewrites the fields that type needs.
   *
   * Switching to true/false with four options left behind would produce a
   * question the review gate refuses and the author cannot see the problem
   * with. Each branch leaves the question valid for its new type.
   */
  const changeType = (next: QuestionType) => {
    if (next === type) return;

    if (next === 'TRUE_FALSE') {
      patch({
        type: next,
        options: ['True', 'False'],
        correctOptionIndex: Math.min(question.correctOptionIndex ?? 0, 1),
        correctOptionIndexes: [],
        acceptedAnswers: [],
      });
      return;
    }

    if (next === 'FILL_BLANK') {
      patch({ type: next, options: [], correctOptionIndexes: [], acceptedAnswers: [''] });
      return;
    }

    const options =
      question.options.length >= 2 ? question.options : ['', '', '', ''];

    if (next === 'MULTI') {
      // Carries the single answer over as the first of the set, so the author
      // is adding a second answer rather than starting again.
      patch({
        type: next,
        options,
        correctOptionIndexes: [question.correctOptionIndex ?? 0],
        acceptedAnswers: [],
      });
      return;
    }

    patch({
      type: next,
      options,
      correctOptionIndex: question.correctOptionIndexes?.[0] ?? question.correctOptionIndex ?? 0,
      correctOptionIndexes: [],
      acceptedAnswers: [],
    });
  };

  const toggleCorrect = (optionIndex: number) => {
    if (type === 'MULTI') {
      const current = question.correctOptionIndexes || [];
      patch({
        correctOptionIndexes: current.includes(optionIndex)
          ? current.filter((i) => i !== optionIndex)
          : [...current, optionIndex].sort((a, b) => a - b),
      });
      return;
    }
    patch({ correctOptionIndex: optionIndex });
  };

  const isMarkedCorrect = (optionIndex: number) =>
    type === 'MULTI'
      ? (question.correctOptionIndexes || []).includes(optionIndex)
      : (question.correctOptionIndex ?? 0) === optionIndex;

  const setOption = (optionIndex: number, value: string) => {
    const options = [...question.options];
    options[optionIndex] = value;
    patch({ options });
  };

  const addOption = () => patch({ options: [...question.options, ''] });

  const removeOption = (optionIndex: number) => {
    if (question.options.length <= 2) {
      toast.error('A question needs at least two options.');
      return;
    }
    const options = question.options.filter((_, i) => i !== optionIndex);
    // The key moves with the options, or it would point at the wrong answer.
    const current = question.correctOptionIndex ?? 0;
    const correctOptionIndex =
      optionIndex === current ? 0 : optionIndex < current ? current - 1 : current;
    patch({ options, correctOptionIndex });
  };

  const runDoctor = async () => {
    setIsDiagnosing(true);
    try {
      setDiagnosis(
        await quizApi.diagnoseQuestion({
          prompt: question.prompt,
          options: question.options,
          correctOptionIndex: question.correctOptionIndex ?? 0,
          explanation: question.explanation,
          difficulty,
          locale,
        }),
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'The doctor could not review this question.');
    } finally {
      setIsDiagnosing(false);
    }
  };

  const regenerate = async () => {
    if (!quizId) {
      toast.error('Save the quiz before regenerating a single question.');
      return;
    }
    setIsRegenerating(true);
    try {
      const updated = await quizApi.regenerateQuestion(quizId, index);
      const fresh = updated.questions?.[index];
      if (fresh) {
        onRegenerated?.(fresh);
        setDiagnosis(null);
        toast.success('Question rewritten.');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not regenerate that question.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const keep = async () => {
    setIsBanking(true);
    try {
      await quizApi.addToBank({
        // Whole, so a banked question keeps its type. Banking a
        // fill-in-the-blank as a single choice with no options would put a
        // question in the bank that can never be used again.
        ...toQuestionPayload(question),
        category,
        difficulty,
        locale,
        sourceQuizId: quizId,
      });
      toast.success('Saved to the question bank.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not save that question.');
    } finally {
      setIsBanking(false);
    }
  };

  const addTag = () => {
    const value = tagDraft.trim().toLowerCase();
    if (!value) return;
    const tags = [...new Set([...(question.tags || []), value])].slice(0, 12);
    patch({ tags });
    setTagDraft('');
  };

  return (
    <div className="space-y-3 rounded-md border border-hairline bg-surface p-3.5">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-2 text-[11px] font-bold text-ink-2">
          {index + 1}
        </span>

        <div className="flex shrink-0 items-center gap-1.5">
          {question.isApproved && (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Check className="h-3 w-3" />
              Reviewed
            </span>
          )}
          {canRemove && onRemove && (
            <Button variant="outline" size="sm" onClick={onRemove} className="text-[11px]">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {QUESTION_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => changeType(t)}
            aria-pressed={type === t}
            title={QUESTION_TYPE_HINTS[t]}
            className={cn(
              'cursor-pointer rounded-md border px-2.5 py-1 text-[11px] font-semibold transition-colors',
              type === t
                ? 'border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]'
                : 'border-hairline bg-surface text-ink-3 hover:text-ink',
            )}
          >
            {QUESTION_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <textarea
        value={question.prompt}
        onChange={(e) => patch({ prompt: e.target.value })}
        rows={2}
        placeholder={
          type === 'FILL_BLANK'
            ? 'The question, with ___ where the answer goes'
            : 'The question'
        }
        className="w-full resize-none rounded-md border border-hairline bg-surface px-3 py-2 text-xs text-ink outline-none placeholder:text-ink-3 focus:border-primary"
      />

      {type === 'FILL_BLANK' ? (
        <div className="space-y-1.5">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-3">
            Accepted answers · any one of these counts as correct
          </div>

          {(question.acceptedAnswers || ['']).map((answer, answerIndex) => (
            <div key={answerIndex} className="flex items-center gap-2">
              <Input
                value={answer}
                onChange={(e) => {
                  const next = [...(question.acceptedAnswers || [''])];
                  next[answerIndex] = e.target.value;
                  patch({ acceptedAnswers: next });
                }}
                placeholder={answerIndex === 0 ? 'The answer' : 'Another spelling or wording'}
                className="text-xs"
              />
              {(question.acceptedAnswers || []).length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    patch({
                      acceptedAnswers: (question.acceptedAnswers || []).filter(
                        (_, i) => i !== answerIndex,
                      ),
                    })
                  }
                  aria-label={`Remove accepted answer ${answerIndex + 1}`}
                  className="shrink-0 cursor-pointer text-ink-3 transition-colors hover:text-rose-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={() => patch({ acceptedAnswers: [...(question.acceptedAnswers || []), ''] })}
            className="gap-1 text-[11px]"
          >
            <Plus className="h-3 w-3" />
            Add another wording
          </Button>

          <p className="text-[10.5px] text-ink-3">
            Case and surrounding spaces are ignored when marking. Add the plural and any common
            spelling, or people who know the answer will be marked wrong.
          </p>
        </div>
      ) : (
      <div className="space-y-1.5">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-3">
          {type === 'MULTI'
            ? 'Options · tick every correct one'
            : 'Options · click the circle to mark the right one'}
        </div>

        {question.options.map((option, optionIndex) => {
          const isCorrect = isMarkedCorrect(optionIndex);
          return (
            <div key={optionIndex} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleCorrect(optionIndex)}
                aria-label={`Mark option ${optionIndex + 1} as correct`}
                aria-pressed={isCorrect}
                className={cn(
                  'flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center border transition-colors',
                  // Square for "tick as many as apply", round for "choose one".
                  type === 'MULTI' ? 'rounded-md' : 'rounded-full',
                  isCorrect
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-hairline hover:border-ink-3',
                )}
              >
                {isCorrect && <Check className="h-3 w-3" />}
              </button>

              <Input
                value={option}
                onChange={(e) => setOption(optionIndex, e.target.value)}
                placeholder={`Option ${optionIndex + 1}`}
                className="text-xs"
                disabled={type === 'TRUE_FALSE'}
              />

              {type !== 'TRUE_FALSE' && (
                <button
                  type="button"
                  onClick={() => removeOption(optionIndex)}
                  aria-label={`Remove option ${optionIndex + 1}`}
                  className="shrink-0 cursor-pointer text-ink-3 transition-colors hover:text-rose-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}

        {type !== 'TRUE_FALSE' && question.options.length < 6 && (
          <Button variant="outline" size="sm" onClick={addOption} className="gap-1 text-[11px]">
            <Plus className="h-3 w-3" />
            Add option
          </Button>
        )}

        {type === 'MULTI' && (question.correctOptionIndexes || []).length < 2 && (
          <p className="text-[10.5px] text-amber-700 dark:text-amber-300">
            Tick at least two. A multiple-answer question with one answer is a single choice
            wearing the wrong label, and review will refuse it.
          </p>
        )}
      </div>
      )}

      <div>
        <div className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-3">
          Explanation · shown after the attempt
        </div>
        <textarea
          value={question.explanation || ''}
          onChange={(e) => patch({ explanation: e.target.value })}
          rows={2}
          placeholder="Why the marked answer is correct"
          className="w-full resize-none rounded-md border border-hairline bg-surface px-3 py-2 text-xs text-ink outline-none placeholder:text-ink-3 focus:border-primary"
        />
      </div>

      <div>
        <div className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-3">
          Tags · topic, skill, policy, role
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(question.tags || []).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-1.5 py-0.5 text-[10.5px] font-medium text-ink-2"
            >
              {tag}
              <button
                type="button"
                onClick={() => patch({ tags: (question.tags || []).filter((t) => t !== tag) })}
                aria-label={`Remove ${tag}`}
                className="cursor-pointer opacity-60 hover:opacity-100"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
          <div className="w-40">
            <Input
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="Add a tag"
              className="text-[11px]"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-hairline pt-3">
        <Button variant="outline" size="sm" onClick={runDoctor} disabled={isDiagnosing} className="gap-1.5 text-[11px]">
          {isDiagnosing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Stethoscope className="h-3.5 w-3.5" />}
          {isDiagnosing ? 'Reviewing' : 'Improve question'}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={regenerate}
          disabled={isRegenerating || !quizId}
          title={quizId ? undefined : 'Save the quiz first'}
          className="gap-1.5 text-[11px]"
        >
          {isRegenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Regenerate
        </Button>

        <Button variant="outline" size="sm" onClick={keep} disabled={isBanking} className="gap-1.5 text-[11px]">
          {isBanking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BookmarkPlus className="h-3.5 w-3.5" />}
          Keep in bank
        </Button>
      </div>

      {diagnosis && (
        <QuestionDoctorPanel
          diagnosis={diagnosis}
          onApplyRewrite={(rewrite) => patch({ prompt: rewrite })}
          onApplyExplanation={(explanation) => patch({ explanation })}
          onApplyDistractors={(distractors) => {
            // Replaces only the wrong options, keeping the marked answer where
            // it is: swapping that too would silently change the answer key.
            const correct = question.correctOptionIndex ?? 0;
            const options = [...question.options];
            let next = 0;
            for (let i = 0; i < options.length && next < distractors.length; i += 1) {
              if (i === correct) continue;
              options[i] = distractors[next];
              next += 1;
            }
            patch({ options });
          }}
        />
      )}
    </div>
  );
}
