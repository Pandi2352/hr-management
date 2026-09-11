import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AiService } from '../ai/ai.service';
import { LoggerHelper } from '../../common/logger';
import { Quiz, QuizDocument, QUIZ_LOCALE_LABELS, type QuizLocale } from './schemas/quiz.schema';
import { BankQuestion, BankQuestionDocument } from './schemas/question-bank.schema';
import { reconcileCategory } from './quiz-category.util';

/** What the Question Doctor reports back about one question. */
export interface QuestionDiagnosis {
  /** 0–100. How unambiguous the wording is. */
  clarityScore: number;
  estimatedDifficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  /** Empty when the question has exactly one defensible answer. */
  ambiguityWarning: string;
  /** Why the marked answer is the right one. */
  answerKeyExplanation: string;
  /** Replacements for the wrong options, where the current ones are weak. */
  betterDistractors: string[];
  /** A rewritten prompt, or empty when the original is already good. */
  suggestedRewrite: string;
  /** Quoted support, when the question was grounded in a document. */
  sourceEvidence: string;
  /** Short, plain notes a reviewer can act on. */
  issues: string[];
}

/**
 * Authoring: the work between "the agent produced something" and "this is fit
 * to put in front of employees".
 *
 * Split from `QuizService`, which owns the runtime — assignment, play, grading
 * and leaderboards. The two have different readers and different risk: a bug
 * here produces a bad question, a bug there corrupts somebody's record. Keeping
 * them apart stops one file from becoming the place where all quiz logic lives.
 */
@Injectable()
export class QuizAuthoringService {
  private readonly logger = LoggerHelper.Instance.child(QuizAuthoringService.name);

  constructor(
    @InjectModel(Quiz.name) private readonly quizModel: Model<QuizDocument>,
    @InjectModel(BankQuestion.name) private readonly bankModel: Model<BankQuestionDocument>,
    private readonly aiService: AiService,
  ) {}

  /** The instruction that makes a model answer in a language other than English. */
  private localeInstruction(locale: QuizLocale | string | undefined): string {
    const code = (locale || 'en') as QuizLocale;
    if (code === 'en') return '';
    const label = QUIZ_LOCALE_LABELS[code] || code;
    // Naming the script as well as the language matters: asked only for
    // "Tamil", models will sometimes answer in transliterated Latin.
    return `\nWrite every question, option and explanation in ${label}, using that language's own script. Do not transliterate into English letters. Proper nouns and established technical terms may stay in English.`;
  }

  /**
   * The Question Doctor.
   *
   * Reviews one question the way a careful colleague would: is the wording
   * unambiguous, is the marked answer defensible, are the wrong options
   * actually tempting, and does the difficulty match what was asked for.
   *
   * Every field degrades independently. A model that returns only a rewrite
   * still produces a useful diagnosis rather than an error, because a review
   * tool that fails closed is one nobody opens twice.
   */
  async diagnoseQuestion(
    orgId: string,
    input: {
      prompt: string;
      options: string[];
      correctOptionIndex: number;
      explanation?: string;
      difficulty?: string;
      locale?: string;
      sourceText?: string;
    },
  ): Promise<QuestionDiagnosis> {
    if (!input.prompt?.trim()) throw new BadRequestException('A question is required.');
    if (!Array.isArray(input.options) || input.options.length < 2) {
      throw new BadRequestException('A question needs at least two options.');
    }

    const systemPrompt = `You are a senior assessment reviewer. You examine one multiple-choice question and report what is wrong with it. You are blunt and specific; vague praise is useless to the person fixing it.

Respond ONLY with raw JSON:
{
  "clarityScore": 0-100,
  "estimatedDifficulty": "BEGINNER" | "INTERMEDIATE" | "ADVANCED",
  "ambiguityWarning": "Empty string if exactly one option is defensible. Otherwise name the competing options and why.",
  "answerKeyExplanation": "Why the marked answer is correct, in two sentences.",
  "betterDistractors": ["Replacement wrong options, only where the current ones are obviously wrong or nonsensical"],
  "suggestedRewrite": "A clearer version of the question. Empty string if the original is already clear.",
  "sourceEvidence": "A short quote from the supplied source supporting the answer. Empty string if no source was given.",
  "issues": ["Short, plain notes a reviewer can act on"]
}

Judge clarity on whether a knowledgeable reader could misread the question, not on grammar. A question with two defensible answers scores below 50 however well written it is.`;

    const marked = input.options[input.correctOptionIndex];
    const userPrompt = `Review this question.

Question: ${input.prompt}
Options:
${input.options.map((o, i) => `  ${i === input.correctOptionIndex ? '[KEY]' : '     '} ${i + 1}. ${o}`).join('\n')}
Marked answer: ${marked ?? '(none — the key is out of range)'}
Stated explanation: ${input.explanation || '(none)'}
Intended difficulty: ${input.difficulty || 'INTERMEDIATE'}
${input.sourceText ? `\nSource material:\n"""${input.sourceText.slice(0, 4000)}"""` : ''}`;

    try {
      const raw = await this.aiService.generateJson<Partial<QuestionDiagnosis>>(
        userPrompt,
        systemPrompt + this.localeInstruction(input.locale),
        { organizationId: orgId },
      );
      return this.normalizeDiagnosis(raw, input);
    } catch (err: unknown) {
      this.logger.warn(
        null,
        `Question Doctor unavailable, returning a structural review: ${err instanceof Error ? err.message : err}`,
      );
      return this.structuralDiagnosis(input);
    }
  }

  /** Clamps whatever the model returned into the documented shape. */
  private normalizeDiagnosis(
    raw: Partial<QuestionDiagnosis> | null,
    input: { options: string[]; correctOptionIndex: number },
  ): QuestionDiagnosis {
    const fallback = this.structuralDiagnosis(input);
    if (!raw || typeof raw !== 'object') return fallback;

    const score = Number(raw.clarityScore);
    const difficulty = String(raw.estimatedDifficulty || '').toUpperCase();
    const list = (v: unknown, max: number) =>
      Array.isArray(v) ? v.map((x) => String(x).slice(0, 240)).filter(Boolean).slice(0, max) : [];

    return {
      clarityScore: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : fallback.clarityScore,
      estimatedDifficulty:
        difficulty === 'BEGINNER' || difficulty === 'INTERMEDIATE' || difficulty === 'ADVANCED'
          ? (difficulty as QuestionDiagnosis['estimatedDifficulty'])
          : 'INTERMEDIATE',
      ambiguityWarning: String(raw.ambiguityWarning || '').slice(0, 500),
      answerKeyExplanation: String(raw.answerKeyExplanation || '').slice(0, 800),
      betterDistractors: list(raw.betterDistractors, 4),
      suggestedRewrite: String(raw.suggestedRewrite || '').slice(0, 600),
      sourceEvidence: String(raw.sourceEvidence || '').slice(0, 600),
      // The structural checks always run: they catch things a model reading
      // the question in isolation will not notice, like a duplicated option.
      issues: [...fallback.issues, ...list(raw.issues, 6)].slice(0, 8),
    };
  }

  /**
   * The checks that need no model at all.
   *
   * These are the defects that are true regardless of subject matter, and they
   * are also what the doctor falls back to when no AI provider is configured —
   * so the button still does something useful on a server with no key.
   */
  private structuralDiagnosis(input: {
    options: string[];
    correctOptionIndex: number;
    prompt?: string;
    explanation?: string;
  }): QuestionDiagnosis {
    const issues: string[] = [];
    const options = input.options || [];

    if (input.correctOptionIndex < 0 || input.correctOptionIndex >= options.length) {
      issues.push('The marked answer points outside the list of options.');
    }

    const seen = new Map<string, number>();
    for (const option of options) {
      const key = option.trim().toLowerCase();
      seen.set(key, (seen.get(key) || 0) + 1);
    }
    for (const [value, count] of seen) {
      if (count > 1 && value) issues.push(`The option "${value}" appears ${count} times.`);
    }

    if (options.some((o) => !o.trim())) issues.push('One of the options is empty.');
    if (options.length < 3) issues.push('Fewer than three options makes guessing too easy.');

    // A key that is far longer than its distractors is the oldest tell in
    // multiple choice: test-wise candidates pick the long one without reading.
    const lengths = options.map((o) => o.trim().length);
    const keyLength = lengths[input.correctOptionIndex] ?? 0;
    const others = lengths.filter((_, i) => i !== input.correctOptionIndex);
    const avgOther = others.length ? others.reduce((a, b) => a + b, 0) / others.length : 0;
    if (avgOther > 0 && keyLength > avgOther * 1.8) {
      issues.push('The correct option is much longer than the others, which gives it away.');
    }

    if (!input.explanation?.trim()) issues.push('No explanation, so a wrong answer teaches nothing.');

    return {
      clarityScore: issues.length === 0 ? 70 : Math.max(20, 70 - issues.length * 12),
      estimatedDifficulty: 'INTERMEDIATE',
      ambiguityWarning: '',
      answerKeyExplanation: input.explanation || '',
      betterDistractors: [],
      suggestedRewrite: '',
      sourceEvidence: '',
      issues,
    };
  }

  /**
   * Rewrites a single question, keeping the rest of the quiz as context.
   *
   * The usual failure is four good questions and one bad one. Regenerating the
   * whole quiz to fix one is the wrong unit of work, and it throws away the
   * questions a reviewer has already accepted.
   */
  async regenerateQuestion(
    orgId: string,
    quizId: string,
    questionIndex: number,
    instruction?: string,
  ): Promise<Quiz> {
    const quiz = await this.quizModel.findOne({ _id: quizId, organizationId: orgId });
    if (!quiz) throw new NotFoundException('Quiz not found.');
    if (questionIndex < 0 || questionIndex >= quiz.questions.length) {
      throw new BadRequestException('That question does not exist in this quiz.');
    }

    const current = quiz.questions[questionIndex];
    const others = quiz.questions
      .filter((_, i) => i !== questionIndex)
      .map((q) => q.prompt)
      .slice(0, 20);

    const systemPrompt = `You write one replacement multiple-choice question for an enterprise training quiz.

Respond ONLY with raw JSON:
{
  "prompt": "The question",
  "options": ["four distinct options"],
  "correctOptionIndex": 0,
  "explanation": "Why that answer is correct"
}

Exactly four options. The wrong ones must be plausible to someone who half-knows the material. Do not repeat any of the questions already in this quiz.${this.localeInstruction(quiz.locale)}`;

    const userPrompt = `Quiz: "${quiz.title}" (${quiz.category}, ${quiz.difficulty})

Replace this question:
${current.prompt}

${instruction ? `What to change: ${instruction}` : 'It is weak. Write a better one covering the same ground.'}

Questions already in this quiz, which the replacement must not duplicate:
${others.map((p) => `- ${p}`).join('\n') || '(none)'}`;

    try {
      const generated = await this.aiService.generateJson<{
        prompt?: string;
        options?: string[];
        correctOptionIndex?: number;
        explanation?: string;
      }>(userPrompt, systemPrompt, { organizationId: orgId });

      if (!generated?.prompt || !Array.isArray(generated.options) || generated.options.length < 2) {
        throw new Error('The model did not return a usable question.');
      }

      const index =
        typeof generated.correctOptionIndex === 'number' &&
        generated.correctOptionIndex >= 0 &&
        generated.correctOptionIndex < generated.options.length
          ? generated.correctOptionIndex
          : 0;

      quiz.questions[questionIndex] = {
        ...current,
        prompt: generated.prompt.trim(),
        options: generated.options.map((o) => String(o).trim()),
        correctOptionIndex: index,
        explanation: (generated.explanation || '').trim(),
        // A regenerated question has not been reviewed, whatever the old one was.
        isApproved: false,
      } as (typeof quiz.questions)[number];

      quiz.markModified('questions');
      await quiz.save();
      return quiz.toObject();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(null, `Single-question regeneration failed: ${message}`);
      throw new BadRequestException(
        `Could not regenerate that question. ${message}`,
      );
    }
  }

  // --- Question bank -------------------------------------------------------

  /**
   * Keeps a reviewed question for reuse.
   *
   * Copied, not referenced: editing a bank entry must never change a quiz
   * somebody has already sat, or their stored answers would stop matching the
   * question they were asked.
   */
  async addToBank(
    orgId: string,
    userId: string,
    userName: string,
    input: {
      prompt: string;
      options: string[];
      correctOptionIndex: number;
      explanation?: string;
      points?: number;
      category?: string;
      difficulty?: string;
      tags?: string[];
      locale?: string;
      sourceEvidence?: string;
      sourceQuizId?: string;
    },
  ): Promise<BankQuestion> {
    const existingCategories = await this.bankModel.distinct('category', { organizationId: orgId });
    const category = reconcileCategory(input.category || 'General', existingCategories);

    const doc = {
      organizationId: orgId,
      prompt: input.prompt.trim(),
      options: input.options.map((o) => String(o).trim()),
      correctOptionIndex: input.correctOptionIndex,
      explanation: (input.explanation || '').trim(),
      points: input.points || 10,
      category,
      difficulty: (input.difficulty as BankQuestion['difficulty']) || 'INTERMEDIATE',
      tags: [...new Set((input.tags || []).map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 12),
      locale: input.locale || 'en',
      sourceEvidence: input.sourceEvidence || '',
      sourceQuizId: input.sourceQuizId || '',
      createdBy: userId,
      createdByName: userName,
    };

    try {
      return await this.bankModel.create(doc);
    } catch (err: any) {
      // The unique index on the prompt is the whole point: banking the same
      // question twice is the failure this feature exists to avoid.
      if (err?.code === 11000) {
        throw new BadRequestException('That question is already in the bank.');
      }
      throw err;
    }
  }

  async listBank(
    orgId: string,
    filters: { category?: string; difficulty?: string; tag?: string; search?: string; limit?: number },
  ): Promise<BankQuestion[]> {
    const query: Record<string, unknown> = { organizationId: orgId };
    if (filters.category) query.category = filters.category;
    if (filters.difficulty) query.difficulty = filters.difficulty;
    if (filters.tag) query.tags = filters.tag.trim().toLowerCase();
    if (filters.search?.trim()) {
      const safe = filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.prompt = new RegExp(safe, 'i');
    }

    return this.bankModel
      .find(query)
      .sort({ usageCount: -1, createdAt: -1 })
      .limit(Math.min(200, filters.limit || 50))
      .lean();
  }

  async removeFromBank(orgId: string, id: string): Promise<void> {
    const result = await this.bankModel.deleteOne({ _id: id, organizationId: orgId });
    if (result.deletedCount === 0) throw new NotFoundException('That question is not in the bank.');
  }

  /** Copies bank entries into a quiz and records that they were used. */
  async pullFromBank(orgId: string, quizId: string, bankIds: string[]): Promise<Quiz> {
    const quiz = await this.quizModel.findOne({ _id: quizId, organizationId: orgId });
    if (!quiz) throw new NotFoundException('Quiz not found.');

    const entries = await this.bankModel.find({ _id: { $in: bankIds }, organizationId: orgId }).lean();
    if (entries.length === 0) throw new BadRequestException('None of those questions are in the bank.');

    const alreadyAsked = new Set(quiz.questions.map((q) => q.prompt.trim().toLowerCase()));

    for (const entry of entries) {
      if (alreadyAsked.has(entry.prompt.trim().toLowerCase())) continue;
      quiz.questions.push({
        prompt: entry.prompt,
        options: entry.options,
        correctOptionIndex: entry.correctOptionIndex,
        explanation: entry.explanation,
        points: entry.points,
        tags: entry.tags,
        section: '',
        sourceEvidence: entry.sourceEvidence,
        // Already reviewed once, which is what earned it a place in the bank.
        isApproved: true,
      } as (typeof quiz.questions)[number]);
    }

    quiz.markModified('questions');
    await quiz.save();

    await this.bankModel.updateMany({ _id: { $in: entries.map((e) => e._id) } }, { $inc: { usageCount: 1 } });
    return quiz.toObject();
  }
}
