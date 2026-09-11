import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AiService } from '../ai/ai.service';
import { LoggerHelper } from '../../common/logger';
import { Quiz, QuizDocument, QUIZ_LOCALE_LABELS, type QuizLocale } from './schemas/quiz.schema';
import { BankQuestion, BankQuestionDocument } from './schemas/question-bank.schema';
import {
  LearningLoop,
  LearningLoopDocument,
  PracticeSet,
  PracticeSetDocument,
} from './schemas/learning-loop.schema';
import {
  applyOutcomes,
  conceptKey,
  conceptsForQuestion,
  masteryBand,
  masteryPct,
  masteryTrend,
  practiceSizeFor,
  weakConceptsFromAttempt,
  type AnswerOutcome,
  type MasteryBand,
} from './learning-loop.util';

/** How many recorded answers per concept are kept for the trend line. */
const MAX_HISTORY_PER_CONCEPT = 20;

/** How many concepts the coach will write about in one pass. */
const MAX_COACHED_CONCEPTS = 4;

interface GradedAnswerLike {
  questionIndex: number;
  isCorrect: boolean;
}

export interface ConceptView {
  concept: string;
  seen: number;
  correct: number;
  masteryPct: number;
  band: MasteryBand;
  trend: 'UP' | 'DOWN' | 'FLAT';
  /** Mastery when this concept was first flagged, so movement is visible. */
  baselinePct: number;
  isWeak: boolean;
  coaching: {
    whyItMatters: string;
    explanation: string;
    commonMistake: string;
    practiceTips: string[];
    source: 'AI' | 'QUIZ';
    generatedAt: Date | null;
  } | null;
  lastSeenAt: Date;
}

export interface LearningLoopView {
  quizId: string;
  quizTitle: string;
  quizCategory: string;
  lastScorePct: number;
  firstScorePct: number;
  attemptCount: number;
  practiceCount: number;
  lastPracticedAt: Date | null;
  /** 0–100 across every concept this quiz has measured. */
  overallMasteryPct: number;
  weakConcepts: string[];
  concepts: ConceptView[];
  hasOpenPractice: boolean;
  openPracticeId: string | null;
}

/**
 * Wrong Answer → Learning Loop.
 *
 * The five steps are one cycle, and this service owns all of them:
 *
 *   1. a quiz is submitted            → `recordQuizAttempt`
 *   2. weak concepts are identified   → `recordQuizAttempt`, via the tags on
 *                                       the questions that were missed
 *   3. the concepts are explained     → `coach`
 *   4. a targeted retry is built      → `buildPractice` / `submitPractice`
 *   5. mastery moves                  → recomputed on every write, shown by
 *                                       `getLoop` against the baseline
 *
 * Separate from both `QuizService` (which owns grading and the leaderboard) and
 * `QuizAuthoringService` (which owns getting a quiz written) because this is
 * the only part of the module that writes a record *about a person* rather than
 * about a quiz. That record is shown back to them as a judgement of what they
 * know, so it is kept plain, reproducible, and never inflated: practice earns
 * no XP and touches no leaderboard, precisely so that drilling a weakness stays
 * an honest activity rather than a way to farm points.
 */
@Injectable()
export class LearningLoopService {
  private readonly logger = LoggerHelper.Instance.child(LearningLoopService.name);

  constructor(
    @InjectModel(LearningLoop.name)
    private readonly loopModel: Model<LearningLoopDocument>,
    @InjectModel(PracticeSet.name)
    private readonly practiceModel: Model<PracticeSetDocument>,
    @InjectModel(Quiz.name) private readonly quizModel: Model<QuizDocument>,
    @InjectModel(BankQuestion.name) private readonly bankModel: Model<BankQuestionDocument>,
    private readonly aiService: AiService,
  ) {}

  // --- Step 1 & 2: submitted, and what went wrong ---------------------------

  /**
   * Folds a graded attempt into the person's loop.
   *
   * Deliberately swallows its own failures. This runs inside the submit path,
   * and a diagnosis that cannot be written is not a reason to lose somebody's
   * attempt — the score is the record that matters, the loop is the help.
   */
  async recordQuizAttempt(
    orgId: string,
    employeeId: string,
    quiz: Quiz,
    gradedAnswers: GradedAnswerLike[],
    attemptId: string,
    scorePct: number,
  ): Promise<void> {
    try {
      const outcomes = this.outcomesFor(quiz, gradedAnswers);
      const weak = weakConceptsFromAttempt(outcomes);

      const loop =
        (await this.loopModel.findOne({ organizationId: orgId, employeeId, quizId: quiz._id })) ||
        new this.loopModel({
          organizationId: orgId,
          employeeId,
          quizId: quiz._id,
          firstScorePct: scorePct,
        });

      this.fold(loop, outcomes, 'QUIZ');

      loop.quizTitle = quiz.title;
      loop.quizCategory = quiz.category || '';
      loop.weakConcepts = weak.map((w) => w.concept);
      loop.lastAttemptId = attemptId;
      loop.lastScorePct = scorePct;
      loop.attemptCount = (loop.attemptCount || 0) + 1;
      if (loop.attemptCount === 1) loop.firstScorePct = scorePct;

      // A concept only gets a baseline the first time it is called weak, so
      // later practice is measured against where the person actually started.
      const weakKeys = new Set(weak.map((w) => conceptKey(w.concept)));
      loop.concepts.forEach((c) => {
        if (weakKeys.has(c.conceptKey) && !c.baselinePct) {
          c.baselinePct = masteryPct({ seen: c.seen, correct: c.correct });
        }
      });

      loop.markModified('concepts');
      await loop.save();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(null, `Learning loop not recorded for attempt ${attemptId}: ${message}`);
    }
  }

  /** Maps graded answers onto the concepts their questions carry. */
  private outcomesFor(quiz: Quiz, gradedAnswers: GradedAnswerLike[]): AnswerOutcome[] {
    return gradedAnswers
      .map((a) => {
        const question = quiz.questions?.[a.questionIndex];
        if (!question) return null;
        return {
          concepts: conceptsForQuestion({
            tags: question.tags,
            section: question.section,
            category: quiz.category,
          }),
          isCorrect: Boolean(a.isCorrect),
        };
      })
      .filter((x): x is AnswerOutcome => x !== null);
  }

  /** Applies outcomes to the stored tallies and appends to the trend log. */
  private fold(
    loop: LearningLoopDocument,
    outcomes: AnswerOutcome[],
    source: 'QUIZ' | 'PRACTICE',
  ): void {
    const tallies = applyOutcomes(
      (loop.concepts || []).map((c) => ({
        concept: c.concept,
        seen: c.seen,
        correct: c.correct,
      })),
      outcomes,
    );

    const existing = new Map((loop.concepts || []).map((c) => [c.conceptKey, c]));
    const now = new Date();

    const touched = new Set<string>();
    for (const outcome of outcomes) {
      for (const concept of outcome.concepts) {
        const key = conceptKey(concept);
        if (!key) continue;
        touched.add(key);
        const row = existing.get(key);
        if (row) {
          row.history = [
            ...(row.history || []),
            { at: now, correct: outcome.isCorrect, source },
          ].slice(-MAX_HISTORY_PER_CONCEPT);
          row.lastSeenAt = now;
        }
      }
    }

    loop.concepts = tallies.map((t) => {
      const key = conceptKey(t.concept);
      const prior = existing.get(key);

      if (prior) {
        prior.seen = t.seen;
        prior.correct = t.correct;
        return prior;
      }

      const history = outcomes
        .filter((o) => o.concepts.some((c) => conceptKey(c) === key))
        .map((o) => ({ at: now, correct: o.isCorrect, source }));

      return {
        concept: t.concept,
        conceptKey: key,
        seen: t.seen,
        correct: t.correct,
        baselinePct: 0,
        coaching: {
          whyItMatters: '',
          explanation: '',
          commonMistake: '',
          practiceTips: [],
          source: 'QUIZ' as const,
          generatedAt: null,
        },
        history: history.slice(-MAX_HISTORY_PER_CONCEPT),
        lastSeenAt: now,
      };
    }) as LearningLoopDocument['concepts'];

    void touched;
  }

  // --- Reading it back ------------------------------------------------------

  async getLoop(orgId: string, employeeId: string, quizId: string): Promise<LearningLoopView | null> {
    const loop = await this.loopModel.findOne({ organizationId: orgId, employeeId, quizId });
    if (!loop) return null;

    const open = await this.practiceModel
      .findOne({ organizationId: orgId, employeeId, quizId, status: 'OPEN' })
      .sort({ createdAt: -1 })
      .lean();

    return this.toView(loop, open?._id || null);
  }

  /** Every concept this person has been measured on, worst first. */
  async myMastery(orgId: string, employeeId: string): Promise<ConceptView[]> {
    const loops = await this.loopModel.find({ organizationId: orgId, employeeId });

    const merged = new Map<string, ConceptView>();
    for (const loop of loops) {
      for (const view of this.conceptViews(loop)) {
        const key = conceptKey(view.concept);
        const prior = merged.get(key);
        if (!prior) {
          merged.set(key, view);
          continue;
        }
        // The same concept can be measured by more than one quiz; the person
        // has one level of understanding, so the tallies are added together.
        const seen = prior.seen + view.seen;
        const correct = prior.correct + view.correct;
        const pct = masteryPct({ seen, correct });
        merged.set(key, {
          ...prior,
          seen,
          correct,
          masteryPct: pct,
          band: masteryBand(pct, seen),
          isWeak: prior.isWeak || view.isWeak,
          coaching: prior.coaching || view.coaching,
          lastSeenAt: prior.lastSeenAt > view.lastSeenAt ? prior.lastSeenAt : view.lastSeenAt,
        });
      }
    }

    return Array.from(merged.values()).sort(
      (a, b) => a.masteryPct - b.masteryPct || b.seen - a.seen || a.concept.localeCompare(b.concept),
    );
  }

  private conceptViews(loop: LearningLoopDocument | LearningLoop): ConceptView[] {
    const weakKeys = new Set((loop.weakConcepts || []).map(conceptKey));

    return (loop.concepts || []).map((c) => {
      const pct = masteryPct({ seen: c.seen, correct: c.correct });
      const hasCoaching = Boolean(c.coaching?.explanation);

      return {
        concept: c.concept,
        seen: c.seen,
        correct: c.correct,
        masteryPct: pct,
        band: masteryBand(pct, c.seen),
        trend: masteryTrend(c.history || []),
        baselinePct: c.baselinePct || 0,
        isWeak: weakKeys.has(c.conceptKey),
        coaching: hasCoaching
          ? {
              whyItMatters: c.coaching.whyItMatters || '',
              explanation: c.coaching.explanation || '',
              commonMistake: c.coaching.commonMistake || '',
              practiceTips: c.coaching.practiceTips || [],
              source: c.coaching.source || 'QUIZ',
              generatedAt: c.coaching.generatedAt || null,
            }
          : null,
        lastSeenAt: c.lastSeenAt || new Date(),
      };
    });
  }

  private toView(loop: LearningLoopDocument, openPracticeId: string | null): LearningLoopView {
    const concepts = this.conceptViews(loop).sort(
      (a, b) =>
        Number(b.isWeak) - Number(a.isWeak) ||
        a.masteryPct - b.masteryPct ||
        a.concept.localeCompare(b.concept),
    );

    const totals = concepts.reduce(
      (acc, c) => ({ seen: acc.seen + c.seen, correct: acc.correct + c.correct }),
      { seen: 0, correct: 0 },
    );

    return {
      quizId: loop.quizId,
      quizTitle: loop.quizTitle,
      quizCategory: loop.quizCategory,
      lastScorePct: loop.lastScorePct,
      firstScorePct: loop.firstScorePct,
      attemptCount: loop.attemptCount,
      practiceCount: loop.practiceCount,
      lastPracticedAt: loop.lastPracticedAt,
      overallMasteryPct: masteryPct(totals),
      weakConcepts: loop.weakConcepts || [],
      concepts,
      hasOpenPractice: Boolean(openPracticeId),
      openPracticeId,
    };
  }

  // --- Step 3: explain it ---------------------------------------------------

  /**
   * Writes the coaching for whatever is currently weak.
   *
   * Falls back to the quiz's own explanations when no model is configured. That
   * fallback is the reason this is worth shipping to an organisation with no AI
   * provider at all: the loop still names the weakness, still says what the
   * right answer was and why, and still builds a retry. The model makes the
   * explanation better, it is not what makes the feature work.
   */
  async coach(
    orgId: string,
    employeeId: string,
    quizId: string,
    force = false,
  ): Promise<LearningLoopView> {
    const loop = await this.loopModel.findOne({ organizationId: orgId, employeeId, quizId });
    if (!loop) throw new NotFoundException('There is no attempt to learn from yet.');

    const quiz = await this.quizModel.findOne({ _id: quizId, organizationId: orgId }).lean();
    if (!quiz) throw new NotFoundException('Quiz not found.');

    const targets = (loop.weakConcepts || []).slice(0, MAX_COACHED_CONCEPTS);
    if (targets.length === 0) {
      return this.toView(loop, null);
    }

    for (const concept of targets) {
      const key = conceptKey(concept);
      const row = loop.concepts.find((c) => c.conceptKey === key);
      if (!row) continue;
      if (row.coaching?.explanation && !force) continue;

      const evidence = this.evidenceFor(quiz as Quiz, concept);
      const coaching =
        (await this.aiCoaching(orgId, quiz as Quiz, concept, evidence)) ||
        this.fallbackCoaching(concept, evidence);

      row.coaching = coaching as (typeof row)['coaching'];
    }

    loop.markModified('concepts');
    await loop.save();
    return this.toView(loop, null);
  }

  /** The questions in this quiz that belong to a concept. */
  private evidenceFor(quiz: Quiz, concept: string): { prompt: string; answer: string; explanation: string }[] {
    const key = conceptKey(concept);
    return (quiz.questions || [])
      .filter((q) =>
        conceptsForQuestion({ tags: q.tags, section: q.section, category: quiz.category }).some(
          (c) => conceptKey(c) === key,
        ),
      )
      .map((q) => ({
        prompt: q.prompt,
        answer: q.options?.[q.correctOptionIndex] || '',
        explanation: q.explanation || '',
      }))
      .slice(0, 6);
  }

  private localeInstruction(locale: QuizLocale | string | undefined): string {
    const code = (locale || 'en') as QuizLocale;
    if (code === 'en') return '';
    const label = QUIZ_LOCALE_LABELS[code] || code;
    return `\nWrite every field in ${label}, using that language's own script.`;
  }

  private async aiCoaching(
    orgId: string,
    quiz: Quiz,
    concept: string,
    evidence: { prompt: string; answer: string; explanation: string }[],
  ) {
    const systemPrompt = `You are coaching one employee who just got questions wrong on a single concept.

Respond ONLY with raw JSON:
{
  "whyItMatters": "One sentence on why this matters in their actual work",
  "explanation": "2-4 sentences teaching the concept from the beginning",
  "commonMistake": "The specific wrong assumption people make here",
  "practiceTips": ["two or three things to DO, each under 15 words"]
}

Write to the person, not about them. Never shame them for getting it wrong. Teach the idea, do not simply restate the answer.${this.localeInstruction(quiz.locale)}`;

    const userPrompt = `Quiz: "${quiz.title}" (${quiz.category})
Concept they are weak on: ${concept}

The questions in this quiz that cover it, with the correct answers:
${evidence
  .map((e, i) => `${i + 1}. ${e.prompt}\n   Correct: ${e.answer}\n   Note: ${e.explanation || '(none)'}`)
  .join('\n')}`;

    try {
      const out = await this.aiService.generateJson<{
        whyItMatters?: string;
        explanation?: string;
        commonMistake?: string;
        practiceTips?: string[];
      }>(userPrompt, systemPrompt, { organizationId: orgId });

      if (!out?.explanation) return null;

      return {
        whyItMatters: String(out.whyItMatters || '').trim(),
        explanation: String(out.explanation).trim(),
        commonMistake: String(out.commonMistake || '').trim(),
        practiceTips: (out.practiceTips || []).map((t) => String(t).trim()).filter(Boolean).slice(0, 4),
        source: 'AI' as const,
        generatedAt: new Date(),
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(null, `AI coaching unavailable for "${concept}": ${message}`);
      return null;
    }
  }

  /** Coaching assembled from the quiz itself, for when no model is reachable. */
  private fallbackCoaching(
    concept: string,
    evidence: { prompt: string; answer: string; explanation: string }[],
  ) {
    const notes = evidence.map((e) => e.explanation).filter(Boolean);

    return {
      whyItMatters: `${concept} came up ${evidence.length === 1 ? 'once' : `${evidence.length} times`} in this quiz, and you did not have it yet.`,
      explanation:
        notes.length > 0
          ? notes.slice(0, 3).join(' ')
          : `Go back over ${concept} in the source material. The questions you missed all turn on it.`,
      commonMistake: '',
      practiceTips: evidence
        .slice(0, 3)
        .map((e) => `Re-read why the answer is "${e.answer}".`),
      source: 'QUIZ' as const,
      generatedAt: new Date(),
    };
  }

  // --- Step 4: the targeted retry -------------------------------------------

  /**
   * Builds a practice set aimed only at what was missed.
   *
   * Questions come from three places in order of preference: the bank, because
   * a reviewed question is better than a fresh one; the model, for concepts the
   * bank cannot cover; and failing both, the quiz's own questions, which at
   * least drill the right thing. Never more than nine, and never a re-run of
   * the whole quiz — the loop is the short way back.
   */
  async buildPractice(orgId: string, employeeId: string, quizId: string) {
    const loop = await this.loopModel.findOne({ organizationId: orgId, employeeId, quizId });
    if (!loop) throw new NotFoundException('There is no attempt to practise against yet.');

    const weak = (loop.weakConcepts || []).slice(0, 3);
    if (weak.length === 0) {
      throw new BadRequestException('Nothing to practise — you did not miss anything.');
    }

    const quiz = await this.quizModel.findOne({ _id: quizId, organizationId: orgId }).lean();
    if (!quiz) throw new NotFoundException('Quiz not found.');

    const target = practiceSizeFor(weak.length);
    const perConcept = Math.max(1, Math.ceil(target / weak.length));
    const questions: PracticeSet['questions'] = [];
    const usedPrompts = new Set<string>();

    for (const concept of weak) {
      const picked: PracticeSet['questions'] = [];

      // 1. The bank: reviewed questions on this concept.
      const banked = await this.bankModel
        .find({
          organizationId: orgId,
          tags: { $regex: new RegExp(`^${escapeRegex(concept)}$`, 'i') },
        })
        .limit(perConcept)
        .lean();

      for (const b of banked) {
        if (usedPrompts.has(b.prompt.toLowerCase())) continue;
        usedPrompts.add(b.prompt.toLowerCase());
        picked.push({
          prompt: b.prompt,
          options: b.options,
          correctOptionIndex: b.correctOptionIndex,
          explanation: b.explanation,
          concept,
          origin: 'BANK',
        });
      }

      // 2. The model, for whatever the bank could not cover.
      if (picked.length < perConcept) {
        const generated = await this.aiPracticeQuestions(
          orgId,
          quiz as Quiz,
          concept,
          perConcept - picked.length,
          Array.from(usedPrompts),
        );
        for (const g of generated) {
          if (usedPrompts.has(g.prompt.toLowerCase())) continue;
          usedPrompts.add(g.prompt.toLowerCase());
          picked.push({ ...g, concept, origin: 'AI' });
        }
      }

      // 3. The quiz itself. Drilling the same question is not ideal, but it is
      //    on the right concept, and an empty practice set helps nobody.
      if (picked.length === 0) {
        const key = conceptKey(concept);
        const own = (quiz.questions || []).filter((q) =>
          conceptsForQuestion({ tags: q.tags, section: q.section, category: quiz.category }).some(
            (c) => conceptKey(c) === key,
          ),
        );
        for (const q of own.slice(0, perConcept)) {
          if (usedPrompts.has(q.prompt.toLowerCase())) continue;
          usedPrompts.add(q.prompt.toLowerCase());
          picked.push({
            prompt: q.prompt,
            options: q.options,
            correctOptionIndex: q.correctOptionIndex,
            explanation: q.explanation || '',
            concept,
            origin: 'QUIZ',
          });
        }
      }

      questions.push(...picked);
    }

    if (questions.length === 0) {
      throw new BadRequestException('Could not put a practice set together for those concepts.');
    }

    // Shuffled once, here, and stored in that order. Grading then compares
    // against what the person was actually shown.
    const shuffledQuestions = questions.slice(0, target).map((q) => this.shuffleOptions(q));

    // One open set at a time, so an abandoned practice does not pile up behind
    // the next one.
    await this.practiceModel.updateMany(
      { organizationId: orgId, employeeId, quizId, status: 'OPEN' },
      { $set: { status: 'COMPLETED', completedAt: new Date() } },
    );

    const set = await this.practiceModel.create({
      organizationId: orgId,
      employeeId,
      quizId,
      quizTitle: quiz.title,
      concepts: weak,
      questions: shuffledQuestions,
      status: 'OPEN',
    });

    return this.practiceForPlay(set);
  }

  private shuffleOptions(q: PracticeSet['questions'][number]): PracticeSet['questions'][number] {
    const order = q.options.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return {
      ...q,
      options: order.map((i) => q.options[i]),
      correctOptionIndex: order.indexOf(q.correctOptionIndex),
    };
  }

  private async aiPracticeQuestions(
    orgId: string,
    quiz: Quiz,
    concept: string,
    count: number,
    avoid: string[],
  ): Promise<{ prompt: string; options: string[]; correctOptionIndex: number; explanation: string }[]> {
    if (count <= 0) return [];

    const systemPrompt = `You write practice questions for one employee who just got "${concept}" wrong.

Respond ONLY with raw JSON:
{ "questions": [ { "prompt": "...", "options": ["four options"], "correctOptionIndex": 0, "explanation": "why" } ] }

Exactly ${count} question${count === 1 ? '' : 's'}, all on ${concept}. Four options each. Approach the concept from a different angle than a plain recall question — if they could not recall it, asking again the same way teaches nothing.${this.localeInstruction(quiz.locale)}`;

    const userPrompt = `Quiz context: "${quiz.title}" (${quiz.category}, ${quiz.difficulty}).
Concept: ${concept}

Do not repeat any of these existing questions:
${avoid.slice(0, 20).map((p) => `- ${p}`).join('\n') || '(none)'}`;

    try {
      const out = await this.aiService.generateJson<{
        questions?: { prompt?: string; options?: string[]; correctOptionIndex?: number; explanation?: string }[];
      }>(userPrompt, systemPrompt, { organizationId: orgId });

      return (out?.questions || [])
        .filter((q) => q?.prompt && Array.isArray(q.options) && q.options.length >= 2)
        .map((q) => {
          const options = q.options!.map((o) => String(o).trim());
          const index =
            typeof q.correctOptionIndex === 'number' &&
            q.correctOptionIndex >= 0 &&
            q.correctOptionIndex < options.length
              ? q.correctOptionIndex
              : 0;
          return {
            prompt: String(q.prompt).trim(),
            options,
            correctOptionIndex: index,
            explanation: String(q.explanation || '').trim(),
          };
        })
        .slice(0, count);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(null, `AI practice questions unavailable for "${concept}": ${message}`);
      return [];
    }
  }

  /** The player's view: no answer keys. */
  private practiceForPlay(set: PracticeSetDocument | PracticeSet) {
    return {
      practiceId: (set as PracticeSetDocument)._id,
      quizId: set.quizId,
      quizTitle: set.quizTitle,
      concepts: set.concepts,
      status: set.status,
      questions: set.questions.map((q, index) => ({
        index,
        prompt: q.prompt,
        options: q.options,
        concept: q.concept,
        origin: q.origin,
      })),
    };
  }

  async getPractice(orgId: string, employeeId: string, practiceId: string) {
    const set = await this.practiceModel.findOne({
      _id: practiceId,
      organizationId: orgId,
      employeeId,
    });
    if (!set) throw new NotFoundException('Practice set not found.');
    if (set.status === 'COMPLETED') {
      throw new BadRequestException('That practice set has already been completed.');
    }
    return this.practiceForPlay(set);
  }

  // --- Step 5: mastery moves ------------------------------------------------

  /**
   * Grades a practice set and reports what moved.
   *
   * The return value is built around the before-and-after, not the score: the
   * question a person has after practice is "am I better at this yet", and a
   * bare percentage does not answer it.
   */
  async submitPractice(
    orgId: string,
    employeeId: string,
    practiceId: string,
    answers: { questionIndex: number; selectedOptionIndex: number }[],
  ) {
    const set = await this.practiceModel.findOne({
      _id: practiceId,
      organizationId: orgId,
      employeeId,
    });
    if (!set) throw new NotFoundException('Practice set not found.');
    if (set.status === 'COMPLETED') {
      throw new BadRequestException('That practice set has already been submitted.');
    }

    const graded = set.questions.map((q, index) => {
      const submitted = answers.find((a) => a.questionIndex === index);
      const selected = submitted?.selectedOptionIndex ?? -1;
      return {
        questionIndex: index,
        prompt: q.prompt,
        options: q.options,
        concept: q.concept,
        selectedOptionIndex: selected,
        correctOptionIndex: q.correctOptionIndex,
        isCorrect: selected === q.correctOptionIndex,
        explanation: q.explanation,
      };
    });

    const correctCount = graded.filter((g) => g.isCorrect).length;
    const scorePct = graded.length > 0 ? Math.round((correctCount / graded.length) * 100) : 0;

    set.status = 'COMPLETED';
    set.scorePct = scorePct;
    set.completedAt = new Date();
    await set.save();

    const loop = await this.loopModel.findOne({
      organizationId: orgId,
      employeeId,
      quizId: set.quizId,
    });
    if (!loop) throw new NotFoundException('The loop this practice belongs to is gone.');

    const before = new Map(
      this.conceptViews(loop).map((c) => [conceptKey(c.concept), c.masteryPct]),
    );

    this.fold(
      loop,
      graded.map((g) => ({ concepts: [g.concept], isCorrect: g.isCorrect })),
      'PRACTICE',
    );

    loop.practiceCount = (loop.practiceCount || 0) + 1;
    loop.lastPracticedAt = new Date();

    // A concept that is now solid stops being called weak. This is the only
    // thing that closes the loop; without it the same warning would follow the
    // person around after they had fixed it.
    const stillWeak = (loop.weakConcepts || []).filter((concept) => {
      const row = loop.concepts.find((c) => c.conceptKey === conceptKey(concept));
      if (!row) return false;
      const pct = masteryPct({ seen: row.seen, correct: row.correct });
      return masteryBand(pct, row.seen) === 'FRAGILE' || masteryBand(pct, row.seen) === 'DEVELOPING';
    });
    loop.weakConcepts = stillWeak;

    loop.markModified('concepts');
    await loop.save();

    const after = this.conceptViews(loop);
    const movement = after
      .filter((c) => set.concepts.some((x) => conceptKey(x) === conceptKey(c.concept)))
      .map((c) => ({
        concept: c.concept,
        beforePct: before.get(conceptKey(c.concept)) ?? 0,
        afterPct: c.masteryPct,
        band: c.band,
        trend: c.trend,
        resolved: !loop.weakConcepts.some((w) => conceptKey(w) === conceptKey(c.concept)),
      }));

    return {
      practiceId: set._id,
      scorePct,
      correctCount,
      total: graded.length,
      answers: graded,
      movement,
      remainingWeakConcepts: loop.weakConcepts,
      loop: this.toView(loop, null),
    };
  }
}

/** Escapes a concept name so it can be matched literally in a tag regex. */
function escapeRegex(value: string): string {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
