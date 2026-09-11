import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ClipboardCheck,
  Trophy,
  Sparkles,
  BrainCircuit,
  Target,
  BookOpen,
  ListOrdered,
  ArrowLeft,
  Check,
  Send,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { PageHeader } from '../../../components/common/PageHeader';
import { Button, Input } from '../../../components/ui';
import { AiActionButton } from '../../../components/ui/AiActionButton';
import { QuestionEditor } from '../../quiz/components/QuestionEditor';
import { SelectField } from '../../../components/ui/SelectField';
import { FormField } from '../../../components/ui/FormField';
import { useToast } from '../../../components/ui/toast';
import { cn } from '../../../utils/cn';
import { quizApi } from '../../quiz/api/quiz.api';
import type {
  QuizQuestion,
  QuizTemplate,
  QuizLocaleOption,
} from '../../quiz/types/quiz.types';

type AgentStep = 'input' | 'enhanced' | 'generated' | 'success';

/**
 * The four steps, as data.
 *
 * The stepper used to be four near-identical blocks of markup, which is why
 * three of them drifted into slightly different classes. One array, one
 * renderer: a step cannot look different from its neighbours by accident.
 */
const STEPS: { key: AgentStep; label: string }[] = [
  { key: 'input', label: 'Objective & parameters' },
  { key: 'enhanced', label: 'AI enhanced prompt' },
  { key: 'generated', label: 'Review & edit' },
  { key: 'success', label: 'Saved as draft' },
];

const DIFFICULTY_OPTIONS = [
  { value: 'BEGINNER', label: 'Beginner', sublabel: 'Foundational recall' },
  { value: 'INTERMEDIATE', label: 'Intermediate', sublabel: 'Operational judgement' },
  { value: 'ADVANCED', label: 'Advanced', sublabel: 'Scenario-heavy' },
];

/** The server rejects anything outside this range, so the input matches it. */
const MIN_QUESTIONS = 3;
const MAX_QUESTIONS = 15;

/** The window an employee gets. Short enough to stay a check, long enough to read. */
const MIN_MINUTES = 1;
const MAX_MINUTES = 180;

/** The value that means "let the agent choose the category". */
const AUTO_CATEGORY = '';

interface EnhancedPromptData {
  suggestedTitle: string;
  category: string;
  difficulty: string;
  questionCount: number;
  learningObjectives: string[];
  focusAreas: string[];
  refinedPrompt: string;
}

/** One template option. Its purpose is the label, not a tooltip. */
function TemplateChip({
  label,
  hint,
  active,
  onClick,
}: {
  label: string;
  hint: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'max-w-[230px] cursor-pointer rounded-md border px-3 py-2 text-left transition-colors',
        active
          ? 'border-primary bg-primary-light'
          : 'border-hairline bg-surface hover:bg-surface-2',
      )}
    >
      <span className={cn('block text-[12px] font-semibold', active ? 'text-primary' : 'text-ink')}>
        {label}
      </span>
      <span className="block truncate text-[10.5px] text-ink-3">{hint}</span>
    </button>
  );
}

/** One number in the generated-quiz header. */
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2 text-center">
      <div className="text-[10px] font-bold uppercase text-ink-3">{label}</div>
      <div className="mt-0.5 text-xs font-bold text-ink">{value}</div>
    </div>
  );
}

export const QuizAgentPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [step, setStep] = useState<AgentStep>('input');

  // Step 1 Inputs
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState(AUTO_CATEGORY);
  const [locale, setLocale] = useState('en');
  const [templateId, setTemplateId] = useState('');
  const [templates, setTemplates] = useState<QuizTemplate[]>([]);
  const [pendingReview, setPendingReview] = useState(0);
  const [locales, setLocales] = useState<QuizLocaleOption[]>([]);
  const [categories, setCategories] = useState<{ name: string; quizCount: number }[]>([]);
  const [difficulty, setDifficulty] = useState<'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'>('INTERMEDIATE');
  const [questionCount, setQuestionCount] = useState(5);
  const [durationMinutes, setDurationMinutes] = useState(10);
  const [isEnhancing, setIsEnhancing] = useState(false);

  // Step 2 Enhanced Data
  const [enhancedData, setEnhancedData] = useState<EnhancedPromptData | null>(null);
  const [editableRefinedPrompt, setEditableRefinedPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Step 3 Generated Quiz & Assignment
  const [generatedQuiz, setGeneratedQuiz] = useState<{
    title: string;
    description: string;
    category: string;
    difficulty: string;
    timeLimitMinutes: number;
    passingScorePct: number;
    xpReward: number;
    questions: QuizQuestion[];
  } | null>(null);

  const [isPublishing, setIsPublishing] = useState(false);
  const [sentForReview, setSentForReview] = useState(false);


  useEffect(() => {
    // Offering what already exists is what keeps the category list from
    // fragmenting; the server reconciles whatever comes back regardless.
    quizApi
      .categories()
      .then(setCategories)
      .catch(() => {
        // The picker falls back to "let the agent choose", which still works.
      });

    // Templates and languages are static server-side, so a failure here just
    // means the defaults: no template, English.
    // How many quizzes are waiting on somebody. Shown on the review button so
    // a draft written yesterday is not forgotten today.
    quizApi
      .listQuizzes()
      .then((list) =>
        setPendingReview(list.filter((q) => q.status === 'DRAFT' || q.status === 'IN_REVIEW').length),
      )
      .catch(() => {});

    quizApi.templates().then(setTemplates).catch(() => {});
    quizApi.locales().then(setLocales).catch(() => {});
  }, []);

  // Handler: Enhance prompt with AI
  const handleEnhancePrompt = async () => {
    if (!topic.trim()) {
      toast.error('Please enter a quiz topic or training objective.');
      return;
    }

    try {
      setIsEnhancing(true);
      const res = await quizApi.enhancePrompt({
        topic: topic.trim(),
        category,
        difficulty,
        questionCount,
      });

      setEnhancedData(res);
      setEditableRefinedPrompt(res.refinedPrompt);
      setStep('enhanced');
      toast.success('Prompt enhanced! Review assessment blueprint below.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to enhance prompt.');
    } finally {
      setIsEnhancing(false);
    }
  };

  // Handler: Accept enhanced prompt & generate full quiz with AI
  const handleStartGeneration = async () => {
    if (!enhancedData) return;

    try {
      setIsGenerating(true);
      const promptToUse = editableRefinedPrompt.trim() || enhancedData.refinedPrompt;
      const res = await quizApi.generateAiQuiz({
        topic: `${enhancedData.suggestedTitle}: ${promptToUse}`,
        category: enhancedData.category,
        difficulty: enhancedData.difficulty as any,
        questionCount: enhancedData.questionCount,
      });

      setGeneratedQuiz(res);
      setStep('generated');
      toast.success('Quiz generated! Configure company assignment below.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to generate quiz.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handler: Publish & Assign
  /**
   * Saves the reviewed quiz, and optionally sends it for review.
   *
   * The studio stops here. Assignment used to live at the end of this flow,
   * which meant a generated quiz could reach the whole company in the same
   * breath as it was written. It now happens in the arena, against a quiz
   * somebody has approved.
   */
  const handleSaveDraft = async (sendForReview: boolean) => {
    if (!generatedQuiz) return;

    const broken = generatedQuiz.questions.findIndex(
      (q) =>
        !q.prompt.trim() ||
        q.options.some((o) => !o.trim()) ||
        (q.correctOptionIndex ?? 0) >= q.options.length,
    );
    if (broken !== -1) {
      toast.error(`Question ${broken + 1} is incomplete. Fill every option and mark the right one.`);
      return;
    }

    try {
      setIsPublishing(true);
      const saved = await quizApi.createQuiz({
        title: generatedQuiz.title,
        description: generatedQuiz.description,
        category: generatedQuiz.category,
        difficulty: generatedQuiz.difficulty as 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED',
        // The author's duration, not the generator's guess.
        timeLimitMinutes: durationMinutes,
        passingScorePct: generatedQuiz.passingScorePct,
        xpReward: generatedQuiz.xpReward,
        questions: generatedQuiz.questions.map((q) => ({
          prompt: q.prompt,
          options: q.options,
          correctOptionIndex: q.correctOptionIndex ?? 0,
          explanation: q.explanation,
          points: q.points,
        })),
      });

      if (sendForReview) {
        await quizApi.submitForReview(saved._id);
      }

      setSentForReview(sendForReview);
      setStep('success');
      toast.success(sendForReview ? 'Saved and sent for review.' : 'Saved as a draft.');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not save this quiz.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleReset = () => {
    setStep('input');
    setSentForReview(false);
    setTopic('');
    setEnhancedData(null);
    setGeneratedQuiz(null);
  };


  // "Let the agent choose" first, then whatever the organization already uses.
  const categoryOptions = [
    { value: AUTO_CATEGORY, label: 'Let the agent choose', sublabel: 'Recommended' },
    ...categories.map((c) => ({
      value: c.name,
      label: c.name,
      sublabel: c.quizCount === 1 ? '1 quiz' : `${c.quizCount} quizzes`,
    })),
  ];

  return (
    <div className="w-full space-y-5">
      {/* The shared page header, rather than a hand-rolled one. The old block
          reimplemented the title, subtitle and action row with its own spacing,
          which is why it sat at a different rhythm from every other page. */}
      <PageHeader
        title="Quiz Master Studio"
        description="Turn a topic into a graded quiz, then assign it to people or whole departments."
        leading={
          <Link
            to="/agents"
            title="Back to the Agents Hub"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-hairline text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              AGENT-QZ-01
            </span>
            <Button
              onClick={() => navigate('/quizzes?tab=management&filter=review')}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
            >
              <ClipboardCheck className="h-3.5 w-3.5" />
              <span>
                Review queue
                {pendingReview > 0 && (
                  <span className="ml-1.5 rounded-md bg-amber-100 px-1 py-px text-[10px] font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                    {pendingReview}
                  </span>
                )}
              </span>
            </Button>

            <Button onClick={() => navigate('/quizzes')} variant="outline" size="sm" className="gap-1.5 text-xs">
              <Trophy className="h-3.5 w-3.5 text-amber-500" />
              <span>Enter Quiz Arena</span>
            </Button>
          </div>
        }
      />

      {/* Progress stepper — a completed step is marked done, not merely
          un-highlighted, so it is obvious how far along the flow you are. */}
      <nav aria-label="Progress" className="rounded-md border border-hairline bg-surface p-1.5">
        <ol className="grid grid-cols-2 gap-1 md:grid-cols-4">
          {STEPS.map((s2, index) => {
            const currentIndex = STEPS.findIndex((x) => x.key === step);
            const isCurrent = index === currentIndex;
            const isDone = index < currentIndex;

            return (
              <li
                key={s2.key}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2.5 py-2 transition-colors',
                  isCurrent && 'bg-primary-light',
                  !isCurrent && !isDone && 'opacity-70',
                )}
              >
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                    isCurrent && 'bg-primary text-white',
                    isDone && 'bg-emerald-500 text-white',
                    !isCurrent && !isDone && 'border border-hairline bg-surface-2 text-ink-3',
                  )}
                >
                  {isDone ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                <span
                  className={cn(
                    'truncate text-[11.5px]',
                    isCurrent ? 'font-semibold text-primary' : 'text-ink-3',
                  )}
                >
                  {s2.label}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* ========================================================================= */}
      {/* STEP 1: INITIAL TOPIC & PARAMETERS */}
      {/* ========================================================================= */}
      {step === 'input' && (
        <div className="bg-surface border border-hairline rounded-md p-6 space-y-6">
          <div>
            <h2 className="text-sm font-bold text-ink flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Specify Training Topic or Skill Focus
            </h2>
            <p className="text-xs text-ink-3 mt-1">
              Provide your initial topic or rough notes. The Quiz Master Agent will first enhance and
              structure it into a comprehensive assessment blueprint before generating questions.
            </p>
          </div>

          <div className="space-y-4">
            <FormField label="Quiz Subject / Topic">
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Workplace Cybersecurity & Phishing Awareness, Customer Escalation Playbook, Data Privacy Laws"
                className="text-xs"
              />
            </FormField>

            {/* Templates carry the settings that differ by purpose: a
                certification needs one attempt and a high bar, an onboarding
                check needs neither. Picking one fills those in. */}
            {templates.length > 0 && (
              <div>
                <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-3">
                  Start from a template
                </div>
                <div className="flex flex-wrap gap-2">
                  <TemplateChip
                    label="Blank"
                    hint="Set everything yourself"
                    active={!templateId}
                    onClick={() => setTemplateId('')}
                  />
                  {templates.map((t) => (
                    <TemplateChip
                      key={t.id}
                      label={t.name}
                      hint={t.purpose}
                      active={templateId === t.id}
                      onClick={() => {
                        setTemplateId(t.id);
                        setCategory(t.category);
                        setDifficulty(t.difficulty);
                        setQuestionCount(t.questionCount);
                        setDurationMinutes(t.timeLimitMinutes);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
              <SelectField
                label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                options={categoryOptions}
                helperText={
                  category
                    ? 'Fixed to this category.'
                    : 'The agent picks one, reusing an existing category where it fits.'
                }
              />

              <SelectField
                label="Difficulty level"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
                options={DIFFICULTY_OPTIONS}
              />

              <SelectField
                label="Language"
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                options={
                  locales.length
                    ? locales.map((l) => ({ value: l.code, label: l.label }))
                    : [{ value: 'en', label: 'English' }]
                }
                helperText="Questions, options and explanations are written in this language."
              />

              <FormField
                label="Question count"
                helperText={`Between ${MIN_QUESTIONS} and ${MAX_QUESTIONS}.`}
              >
                <Input
                  type="number"
                  min={MIN_QUESTIONS}
                  max={MAX_QUESTIONS}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  // Clamped on blur rather than on every keystroke, so typing
                  // "12" does not fight the user at "1".
                  onBlur={() =>
                    setQuestionCount((n) =>
                      Number.isFinite(n) ? Math.min(MAX_QUESTIONS, Math.max(MIN_QUESTIONS, n)) : 5,
                    )
                  }
                />
              </FormField>

              <FormField
                label="Duration (minutes)"
                helperText={`The clock the employee sees. Auto-submits at zero.`}
              >
                <Input
                  type="number"
                  min={MIN_MINUTES}
                  max={MAX_MINUTES}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  onBlur={() =>
                    setDurationMinutes((n) =>
                      Number.isFinite(n) ? Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, n)) : 10,
                    )
                  }
                />
              </FormField>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-hairline">
            <Button
              onClick={() => navigate('/agents')}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Back to Agents Hub
            </Button>

            <AiActionButton
              onClick={handleEnhancePrompt}
              disabled={!topic.trim()}
              isLoading={isEnhancing}
              label="Build the blueprint"
              loadingLabel="Reading your topic…"
              hint="Turns your topic into objectives and a prompt"
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: REVIEW AI ENHANCED PROMPT & BLUEPRINT */}
      {/* ========================================================================= */}
      {step === 'enhanced' && enhancedData && (
        <div className="space-y-6">
          <div className="bg-surface border border-hairline rounded-md p-6 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary-light text-primary dark:text-primary border border-primary/20 text-[11px] font-bold mb-1.5">
                  <BrainCircuit className="w-3.5 h-3.5" />
                  AI Assessment Blueprint Ready
                </div>
                <h2 className="text-base font-bold text-ink">
                  {enhancedData.suggestedTitle}
                </h2>
                <p className="text-xs text-ink-3 mt-0.5">
                  The Quiz Master Agent has structured your objective into measurable learning goals.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10.5px] px-2 py-0.5 rounded-md bg-surface-2 border border-hairline font-semibold">
                  {enhancedData.difficulty}
                </span>
                <span className="text-[10.5px] px-2 py-0.5 rounded-md bg-surface-2 border border-hairline font-semibold">
                  {enhancedData.questionCount} Questions
                </span>
              </div>
            </div>

            {/* Learning Objectives Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="rounded-md border border-hairline bg-surface-2/30 p-4 space-y-2">
                <h3 className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-primary" />
                  Target Learning Objectives
                </h3>
                <ul className="space-y-1.5 text-xs text-ink-3">
                  {enhancedData.learningObjectives.map((obj, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-md border border-hairline bg-surface-2/30 p-4 space-y-2">
                <h3 className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  Core Focus & Evaluation Areas
                </h3>
                <ul className="space-y-1.5 text-xs text-ink-3">
                  {enhancedData.focusAreas.map((area, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <ListOrdered className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <span>{area}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Refined Detailed Prompt */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-ink flex items-center justify-between">
                <span>Refined AI Generation Prompt</span>
                <span className="text-[10.5px] text-ink-3 font-normal">
                  Editable if you wish to add specific requirements
                </span>
              </label>
              <textarea
                value={editableRefinedPrompt}
                onChange={(e) => setEditableRefinedPrompt(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-hairline bg-surface p-3 text-xs text-ink font-mono leading-relaxed focus:border-primary focus:outline-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-hairline">
              <Button
                onClick={() => setStep('input')}
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Adjust Parameters</span>
              </Button>

              <AiActionButton
                onClick={handleStartGeneration}
                isLoading={isGenerating}
                label="Generate the questions"
                loadingLabel="Writing questions…"
                hint={`${questionCount} questions with answer explanations`}
                size="lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: GENERATED QUESTIONS & IMMEDIATE ASSIGNMENT WORKFLOW */}
      {/* ========================================================================= */}
      {step === 'generated' && generatedQuiz && (
        <div className="space-y-4">
          {/* What the agent produced, and what still has to happen to it */}
          <div className="flex flex-col items-start justify-between gap-4 rounded-md border border-hairline bg-surface p-5 md:flex-row md:items-center">
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                {generatedQuiz.category} · {generatedQuiz.difficulty}
              </span>
              <h2 className="mt-0.5 text-base font-bold text-ink">{generatedQuiz.title}</h2>
              <p className="mt-1 max-w-xl text-xs text-ink-3">{generatedQuiz.description}</p>
            </div>

            <div className="flex items-center gap-3 rounded-md border border-hairline bg-surface-2 p-2.5">
              <Metric label="Questions" value={String(generatedQuiz.questions.length)} />
              <span className="h-6 w-px bg-hairline" />
              <Metric label="Time" value={`${durationMinutes}m`} />
              <span className="h-6 w-px bg-hairline" />
              <Metric label="Pass mark" value={`${generatedQuiz.passingScorePct}%`} />
            </div>
          </div>

          {/*
            Review is the point of this step. Nothing here is assignable yet:
            the studio ends at a draft, and a person approves it in the arena.
            That gate is why a generated answer key cannot reach an employee
            without somebody having read it.
          */}
          <div className="rounded-md border border-hairline bg-surface-2 px-4 py-3 text-[11.5px] leading-relaxed text-ink-2">
            Read every question before saving. The agent is confident even when it is wrong, and an
            unreviewed answer key teaches the whole company the wrong thing. Use{' '}
            <strong className="text-ink">Improve question</strong> on anything that reads oddly.
          </div>

          <div className="space-y-3">
            {generatedQuiz.questions.map((q, idx) => (
              <QuestionEditor
                key={idx}
                question={q}
                index={idx}
                locale={locale}
                difficulty={generatedQuiz.difficulty}
                category={generatedQuiz.category}
                canRemove={generatedQuiz.questions.length > 1}
                onChange={(updated) =>
                  setGeneratedQuiz({
                    ...generatedQuiz,
                    questions: generatedQuiz.questions.map((item, i) => (i === idx ? updated : item)),
                  })
                }
                onRemove={() =>
                  setGeneratedQuiz({
                    ...generatedQuiz,
                    questions: generatedQuiz.questions.filter((_, i) => i !== idx),
                  })
                }
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-hairline bg-surface p-4">
            <Button variant="outline" size="sm" onClick={() => setStep('enhanced')} className="gap-1.5 text-xs">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to the blueprint
            </Button>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSaveDraft(false)}
                disabled={isPublishing}
                className="gap-1.5 text-xs"
              >
                {isPublishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Save as draft
              </Button>

              <Button
                size="sm"
                onClick={() => handleSaveDraft(true)}
                disabled={isPublishing}
                className="gap-1.5 text-xs"
              >
                {isPublishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Save and send for review
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 'success' && (
        <div className="rounded-md border border-hairline bg-surface p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Check className="h-6 w-6" />
          </div>

          <h2 className="text-base font-bold text-ink">
            {sentForReview ? 'Sent for review' : 'Saved as a draft'}
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-ink-3">
            {sentForReview
              ? 'A reviewer approves it in the Quiz Arena, and assignment happens there. Nothing reaches an employee until somebody has read it.'
              : 'It is waiting in the Quiz Arena. Send it for review when you are ready, then approve and assign it there.'}
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 text-xs">
              <RotateCcw className="h-3.5 w-3.5" />
              Build another
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/quizzes?tab=management&filter=review')}
              className="gap-1.5 text-xs"
            >
              <ClipboardCheck className="h-3.5 w-3.5" />
              Go for review
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
