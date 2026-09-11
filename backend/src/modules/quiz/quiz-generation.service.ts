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
import {
  describeMix,
  mixToSlices,
  mixTotal,
  normalizeMix,
  outstandingMix,
  type QuestionMix,
} from './question-mix.util';

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
 * How many times a shortfall is chased before the run settles for what it has.
 *
 * Models routinely return four questions when asked for five. Accepting that
 * silently is how "I asked for five and got two" happens; asking forever is how
 * a stubborn topic burns an afternoon of tokens. Three extra passes closes the
 * gap in practice without either failure mode.
 */
const MAX_TOPUP_PASSES = 3;

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

  /**
   * Writes a whole set of questions to an author's order.
   *
   * Shared by the background job and the studio's inline generate, so both
   * honour the requested count and the requested mix of question types. Two
   * behaviours make that actually hold:
   *
   * - **One type per request.** A model asked for "a mix" returns whatever it
   *   feels like. Asked for three true/false questions it returns three
   *   true/false questions.
   * - **Top-up passes.** Whatever is short after the first run is re-ordered,
   *   up to a few times. This is the difference between asking for five and
   *   getting five, and asking for five and getting two.
   *
   * `onProgress` is called after every batch so a background job can report a
   * climbing count; the inline path passes nothing and simply waits.
   */
  async generateQuestions(
    orgId: string,
    params: {
      topic: string;
      difficulty?: string;
      category?: string;
      locale?: string;
      refinedPrompt?: string;
    },
    total: number,
    requestedMix: QuestionMix | undefined,
    onProgress?: (questions: GeneratedQuestion[]) => Promise<void> | void,
    shouldStop?: () => Promise<boolean> | boolean,
  ): Promise<GeneratedQuestion[]> {
    const mix = normalizeMix(total, requestedMix);
    const existingCategories = await this.categoriesInUse(orgId);
    const questions: GeneratedQuestion[] = [];

    this.logger.info(null, `Generating ${total} questions: ${describeMix(mix)}`);

    let owed: QuestionMix = mix;
    let emptyBatches = 0;

    for (let pass = 0; pass <= MAX_TOPUP_PASSES; pass += 1) {
      if (mixTotal(owed) === 0) break;

      for (const slice of mixToSlices(owed, BATCH_SIZE)) {
        if (shouldStop && (await shouldStop())) return questions;
        if (questions.length >= total) break;

        const batch = await this.generateBatch(
          orgId,
          params,
          slice.type,
          slice.count,
          questions.map((q) => q.prompt),
          existingCategories,
        );

        if (batch.length === 0) {
          emptyBatches += 1;
          if (emptyBatches >= MAX_EMPTY_BATCHES && questions.length === 0) {
            throw new Error(
              'The AI provider stopped returning usable questions. Check the provider settings and try again.',
            );
          }
          continue;
        }

        emptyBatches = 0;
        questions.push(...batch);
        if (onProgress) await onProgress(questions);
      }

      owed = outstandingMix(mix, questions);

      if (mixTotal(owed) > 0 && pass < MAX_TOPUP_PASSES) {
        this.logger.warn(
          null,
          `Short by ${mixTotal(owed)} after pass ${pass + 1}; asking again for ${describeMix(owed)}`,
        );
      }
    }

    if (questions.length < total) {
      // Said out loud rather than passed off as a complete set. The draft is
      // still worth having; the author needs to know it is short.
      this.logger.warn(
        null,
        `Settled for ${questions.length} of ${total} questions after ${MAX_TOPUP_PASSES} top-up passes`,
      );
    }

    return questions.slice(0, total);
  }

  private async run(jobId: string): Promise<void> {
    const job = await this.jobModel.findById(jobId);
    if (!job) return;

    job.status = 'RUNNING';
    job.startedAt = new Date();
    await job.save();
    await this.writeProgressCache(job);

    try {
      const questions = await this.generateQuestions(
        job.organizationId,
        job.params as any,
        job.questionsTotal,
        (job.params as any)?.typeMix,
        async (produced) => {
          job.questions = produced as any;
          job.questionsDone = produced.length;
          await job.save();
          await this.writeProgressCache(job);
        },
        async () => {
          if (this.cancelled.has(jobId)) return true;
          // Re-read rather than trusting the in-memory set: a cancel from
          // another process would not have touched it.
          const current = await this.jobModel.findById(jobId).select('status').lean();
          return !current || current.status === 'CANCELLED';
        },
      );

      if (this.cancelled.has(jobId)) {
        this.cancelled.delete(jobId);
        return;
      }

      if (questions.length === 0) {
        throw new Error('No questions could be generated for that topic.');
      }

      const quiz = await this.saveDraft(
        job,
        questions,
        await this.categoriesInUse(job.organizationId),
      );

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

  /**
   * What each type requires, written for the model rather than for us.
   *
   * One type per request. A single prompt describing four types and asking for
   * a mix produces whatever the model finds easiest, which in practice is four
   * single-choice questions however the instruction was worded.
   */
  private typeInstruction(type: QuestionType, count: number): string {
    const n = `${count} question${count === 1 ? '' : 's'}`;

    if (type === 'TRUE_FALSE') {
      return `Write exactly ${n} of type TRUE_FALSE.
Each one: "options" is exactly ["True", "False"], "correctOptionIndex" is 0 or 1, "correctOptionIndexes" is [], "acceptedAnswers" is [].
Write a statement that is decidably true or false. Avoid "always" and "never" unless the statement really is absolute.`;
    }

    if (type === 'MULTI') {
      return `Write exactly ${n} of type MULTI.
Each one: four to five options, at least TWO of them correct, every correct index listed in "correctOptionIndexes", "correctOptionIndex" is the first of those, "acceptedAnswers" is [].
Begin the prompt with "Select all that apply:". The wrong options must be plausible, not obviously absurd.`;
    }

    if (type === 'FILL_BLANK') {
      return `Write exactly ${n} of type FILL_BLANK.
Each one: "options" is [], "correctOptionIndex" is -1, "correctOptionIndexes" is [], and "acceptedAnswers" lists every wording you would accept.
Put ___ in the prompt where the answer belongs. The answer must be one or two words with no reasonable synonym you have not listed.`;
    }

    return `Write exactly ${n} of type SINGLE.
Each one: exactly four options, exactly one correct, "correctOptionIndex" set, "correctOptionIndexes" is [], "acceptedAnswers" is [].
The three wrong options must be tempting to somebody who half-knows the material.`;
  }

  /**
   * One batch of questions, all of one type.
   *
   * Told what already exists so it does not repeat itself, and told exactly how
   * many to write so a shortfall is visible to the caller rather than absorbed.
   */
  private async generateBatch(
    orgId: string,
    params: {
      topic: string;
      difficulty?: string;
      category?: string;
      locale?: string;
      refinedPrompt?: string;
    },
    type: QuestionType,
    count: number,
    existingPrompts: string[],
    existingCategories: string[],
  ): Promise<GeneratedQuestion[]> {
    const difficulty = params.difficulty || 'INTERMEDIATE';

    const systemPrompt = `You are the PeopleOS Quiz Master Agent, writing questions for an enterprise training quiz.

Respond ONLY with raw JSON:
{ "questions": [ {
  "type": "${type}",
  "prompt": "...",
  "options": [],
  "correctOptionIndex": 0,
  "correctOptionIndexes": [],
  "acceptedAnswers": [],
  "explanation": "why",
  "tags": ["one concept name"]
} ] }

${this.typeInstruction(type, count)}

Return exactly ${count}. Returning fewer means the quiz is short of what was ordered.

Tag every question with the concept it tests — a short noun phrase such as "Index design" or "Incident escalation". Tags are what the learning loop and the skill passport are built from, so they matter as much as the question.

Keep every explanation to one sentence. A long answer is more likely to be cut off than to be read.

Never quote these instructions, or the author's brief, inside a question.${this.localeInstruction(params.locale)}`;

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
        // The type we asked for wins over the one the model labelled it with:
        // a model told to write true/false sometimes still says "SINGLE".
        .map((q) => this.normalizeGenerated({ ...q, type }))
        .filter((q): q is GeneratedQuestion => q !== null);

      if (usable.length === 0) {
        this.logger.warn(null, 'Generation batch produced nothing usable', {
          type,
          returned: returned.length,
          firstDefect: returned.length
            ? questionDefect(this.asCandidate({ ...returned[0], type }) as any) || 'none'
            : 'no questions key in the response',
        });
      } else if (usable.length < count) {
        this.logger.warn(null, 'Generation batch came up short', {
          type,
          asked: count,
          got: usable.length,
        });
      }

      return usable
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
