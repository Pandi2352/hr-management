import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AiService } from '../ai/ai.service';
import { LoggerHelper } from '../../common/logger';
import { CacheHelper, CacheNamespace, CACHE_TTL } from '../../common/cache';
import { Quiz, QuizDocument, QUIZ_LOCALE_LABELS, type QuizLocale } from './schemas/quiz.schema';
import {
  QuizGenerationJob,
  QuizGenerationJobDocument,
  TERMINAL_JOB_STATUSES,
} from './schemas/quiz-generation-job.schema';
import { reconcileCategory } from './quiz-category.util';
import {
  questionDefect,
  questionType,
  TRUE_FALSE_OPTIONS,
  type QuestionType,
} from './question-grading.util';

/**
 * How many questions are asked for in one call to the model.
 *
 * Small enough that progress moves visibly and a single bad response costs one
 * batch rather than the whole job; large enough that a 50-question quiz is not
 * fifty round trips.
 *
 * Three rather than five because a batch of five with options, explanations and
 * tags runs past the token limit of a smaller model, and the response arrives
 * cut off mid-array. Salvage recovers what completed, but a batch that fits is
 * better than one that has to be rescued.
 */
const BATCH_SIZE = 3;

/** The ceiling on one job. Beyond this it is a course, not a quiz. */
export const MAX_BACKGROUND_QUESTIONS = 100;

/** How many consecutive empty batches before the job gives up. */
const MAX_EMPTY_BATCHES = 3;

/**
 * How long a job may go without advancing before it is presumed dead.
 *
 * The work runs in the API process, so a restart or a crash leaves a job stuck
 * in RUNNING with nothing driving it. Without this, that job blocks its owner
 * from ever starting another one — and the block is invisible, because the
 * notification the watcher shows is for a job that will never move again.
 *
 * Comfortably longer than the slowest batch, so a job that is merely slow is
 * never mistaken for a dead one.
 */
const STALE_AFTER_MS = 5 * 60 * 1000;

interface GeneratedQuestion {
  type: QuestionType;
  prompt: string;
  options: string[];
  correctOptionIndex: number;
  correctOptionIndexes: number[];
  acceptedAnswers: string[];
  explanation: string;
  points: number;
  tags: string[];
}

export interface JobView {
  jobId: string;
  status: string;
  topic: string;
  questionsDone: number;
  questionsTotal: number;
  quizId: string;
  quizTitle: string;
  error: string;
  startedAt: Date | null;
  finishedAt: Date | null;
}

/**
 * Writing a quiz in the background.
 *
 * The studio used to hold the request open for the whole generation, so asking
 * for fifty questions meant staring at a spinner for several minutes and losing
 * everything if you navigated away. Here the request returns a job id
 * immediately and the work continues in the process, batch by batch, recording
 * how far it has got after each one.
 *
 * Deliberately not a queue worker. This runs in the API process because the
 * deployment is a single instance and adding a broker to reach the same outcome
 * would be infrastructure nobody asked for. The seam is the job document: if a
 * second instance ever appears, `run()` moves behind a real queue and nothing
 * else in the module changes.
 */
@Injectable()
export class QuizGenerationService {
  private readonly logger = LoggerHelper.Instance.child(QuizGenerationService.name);

  /** Jobs cancelled mid-flight, so the running loop can stop at its next batch. */
  private readonly cancelled = new Set<string>();

  constructor(
    @InjectModel(QuizGenerationJob.name)
    private readonly jobModel: Model<QuizGenerationJobDocument>,
    @InjectModel(Quiz.name) private readonly quizModel: Model<QuizDocument>,
    private readonly aiService: AiService,
  ) {}

  // --- Starting and watching ------------------------------------------------

  async start(
    orgId: string,
    actor: { userId: string; name: string },
    params: {
      topic: string;
      questionCount: number;
      category?: string;
      difficulty?: string;
      locale?: string;
      templateId?: string;
      durationMinutes?: number;
      refinedPrompt?: string;
      title?: string;
      description?: string;
    },
  ): Promise<JobView> {
    const total = Number(params.questionCount) || 5;
    if (total < 1 || total > MAX_BACKGROUND_QUESTIONS) {
      throw new BadRequestException(
        `Ask for between 1 and ${MAX_BACKGROUND_QUESTIONS} questions.`,
      );
    }

    await this.failStaleJobs(orgId, actor.userId);

    /*
     * One job at a time per person.
     *
     * Two overlapping jobs would produce two drafts from one intention and two
     * progress notifications fighting over the same corner of the screen.
     */
    const running = await this.jobModel.findOne({
      organizationId: orgId,
      requestedByUserId: actor.userId,
      status: { $in: ['QUEUED', 'RUNNING'] },
    });
    if (running) {
      throw new BadRequestException(
        'You already have a quiz being written. Wait for it to finish or cancel it first.',
      );
    }

    const job = await this.jobModel.create({
      organizationId: orgId,
      requestedByUserId: actor.userId,
      requestedByName: actor.name,
      status: 'QUEUED',
      topic: params.topic,
      params,
      questionsTotal: total,
    });

    // Not awaited: the caller gets its job id now and polls for the rest.
    void this.run(job._id).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(null, `Quiz generation job ${job._id} crashed: ${message}`);
    });

    return this.toView(job);
  }

  /**
   * The jobs this person should be told about.
   *
   * Includes ones that finished in the last few minutes, so somebody who was on
   * another page when their quiz completed still sees that it did rather than
   * discovering a draft they do not remember asking for.
   */
  async listMine(orgId: string, userId: string): Promise<JobView[]> {
    await this.failStaleJobs(orgId, userId);

    const since = new Date(Date.now() - 10 * 60 * 1000);

    const jobs = await this.jobModel
      .find({
        organizationId: orgId,
        requestedByUserId: userId,
        $or: [{ status: { $in: ['QUEUED', 'RUNNING'] } }, { finishedAt: { $gte: since } }],
      })
      .sort({ createdAt: -1 })
      .limit(10);

    return Promise.all(jobs.map((j) => this.viewWithLiveProgress(j)));
  }

  async get(orgId: string, userId: string, jobId: string): Promise<JobView> {
    const job = await this.jobModel.findOne({ _id: jobId, organizationId: orgId });
    if (!job) throw new NotFoundException('That generation job does not exist.');
    if (job.requestedByUserId !== userId) {
      throw new NotFoundException('That generation job does not exist.');
    }
    return this.viewWithLiveProgress(job);
  }

  /**
   * Stops a running job at its next batch boundary.
   *
   * Whatever has already been written is kept on the job rather than thrown
   * away: somebody who cancels at question forty usually wants the forty.
   */
  async cancel(orgId: string, userId: string, jobId: string): Promise<JobView> {
    const job = await this.jobModel.findOne({ _id: jobId, organizationId: orgId });
    if (!job) throw new NotFoundException('That generation job does not exist.');
    if (job.requestedByUserId !== userId) {
      throw new NotFoundException('That generation job does not exist.');
    }
    if (TERMINAL_JOB_STATUSES.includes(job.status)) return this.toView(job);

    this.cancelled.add(jobId);
    job.status = 'CANCELLED';
    job.finishedAt = new Date();
    await job.save();
    await this.writeProgressCache(job);

    return this.toView(job);
  }

  /**
   * Closes jobs that stopped moving because the process behind them went away.
   *
   * Checked when a job is started or listed rather than on a timer: those are
   * exactly the moments somebody is waiting on the answer, and it needs no
   * scheduler to be correct.
   */
  private async failStaleJobs(orgId: string, userId: string): Promise<void> {
    const cutoff = new Date(Date.now() - STALE_AFTER_MS);

    const result = await this.jobModel.updateMany(
      {
        organizationId: orgId,
        requestedByUserId: userId,
        status: { $in: ['QUEUED', 'RUNNING'] },
        updatedAt: { $lt: cutoff },
      },
      {
        $set: {
          status: 'FAILED',
          error: 'Generation stopped unexpectedly, most likely a server restart. Start it again.',
          finishedAt: new Date(),
        },
      },
    );

    if (result.modifiedCount > 0) {
      this.logger.warn(
        null,
        `Closed ${result.modifiedCount} stale quiz generation job(s) for user ${userId}`,
      );
    }
  }

  // --- The work -------------------------------------------------------------

  private async run(jobId: string): Promise<void> {
    const job = await this.jobModel.findById(jobId);
    if (!job) return;

    job.status = 'RUNNING';
    job.startedAt = new Date();
    await job.save();
    await this.writeProgressCache(job);

    const existingCategories = await this.categoriesInUse(job.organizationId);
    const questions: GeneratedQuestion[] = [];
    let emptyBatches = 0;

    try {
      while (questions.length < job.questionsTotal) {
        if (this.cancelled.has(jobId)) break;

        // Re-read the status rather than trusting the in-memory set: a cancel
        // from another process would not have touched it.
        const current = await this.jobModel.findById(jobId).select('status').lean();
        if (!current || current.status === 'CANCELLED') break;

        const want = Math.min(BATCH_SIZE, job.questionsTotal - questions.length);
        const batch = await this.generateBatch(
          job.organizationId,
          job.params as any,
          want,
          questions.map((q) => q.prompt),
          existingCategories,
        );

        if (batch.length === 0) {
          emptyBatches += 1;
          if (emptyBatches >= MAX_EMPTY_BATCHES) {
            throw new Error(
              'The AI provider stopped returning usable questions. Check the provider settings and try again.',
            );
          }
          continue;
        }

        emptyBatches = 0;
        questions.push(...batch);

        job.questions = questions as any;
        job.questionsDone = questions.length;
        await job.save();
        await this.writeProgressCache(job);
      }

      if (this.cancelled.has(jobId)) {
        this.cancelled.delete(jobId);
        return;
      }

      if (questions.length === 0) {
        throw new Error('No questions could be generated for that topic.');
      }

      const quiz = await this.saveDraft(job, questions, existingCategories);

      job.status = 'COMPLETED';
      job.quizId = String(quiz._id);
      job.quizTitle = quiz.title;
      job.questionsDone = questions.length;
      job.finishedAt = new Date();
      await job.save();
      await this.writeProgressCache(job);

      this.logger.info(
        null,
        `Quiz generation job ${jobId} produced ${questions.length} questions`,
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      job.status = 'FAILED';
      job.error = message.slice(0, 300);
      job.finishedAt = new Date();
      await job.save();
      await this.writeProgressCache(job);
      this.logger.warn(null, `Quiz generation job ${jobId} failed: ${message}`);
    } finally {
      this.cancelled.delete(jobId);
    }
  }

  /** One batch of questions, told what already exists so it does not repeat it. */
  private async generateBatch(
    orgId: string,
    params: {
      topic: string;
      difficulty?: string;
      category?: string;
      locale?: string;
      refinedPrompt?: string;
    },
    count: number,
    existingPrompts: string[],
    existingCategories: string[],
  ): Promise<GeneratedQuestion[]> {
    const difficulty = params.difficulty || 'INTERMEDIATE';

    const systemPrompt = `You are the PeopleOS Quiz Master Agent, writing questions for an enterprise training quiz.

Respond ONLY with raw JSON:
{ "questions": [ {
  "type": "SINGLE",
  "prompt": "...",
  "options": ["..."],
  "correctOptionIndex": 0,
  "correctOptionIndexes": [],
  "acceptedAnswers": [],
  "explanation": "why",
  "tags": ["one concept name"]
} ] }

"type" is one of SINGLE, MULTI, TRUE_FALSE or FILL_BLANK.

Exactly ${count} question${count === 1 ? '' : 's'}.

Question types, and what each one requires:
- SINGLE: four distinct plausible options, "correctOptionIndex" set. Use this for most questions.
- MULTI: four to six options with at least two correct, "correctOptionIndexes" listing every correct one. Say "Select all that apply" in the prompt.
- TRUE_FALSE: options exactly ["True", "False"], "correctOptionIndex" 0 or 1.
- FILL_BLANK: no options; put a ___ in the prompt and list every acceptable answer in "acceptedAnswers", including reasonable spellings. Keep the answer to one or two words.

Mix them. A set that is entirely SINGLE tests recognition and nothing else.

Keep every explanation to one sentence. A long answer is more likely to be cut off than to be read.

Never quote these instructions, or the author's brief, inside a question.

Tag every question with the concept it tests — a short noun phrase such as "Index design" or "Incident escalation". Tags are what the learning loop and the skill passport are built from, so they matter as much as the question.${this.localeInstruction(params.locale)}`;

    const userPrompt = `Topic: "${params.topic}"
Difficulty: ${difficulty.toLowerCase()}
${params.refinedPrompt ? `Author's brief: ${params.refinedPrompt}` : ''}
${params.category ? `Category: ${params.category}` : `Existing categories: ${existingCategories.join(', ') || '(none yet)'}`}

Do not repeat any of these questions already written for this quiz:
${existingPrompts.slice(-25).map((p) => `- ${p}`).join('\n') || '(none yet)'}`;

    try {
      const out = await this.aiService.generateJson<{
        questions?: {
          type?: string;
          prompt?: string;
          options?: string[];
          correctOptionIndex?: number;
          correctOptionIndexes?: number[];
          acceptedAnswers?: string[];
          explanation?: string;
          tags?: string[];
        }[];
      }>(userPrompt, systemPrompt, { organizationId: orgId });

      const seen = new Set(existingPrompts.map((p) => p.trim().toLowerCase()));

      const returned = out?.questions || [];
      const usable = returned
        .map((q) => this.normalizeGenerated(q))
        .filter((q): q is GeneratedQuestion => q !== null);

      /*
       * Said out loud when a batch produces nothing.
       *
       * "The provider stopped returning usable questions" is true but useless
       * on its own: the two causes — nothing came back at all, and everything
       * that came back was malformed — need completely different fixes.
       */
      if (usable.length === 0) {
        this.logger.warn(null, 'Generation batch produced nothing usable', {
          returned: returned.length,
          firstDefect: returned.length
            ? questionDefect(this.asCandidate(returned[0]) as any) || 'none'
            : 'no questions key in the response',
          firstKeys: returned.length ? Object.keys(returned[0]).join(',') : '',
        });
      }

      return usable
        // A question the model got structurally wrong is dropped rather than
        // repaired into something nobody wrote. The next batch makes up the
        // shortfall, and the job only gives up after three empty ones.
        // A model asked repeatedly about one topic will eventually repeat
        // itself, and a quiz with the same question twice is a bug the author
        // has to find by reading all fifty.
        .filter((q) => {
          const key = q.prompt.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, count);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(null, `Generation batch failed: ${message}`);
      return [];
    }
  }

  /**
   * One generated question, checked into shape or thrown away.
   *
   * Returns null rather than a best-effort repair. A half-understood question
   * that is quietly fixed up reaches an employee looking exactly like one that
   * was written properly, and nobody finds out until they sit it.
   */
  /** The raw question shaped into a candidate, before it is judged. */
  private asCandidate(raw: any): GeneratedQuestion {
    const type = questionType({ type: raw?.type });
    const options = (raw?.options || []).map((o: any) => String(o).trim()).filter(Boolean);

    return {
      type,
      prompt: String(raw?.prompt || '').trim(),
      options: type === 'TRUE_FALSE' ? TRUE_FALSE_OPTIONS : options,
      correctOptionIndex:
        typeof raw?.correctOptionIndex === 'number' ? raw.correctOptionIndex : -1,
      correctOptionIndexes: (raw?.correctOptionIndexes || []).filter((i: any) =>
        Number.isInteger(i),
      ),
      acceptedAnswers: (raw?.acceptedAnswers || []).map((a: any) => String(a).trim()).filter(Boolean),
      explanation: String(raw?.explanation || '').trim(),
      points: 10,
      tags: (raw?.tags || []).map((t: any) => String(t).trim()).filter(Boolean).slice(0, 3),
    };
  }

  private normalizeGenerated(raw: {
    type?: string;
    prompt?: string;
    options?: string[];
    correctOptionIndex?: number;
    correctOptionIndexes?: number[];
    acceptedAnswers?: string[];
    explanation?: string;
    tags?: string[];
  }): GeneratedQuestion | null {
    const candidate = this.asCandidate(raw);
    if (!candidate.prompt) return null;

    // The same check the review gate applies, run here so a malformed question
    // never reaches the draft in the first place.
    return questionDefect(candidate as any) ? null : candidate;
  }

  /** Saves the finished set as a draft, which is where review begins. */
  private async saveDraft(
    job: QuizGenerationJobDocument,
    questions: GeneratedQuestion[],
    existingCategories: string[],
  ): Promise<QuizDocument> {
    const params = job.params as any;
    const category = reconcileCategory(params.category || 'General', existingCategories);

    return this.quizModel.create({
      organizationId: job.organizationId,
      title: params.title || `${job.topic} Assessment`,
      description: params.description || `Assessment on ${job.topic}`,
      category,
      difficulty: params.difficulty || 'INTERMEDIATE',
      timeLimitMinutes: Number(params.durationMinutes) > 0
        ? Number(params.durationMinutes)
        : Math.max(5, questions.length * 2),
      passingScorePct: 70,
      xpReward: questions.length * 20,
      locale: params.locale || 'en',
      templateId: params.templateId || '',
      questions: questions.map((q) => ({ ...q, isApproved: false })),
      isAiGenerated: true,
      // Always a draft. Generation produces a candidate, and review is what
      // turns a candidate into something people are asked to sit.
      status: 'DRAFT',
      createdBy: job.requestedByUserId,
      createdByName: job.requestedByName,
    });
  }

  // --- Plumbing -------------------------------------------------------------

  private localeInstruction(locale: QuizLocale | string | undefined): string {
    const code = (locale || 'en') as QuizLocale;
    if (code === 'en') return '';
    const label = QUIZ_LOCALE_LABELS[code] || code;
    return `\nWrite every question, option, explanation and tag in ${label}, using that language's own script.`;
  }

  private async categoriesInUse(orgId: string): Promise<string[]> {
    const rows = await this.quizModel.find({ organizationId: orgId }).select('category').lean();
    return Array.from(new Set(rows.map((r: any) => r.category).filter(Boolean)));
  }

  private toView(job: QuizGenerationJob): JobView {
    return {
      jobId: (job as QuizGenerationJobDocument)._id,
      status: job.status,
      topic: job.topic,
      questionsDone: job.questionsDone,
      questionsTotal: job.questionsTotal,
      quizId: job.quizId,
      quizTitle: job.quizTitle,
      error: job.error,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
    };
  }

  /**
   * The view, preferring the cached counter.
   *
   * The document is read either way — the cache saves nothing on this path and
   * is not pretended to. What it does is make the counter correct when a batch
   * has advanced between the document being loaded and the response being
   * built, which at a two-second poll against a batch that lands every few
   * seconds is often enough to be visible as a stalled number.
   */
  private async viewWithLiveProgress(job: QuizGenerationJobDocument): Promise<JobView> {
    const view = this.toView(job);
    try {
      const cache = await CacheHelper.getInstance();
      const live = await cache.get<{ questionsDone: number; status: string }>(
        CacheNamespace.quizJob(job.organizationId),
        job._id,
      );
      if (live && typeof live.questionsDone === 'number' && live.questionsDone > view.questionsDone) {
        view.questionsDone = live.questionsDone;
      }
    } catch {
      // A cache is an accelerator. The document already answered the question.
    }
    return view;
  }

  private async writeProgressCache(job: QuizGenerationJobDocument): Promise<void> {
    try {
      const cache = await CacheHelper.getInstance();
      await cache.set(
        CacheNamespace.quizJob(job.organizationId),
        job._id,
        {
          questionsDone: job.questionsDone,
          questionsTotal: job.questionsTotal,
          status: job.status,
        },
        CACHE_TTL.QUIZ_JOB,
      );
    } catch {
      // Progress still lives on the document; the poll simply reads that.
    }
  }
}
