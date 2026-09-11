import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Quiz, QuizDocument } from './schemas/quiz.schema';
import { QuizAssignment, QuizAssignmentDocument } from './schemas/quiz-assignment.schema';
import { QuizAttempt, QuizAttemptDocument } from './schemas/quiz-attempt.schema';
import { EmployeeGamification, EmployeeGamificationDocument } from './schemas/gamification.schema';
import { Employee, EmployeeDocument } from '../employees/schemas/employee.schema';
import { AiService } from '../ai/ai.service';
import { LearningLoopService } from './learning-loop.service';
import { QuizGenerationService } from './quiz-generation.service';
import { conceptsForQuestion } from './learning-loop.util';
import {
  canShuffleOptions,
  correctIndexes,
  isAnswerCorrect,
  mapThroughShuffle,
  questionDefect,
  questionType,
  TRUE_FALSE_OPTIONS,
} from './question-grading.util';
import { GRADING_VERSION } from './quiz-insights.util';
import { CreateQuizDto, GenerateAiQuizDto, AssignQuizDto, SubmitQuizAttemptDto } from './dto/quiz.dto';
import { reconcileCategory } from './quiz-category.util';
import { ASSIGNABLE_STATUSES, QUIZ_STATUSES, type QuizStatus } from './schemas/quiz.schema';


@Injectable()
export class QuizService {
  private readonly logger = new Logger(QuizService.name);

  constructor(
    @InjectModel(Quiz.name) private readonly quizModel: Model<QuizDocument>,
    @InjectModel(QuizAssignment.name) private readonly assignmentModel: Model<QuizAssignmentDocument>,
    @InjectModel(QuizAttempt.name) private readonly attemptModel: Model<QuizAttemptDocument>,
    @InjectModel(EmployeeGamification.name) private readonly gamificationModel: Model<EmployeeGamificationDocument>,
    @InjectModel(Employee.name) private readonly employeeModel: Model<EmployeeDocument>,
    private readonly aiService: AiService,
    private readonly learningLoop: LearningLoopService,
    private readonly generation: QuizGenerationService,
  ) {}

  /** Create a new quiz manually */

  /**
   * Categories actually in use, most-used first.
   *
   * Derived from the quizzes themselves rather than a separate collection, so
   * the list needs no maintenance: a category appears when a quiz uses it and
   * disappears when the last one is gone.
   */
  async listCategories(orgId: string): Promise<{ name: string; quizCount: number }[]> {
    const rows = await this.quizModel.aggregate([
      { $match: { organizationId: orgId, category: { $nin: [null, ''] } } },
      { $group: { _id: '$category', quizCount: { $sum: 1 } } },
      { $sort: { quizCount: -1, _id: 1 } },
      { $limit: 100 },
    ]);
    return rows.map((r: { _id: string; quizCount: number }) => ({
      name: r._id,
      quizCount: r.quizCount,
    }));
  }

  /**
   * Settles on the category a quiz should carry.
   *
   * An empty proposal means the caller wants the agent to decide, which is the
   * normal path now that the studio no longer asks for one up front. Whatever
   * arrives is matched against the categories already in use, so a generated
   * "information security" joins the existing "Information Security" instead of
   * founding a second one beside it.
   */
  private async resolveCategory(orgId: string, proposed?: string): Promise<string> {
    const existing = (await this.listCategories(orgId)).map((c) => c.name);
    return reconcileCategory(proposed || 'General', existing);
  }

  async createQuiz(orgId: string, userId: string, userName: string, dto: CreateQuizDto): Promise<Quiz> {
    const category = await this.resolveCategory(orgId, dto.category);

    /*
     * Checked here, by type, rather than by a rule on each field.
     *
     * "questions.5.correctOptionIndex must not be less than 0" is a message
     * about a field the author never filled in, on a question type that has no
     * options to point at. Whether a key is valid depends on the type, which a
     * per-field validator cannot know — so the field rule is permissive and
     * this names the question and the actual problem.
     */
    this.assertQuestionsUsable(dto.questions || []);
    const quiz = new this.quizModel({
      ...dto,
      // After the spread: the resolved name wins over whatever the client sent.
      category,
      // Normalised here rather than trusted from the client. A question with no
      // points made every score NaN, because grading summed an undefined.
      questions: (dto.questions || []).map((q) => ({
        ...this.shapeQuestion(q),
        isApproved: false,
      })),
      organizationId: orgId,
      createdBy: userId,
      createdByName: userName,
      isAiGenerated: false,
      /*
       * Draft, not published.
       *
       * This used to publish directly, which walked straight past the review
       * gate the rest of this module enforces — a quiz could be assigned to the
       * whole company without anyone having read it. Creation produces a draft;
       * a person approves it.
       */
      status: 'DRAFT',
    });
    return quiz.save();
  }

  /** Use the active AI engine (Quiz Master Agent) to generate questions on any topic */
  async generateWithAi(orgId: string, dto: GenerateAiQuizDto): Promise<{
    title: string;
    description: string;
    category: string;
    difficulty: string;
    timeLimitMinutes: number;
    passingScorePct: number;
    xpReward: number;
    questions: {
      type: string;
      prompt: string;
      options: string[];
      correctOptionIndex: number;
      correctOptionIndexes: number[];
      acceptedAnswers: string[];
      explanation: string;
      points: number;
      tags: string[];
    }[];
  }> {
    const questionCount = dto.questionCount || 5;
    const difficulty = dto.difficulty || 'INTERMEDIATE';

    /*
     * The same generator the background job uses.
     *
     * This path used to make one request and keep whatever came back, which is
     * why asking for five questions could produce two. It now goes through the
     * shared routine: one request per question type, and a top-up pass for
     * whatever is still short.
     */
    const existingCategories = (await this.listCategories(orgId)).map((c) => c.name);

    const questions = await this.generation.generateQuestions(
      orgId,
      {
        topic: dto.topic,
        difficulty,
        category: dto.category,
        refinedPrompt: dto.refinedPrompt,
      },
      questionCount,
      dto.typeMix as any,
    );

    if (questions.length === 0) {
      throw new BadRequestException(
        'The AI provider returned no usable questions. Check the provider settings in AI Providers and try again.',
      );
    }

    const category = reconcileCategory(dto.category || 'General', existingCategories);

    return {
      title: `${dto.topic} Assessment`,
      description: `Assessment on ${dto.topic}`,
      category,
      difficulty,
      timeLimitMinutes: Math.max(5, questions.length * 2),
      passingScorePct: 70,
      xpReward: questions.length * 20,
      questions,
    };
  }

  async enhancePrompt(
    orgId: string,
    dto: { topic: string; category?: string; difficulty?: string; questionCount?: number },
  ): Promise<{
    suggestedTitle: string;
    category: string;
    difficulty: string;
    questionCount: number;
    learningObjectives: string[];
    focusAreas: string[];
    refinedPrompt: string;
  }> {
    const difficulty = dto.difficulty || 'INTERMEDIATE';
    const questionCount = dto.questionCount || 5;

    // Same rule as generation: the agent proposes, the existing list decides
    // the spelling.
    const existingCategories = (await this.listCategories(orgId)).map((c) => c.name);

    const systemPrompt = `You are the PeopleOS Quiz Master Agent. Your task is to enhance an enterprise training quiz topic into a comprehensive assessment blueprint and refined generation prompt.
Respond ONLY with valid, raw JSON matching this schema:
{
  "suggestedTitle": "Professional and engaging quiz title",
  "learningObjectives": ["Clear objective 1", "Clear objective 2", "Clear objective 3"],
  "focusAreas": ["Key area 1", "Key area 2", "Key area 3"],
  "category": "Short reusable category name",
  "refinedPrompt": "A detailed, professional prompt instructing an assessment AI on exactly how to evaluate employees on this topic with practical scenario-based questions."
}
Do not include markdown code fences or conversational text.`;

    const categoryHint = existingCategories.length
      ? `Existing categories: ${existingCategories.join(', ')}. Reuse one exactly if the topic fits.`
      : 'No categories exist yet; choose a short, reusable one.';

    const userPrompt = `Enhance this quiz topic for enterprise employees:
Topic: "${dto.topic}"
Difficulty: "${difficulty}"
Number of questions: ${questionCount}
${dto.category ? `Category is fixed as "${dto.category}".` : categoryHint}`;

    try {
      const result = await this.aiService.generateJson<any>(userPrompt, systemPrompt, { organizationId: orgId });
      if (result && result.suggestedTitle && result.refinedPrompt) {
        return {
          suggestedTitle: result.suggestedTitle,
          category: reconcileCategory(dto.category || result.category || 'General', existingCategories),
          difficulty,
          questionCount,
          learningObjectives: Array.isArray(result.learningObjectives) ? result.learningObjectives : [
            `Demonstrate deep understanding of ${dto.topic}`,
            `Apply compliance and security best practices`,
            `Analyze real-world workplace scenarios effectively`
          ],
          focusAreas: Array.isArray(result.focusAreas) ? result.focusAreas : [
            'Industry standards', 'Risk mitigation', 'Decision making'
          ],
          refinedPrompt: result.refinedPrompt,
        };
      }
    } catch (err: unknown) {
      this.logger.warn(`AI Prompt enhancement fallback: ${err}`);
    }

    return {
      suggestedTitle: `${dto.topic} Professional Assessment`,
      category: reconcileCategory(dto.category || 'General', existingCategories),
      difficulty,
      questionCount,
      learningObjectives: [
        `Master fundamental guidelines and core enterprise protocols regarding ${dto.topic}`,
        `Identify common operational pitfalls, security liabilities, and compliance violations`,
        `Apply critical reasoning and actionable solutions to real-world scenarios`,
      ],
      focusAreas: [
        `Core principles & protocols`,
        `Scenario-based decision trees`,
        `Incident prevention and compliance assurance`,
      ],
      refinedPrompt: `Generate an in-depth ${difficulty.toLowerCase()}-level assessment with ${questionCount} scenario-based questions evaluating employee proficiency in "${dto.topic}". Questions must focus on practical workplace scenarios and sound judgment rather than basic recall.`,
    };
  }


  /**
   * Edits a quiz that is not yet published.
   *
   * Published is the line, not approved: once people have been assigned a quiz
   * and started sitting it, changing the questions underneath them would make
   * their stored answers refer to questions they were never asked. Editing a
   * published quiz means archiving it and publishing a new one.
   */
  async updateQuiz(orgId: string, quizId: string, dto: Record<string, any>): Promise<Quiz> {
    const quiz = await this.quizModel.findOne({ _id: quizId, organizationId: orgId });
    if (!quiz) throw new NotFoundException('Quiz not found.');

    if (quiz.status === 'PUBLISHED' || quiz.status === 'ARCHIVED') {
      throw new BadRequestException(
        `A ${quiz.status.toLowerCase()} quiz cannot be edited. Duplicate it instead, so attempts already recorded still match the questions that were asked.`,
      );
    }

    const scalar = [
      'title', 'description', 'difficulty', 'timeLimitMinutes',
      'passingScorePct', 'xpReward', 'shuffleOptions', 'shuffleQuestions',
    ];
    for (const field of scalar) {
      if (dto[field] !== undefined) (quiz as any)[field] = dto[field];
    }

    if (dto.category !== undefined) {
      quiz.category = await this.resolveCategory(orgId, dto.category);
    }

    if (Array.isArray(dto.tags)) {
      quiz.tags = [...new Set(dto.tags.map((t: string) => String(t).trim().toLowerCase()).filter(Boolean))].slice(0, 12);
    }

    if (dto.attemptPolicy) {
      quiz.attemptPolicy = { ...quiz.attemptPolicy, ...dto.attemptPolicy } as typeof quiz.attemptPolicy;
    }

    if (Array.isArray(dto.questions)) {
      if (dto.questions.length === 0) {
        throw new BadRequestException('A quiz needs at least one question.');
      }
      /*
       * Shaped by the same routine as creation.
       *
       * This mapping used to list its fields by hand, so it quietly dropped
       * the type, the multiple-answer key and the accepted answers — editing a
       * fill-in-the-blank turned it into a single-choice question with no
       * options, which then failed at the review gate with no clue why.
       */
      this.assertQuestionsUsable(dto.questions);

      quiz.questions = dto.questions.map((q: any) => ({
        ...this.shapeQuestion(q),
        prompt: String(q.prompt || '').trim(),
        explanation: String(q.explanation || '').trim(),
        section: String(q.section || ''),
        sourceEvidence: String(q.sourceEvidence || ''),
        isApproved: Boolean(q.isApproved),
      })) as typeof quiz.questions;
      quiz.markModified('questions');
    }

    await quiz.save();
    return quiz.toObject();
  }

  /**
   * Moves a quiz through its lifecycle.
   *
   * The allowed moves are listed rather than inferred, because the interesting
   * part is what is *not* allowed: nothing reaches PUBLISHED without passing
   * through APPROVED, so a generated quiz cannot be put in front of employees
   * without a person having accepted it.
   */
  async transition(
    orgId: string,
    quizId: string,
    target: QuizStatus,
    actor: { userId?: string; id?: string; firstName?: string; lastName?: string } | undefined,
    note?: string,
  ): Promise<Quiz> {
    if (!QUIZ_STATUSES.includes(target)) {
      throw new BadRequestException(`Unknown quiz status "${target}".`);
    }

    const quiz = await this.quizModel.findOne({ _id: quizId, organizationId: orgId });
    if (!quiz) throw new NotFoundException('Quiz not found.');

    const allowed: Record<QuizStatus, QuizStatus[]> = {
      DRAFT: ['IN_REVIEW', 'ARCHIVED'],
      IN_REVIEW: ['APPROVED', 'DRAFT', 'ARCHIVED'],
      APPROVED: ['PUBLISHED', 'DRAFT', 'ARCHIVED'],
      PUBLISHED: ['ARCHIVED'],
      ARCHIVED: ['DRAFT'],
    };

    if (!allowed[quiz.status]?.includes(target)) {
      throw new BadRequestException(
        `A ${quiz.status.toLowerCase()} quiz cannot move to ${target.toLowerCase()}.`,
      );
    }

    if (target === 'APPROVED' || target === 'IN_REVIEW') {
      // Approving a quiz with no questions, or with a key pointing at nothing,
      // would publish a broken assessment. Cheaper to refuse here.
      if (quiz.questions.length === 0) {
        throw new BadRequestException('A quiz needs at least one question before review.');
      }
      /*
       * Checked per question type rather than only against the single-choice
       * key, so a fill-in-the-blank that accepts nothing, or a multiple-answer
       * question with one answer, is caught here rather than by the first
       * employee to sit it.
       */
      for (let i = 0; i < quiz.questions.length; i += 1) {
        const defect = questionDefect(quiz.questions[i] as any);
        if (defect) {
          throw new BadRequestException(`Question ${i + 1} cannot be used: ${defect}.`);
        }
      }
    }

    quiz.status = target;
    quiz.reviewNote = note || '';

    if (target === 'APPROVED') {
      quiz.approvedBy = actor?.userId || actor?.id || '';
      quiz.approvedByName = [actor?.firstName, actor?.lastName].filter(Boolean).join(' ');
      quiz.approvedAt = new Date();
      // Approving accepts every question in it; that is what approval means.
      quiz.questions.forEach((q) => {
        q.isApproved = true;
      });
      quiz.markModified('questions');
    }

    if (target === 'DRAFT') {
      quiz.approvedBy = '';
      quiz.approvedByName = '';
      quiz.approvedAt = null;
    }

    await quiz.save();
    this.logger.log(`Quiz ${quizId} moved to ${target}`);
    return quiz.toObject();
  }

  /** Refuses a set of questions that could not be answered, naming the first. */
  private assertQuestionsUsable(questions: any[]): void {
    for (let i = 0; i < questions.length; i += 1) {
      const defect = questionDefect(this.shapeQuestion(questions[i]) as any);
      if (defect) {
        throw new BadRequestException(`Question ${i + 1} cannot be used: ${defect}.`);
      }
    }
  }

  /** One incoming question, normalised into the shape the schema stores. */
  private shapeQuestion(q: any) {
    const type = questionType(q);
    return {
      ...q,
      type,
      options: Array.isArray(q?.options) ? q.options : [],
      correctOptionIndex: Number.isInteger(q?.correctOptionIndex) ? q.correctOptionIndex : -1,
      correctOptionIndexes: Array.isArray(q?.correctOptionIndexes) ? q.correctOptionIndexes : [],
      acceptedAnswers: Array.isArray(q?.acceptedAnswers) ? q.acceptedAnswers : [],
      points: Number(q?.points) > 0 ? Number(q.points) : 10,
      tags: Array.isArray(q?.tags) ? q.tags : [],
    };
  }

  /**
   * Removes a quiz and the assignments pointing at it.
   *
   * Attempts are deliberately kept. Each one now carries its own copy of the
   * questions it asked, so somebody's score stays explainable after the quiz
   * behind it is gone — and deleting the evidence of an assessment people
   * already sat is not something a delete button should quietly do.
   *
   * A published quiz has to be archived first. Deleting something that is live
   * in people's arenas should take two decisions, not one.
   */
  async deleteQuiz(orgId: string, quizId: string): Promise<{
    deleted: boolean;
    assignmentsRemoved: number;
    attemptsKept: number;
  }> {
    const quiz = await this.quizModel.findOne({ _id: quizId, organizationId: orgId });
    if (!quiz) throw new NotFoundException('Quiz not found.');

    if (quiz.status === 'PUBLISHED') {
      throw new BadRequestException(
        'This quiz is published. Archive it first, then delete it.',
      );
    }

    const attemptsKept = await this.attemptModel.countDocuments({
      organizationId: orgId,
      quizId,
    });

    const assignments = await this.assignmentModel.deleteMany({
      organizationId: orgId,
      quizId,
    });

    await this.quizModel.deleteOne({ _id: quizId, organizationId: orgId });

    this.logger.log(
      `Quiz ${quizId} deleted; ${assignments.deletedCount} assignments removed, ${attemptsKept} attempts kept`,
    );

    return {
      deleted: true,
      assignmentsRemoved: assignments.deletedCount || 0,
      attemptsKept,
    };
  }

  /** Whether a quiz may be assigned to real employees yet. */
  private assertAssignable(status: QuizStatus): void {
    if (!ASSIGNABLE_STATUSES.includes(status)) {
      throw new BadRequestException(
        `This quiz is ${status.toLowerCase()}. Only an approved or published quiz can be assigned.`,
      );
    }
  }

  /** Assign a quiz to specific employees or ALL active employees in the organization */
  async assignQuiz(
    orgId: string,
    assignedBy: string,
    quizId: string,
    dto: AssignQuizDto,
  ): Promise<{ assignedCount: number; isAllEmployees: boolean }> {
    const quiz = await this.quizModel.findOne({ _id: quizId, organizationId: orgId });
    if (!quiz) throw new NotFoundException('Quiz not found.');

    // The review gate. A generated quiz can be confidently wrong, and an
    // unreviewed answer key does not just fail one person — it teaches the
    // whole company the wrong thing and then records them as having learned it.
    this.assertAssignable(quiz.status);

    let targetEmployeeIds: string[] = [];

    if (dto.assignAll) {
      // Bulk query all active employees in organization
      const allActive = await this.employeeModel
        .find({
          organizationId: orgId,
          employmentStatus: { $ne: 'TERMINATED' },
        })
        .select('_id')
        .lean();

      targetEmployeeIds = allActive.map((e) => String(e._id));
    } else if (dto.employeeIds && dto.employeeIds.length > 0) {
      targetEmployeeIds = dto.employeeIds;
    }

    if (targetEmployeeIds.length === 0) {
      throw new BadRequestException('No eligible employees found for assignment.');
    }

    const dueDate = dto.dueDate ? new Date(dto.dueDate) : undefined;

    const operations = targetEmployeeIds.map((empId) => ({
      updateOne: {
        filter: { organizationId: orgId, quizId, employeeId: empId },
        update: {
          $setOnInsert: {
            organizationId: orgId,
            quizId,
            employeeId: empId,
            assignedBy,
            isAllEmployees: Boolean(dto.assignAll),
            status: 'PENDING',
            dueDate,
          },
        },
        upsert: true,
      },
    }));

    const res = await this.assignmentModel.bulkWrite(operations as any);
    return {
      assignedCount: (res.upsertedCount || 0) + (res.matchedCount || 0),
      isAllEmployees: Boolean(dto.assignAll),
    };
  }

  /** List quizzes created in the organization with summary statistics */
  async listQuizzes(orgId: string, category?: string): Promise<any[]> {
    const filter: Record<string, any> = { organizationId: orgId, status: { $ne: 'ARCHIVED' } };
    if (category && category !== 'ALL') filter.category = category;

    const quizzes = await this.quizModel.find(filter).sort({ createdAt: -1 }).lean();

    // Attach assignment counts
    const quizIds = quizzes.map((q) => q._id);
    const assignments = await this.assignmentModel.find({ quizId: { $in: quizIds } }).lean();

    return quizzes.map((q) => {
      const related = assignments.filter((a) => a.quizId === q._id);
      const totalAssigned = related.length;
      const completed = related.filter((a) => a.status === 'COMPLETED').length;
      return {
        ...q,
        totalAssigned,
        completedCount: completed,
        completionRate: totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0,
      };
    });
  }

  /** Get assigned quizzes for a specific employee */
  async getMyAssignments(orgId: string, employeeId: string): Promise<any[]> {
    const assignments = await this.assignmentModel
      .find({ organizationId: orgId, employeeId })
      .sort({ createdAt: -1 })
      .lean();

    if (assignments.length === 0) return [];

    const quizIds = assignments.map((a) => a.quizId);
    const quizzes = await this.quizModel.find({ _id: { $in: quizIds } }).lean();
    const quizMap = new Map<string, any>(quizzes.map((q: any) => [String(q._id), q]));

    return assignments.map((a: any) => {
      const q = quizMap.get(String(a.quizId));
      return {
        assignmentId: a._id,
        quizId: a.quizId,
        status: a.status,
        dueDate: a.dueDate,
        completedAt: a.completedAt,
        score: a.score,
        scorePct: a.scorePct,
        passed: a.passed,
        title: q?.title || 'Assigned Quiz',
        description: q?.description || '',
        category: q?.category || 'General',
        difficulty: q?.difficulty || 'INTERMEDIATE',
        questionCount: q?.questions?.length || 0,
        timeLimitMinutes: q?.timeLimitMinutes || 15,
        xpReward: q?.xpReward || 100,
        passingScorePct: q?.passingScorePct || 70,
      };
    });
  }

  /** Get quiz details for playing (strips correct answers to prevent inspecting) */
  /**
   * The quiz as the person sitting it sees it.
   *
   * Answers are stripped rather than hidden, and the order is shuffled here on
   * the server. Shuffling in the client would be decoration: the original order
   * would still be in the payload, and two people sitting together would still
   * be able to compare "the answer is C".
   *
   * `optionOrder` travels back with the submission so the server can map a
   * chosen position onto the original option. Without it, a shuffled quiz would
   * grade every answer against the wrong key.
   */
  async getQuizForPlay(orgId: string, quizId: string, employeeId?: string): Promise<any> {
    const quiz = await this.quizModel.findOne({ _id: quizId, organizationId: orgId }).lean();
    if (!quiz) throw new NotFoundException('Quiz not found.');

    if (employeeId) {
      await this.assertAttemptAllowed(orgId, quiz, employeeId);
    }

    const questionOrder = quiz.shuffleQuestions
      ? this.shuffled(quiz.questions.map((_, i) => i))
      : quiz.questions.map((_, i) => i);

    return {
      _id: quiz._id,
      title: quiz.title,
      description: quiz.description,
      category: quiz.category,
      difficulty: quiz.difficulty,
      locale: quiz.locale,
      timeLimitMinutes: quiz.timeLimitMinutes,
      passingScorePct: quiz.passingScorePct,
      xpReward: quiz.xpReward,
      attemptPolicy: quiz.attemptPolicy,
      questions: questionOrder.map((originalIndex) => {
        const q = quiz.questions[originalIndex];
        const type = questionType(q as any);

        // True and False keep their order, and a fill-in-the-blank has no
        // options to reorder.
        const optionOrder =
          quiz.shuffleOptions && canShuffleOptions(type)
            ? this.shuffled((q.options || []).map((_, i) => i))
            : (q.options || []).map((_, i) => i);

        return {
          index: originalIndex,
          id: q.id,
          type,
          prompt: q.prompt,
          // Options in their shuffled order, with the mapping the grader needs.
          options: optionOrder.map((i) => q.options[i]),
          optionOrder,
          points: q.points,
        };
      }),
    };
  }

  /** Fisher-Yates on a copy, so the caller's array is untouched. */
  private shuffled<T>(items: T[]): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  /**
   * Enforces the attempt policy before someone is handed the questions.
   *
   * Checked on the way in rather than only on submit: letting a person sit a
   * quiz they are not allowed to submit wastes their time and reads as a bug.
   */
  private async assertAttemptAllowed(
    orgId: string,
    quiz: { _id: string; attemptPolicy?: { maxAttempts?: number; cooldownHours?: number; mustPass?: boolean }; passingScorePct: number },
    employeeId: string,
  ): Promise<void> {
    const policy = quiz.attemptPolicy || {};
    const maxAttempts = policy.maxAttempts ?? 1;

    const attempts = await this.attemptModel
      .find({ organizationId: orgId, quizId: quiz._id, employeeId })
      .sort({ createdAt: -1 })
      .lean();

    // A passed attempt closes the quiz regardless of how many are allowed:
    // re-sitting something you have already passed only risks the record.
    if (attempts.some((a: any) => a.passed)) {
      throw new BadRequestException('You have already passed this quiz.');
    }

    // 0 means unlimited, which is what an onboarding check wants.
    if (maxAttempts > 0 && attempts.length >= maxAttempts) {
      throw new BadRequestException(
        `You have used all ${maxAttempts} attempt${maxAttempts === 1 ? '' : 's'} for this quiz.`,
      );
    }

    const cooldownHours = policy.cooldownHours ?? 0;
    if (cooldownHours > 0 && attempts.length > 0) {
      const last = new Date((attempts[0] as any).createdAt || 0).getTime();
      const readyAt = last + cooldownHours * 3600 * 1000;
      if (Date.now() < readyAt) {
        const hoursLeft = Math.ceil((readyAt - Date.now()) / 3600000);
        throw new BadRequestException(
          `You can retry this quiz in ${hoursLeft} hour${hoursLeft === 1 ? '' : 's'}.`,
        );
      }
    }
  }

  /** Submit and grade a quiz attempt, award XP, update leaderboard & badges */
  async submitAttempt(
    orgId: string,
    employeeId: string,
    quizId: string,
    dto: SubmitQuizAttemptDto,
  ): Promise<any> {
    const quiz = await this.quizModel.findOne({ _id: quizId, organizationId: orgId });
    if (!quiz) throw new NotFoundException('Quiz not found.');

    // Re-checked here because the play endpoint's check guards the UI, not the
    // API: a submission can be posted without ever loading the questions.
    await this.assertAttemptAllowed(orgId, quiz as any, employeeId);

    let totalScore = 0;
    let maxScore = 0;
    const gradedAnswers = quiz.questions.map((q, idx) => {
      const submitted = dto.answers.find((a) => a.questionIndex === idx);

      /*
       * The client answers by position in the list it was shown, which is not
       * the original order once options are shuffled. `optionOrder` is the
       * mapping the play endpoint handed out, so position 2 becomes whichever
       * original option was displayed there. Grading without this step marks
       * nearly every answer on a shuffled quiz wrong.
       */
      const order = submitted?.optionOrder;
      const shown = submitted?.selectedOptionIndex ?? -1;
      const selected = mapThroughShuffle(shown, order);

      // The same mapping for every box ticked on a multiple-answer question.
      const selectedMany = (submitted?.selectedOptionIndexes || []).map((i) =>
        mapThroughShuffle(i, order),
      );

      // Coerced because a question saved before points had a default would
      // otherwise turn the whole attempt's score into NaN, and Mongoose then
      // rejects the attempt with a cast error the person cannot act on.
      const points = Number(q.points) > 0 ? Number(q.points) : 10;

      const isCorrect = isAnswerCorrect(q as any, {
        selectedOptionIndex: selected,
        selectedOptionIndexes: selectedMany,
        textAnswer: submitted?.textAnswer,
      });
      const pointsAwarded = isCorrect ? points : 0;
      totalScore += pointsAwarded;
      maxScore += points;

      return {
        questionIndex: idx,
        type: questionType(q as any),
        selectedOptionIndex: selected,
        selectedOptionIndexes: selectedMany,
        textAnswer: submitted?.textAnswer || '',
        correctOptionIndex: q.correctOptionIndex,
        correctOptionIndexes: correctIndexes(q as any),
        acceptedAnswers: q.acceptedAnswers || [],
        isCorrect,
        pointsAwarded,
        pointsPossible: points,
        // Returned so the review screen can show why a wrong answer was wrong.
        explanation: q.explanation,
        sourceEvidence: q.sourceEvidence || '',
        // Copied, not referenced: editing the quiz later must not change what
        // this person is shown about the attempt they actually sat.
        prompt: q.prompt,
        options: [...(q.options || [])],
        concepts: conceptsForQuestion({
          tags: q.tags,
          section: q.section,
          category: quiz.category,
        }),
      };
    });

    const scorePct = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const passed = scorePct >= quiz.passingScorePct;

    // XP calculation: Base XP + speed bonus + perfect score bonus
    let xpEarned = passed ? quiz.xpReward : Math.floor(quiz.xpReward * 0.3);
    const speedThreshold = (quiz.timeLimitMinutes * 60) / 2;
    if (passed && dto.timeTakenSeconds < speedThreshold) {
      xpEarned += 25; // Speed bonus
    }
    if (scorePct === 100) {
      xpEarned += 50; // Perfect score bonus
    }

    const badgesUnlocked: string[] = [];
    if (scorePct === 100) badgesUnlocked.push('Century Club (100% Score)');
    if (passed && dto.timeTakenSeconds < speedThreshold) badgesUnlocked.push('Speed Demon');

    const priorAttempts = await this.attemptModel.countDocuments({
      organizationId: orgId,
      quizId,
      employeeId,
    });

    // Save attempt record
    const attempt = new this.attemptModel({
      organizationId: orgId,
      quizId,
      employeeId,
      answers: gradedAnswers,
      gradingVersion: GRADING_VERSION,
      passingScorePct: quiz.passingScorePct,
      quizTitle: quiz.title,
      attemptNumber: priorAttempts + 1,
      attemptPolicySnapshot: JSON.parse(JSON.stringify(quiz.attemptPolicy || {})),
      autoSubmitted: Boolean(dto.autoSubmitted),
      score: totalScore,
      totalPoints: maxScore,
      scorePct,
      passed,
      timeTakenSeconds: dto.timeTakenSeconds,
      xpEarned,
      badgesUnlocked,
      completedAt: new Date(),
    });
    await attempt.save();

    // Mark assignment as completed
    await this.assignmentModel.updateOne(
      { organizationId: orgId, quizId, employeeId },
      {
        $set: {
          status: 'COMPLETED',
          completedAt: new Date(),
          score: totalScore,
          scorePct,
          passed,
        },
      },
    );

    // Update Employee Gamification Profile
    await this.updateGamification(orgId, employeeId, xpEarned, scorePct === 100, badgesUnlocked);

    /*
     * Step one of the learning loop: a submitted quiz becomes a diagnosis.
     *
     * Awaited so the results screen can ask for the loop immediately and find
     * it there, but the service swallows its own failures — a diagnosis that
     * cannot be written must never cost somebody their attempt.
     */
    await this.learningLoop.recordQuizAttempt(
      orgId,
      employeeId,
      quiz as any,
      gradedAnswers,
      String(attempt._id),
      scorePct,
    );

    return {
      attemptId: attempt._id,
      score: totalScore,
      totalPoints: maxScore,
      scorePct,
      passed,
      passingScorePct: quiz.passingScorePct,
      xpEarned,
      badgesUnlocked,
      timeTakenSeconds: dto.timeTakenSeconds,
      answers: gradedAnswers,
    };
  }

  /** Update or initialize gamification stats for an employee */
  private async updateGamification(
    orgId: string,
    employeeId: string,
    xpGain: number,
    isPerfect: boolean,
    newBadges: string[],
  ): Promise<void> {
    let profile = await this.gamificationModel.findOne({ organizationId: orgId, employeeId });

    if (!profile) {
      // Look up employee details for denormalized display
      const emp = await this.employeeModel.findById(employeeId).lean();
      const displayName = emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.workEmail : 'Employee';

      profile = new this.gamificationModel({
        organizationId: orgId,
        employeeId,
        displayName,
        avatarUrl: emp?.avatarUrl || '',
        departmentId: emp?.departmentId ? String(emp.departmentId) : '',
        departmentName: 'General',
        designationTitle: 'Team Member',
        totalXp: 0,
        level: 1,
        quizzesCompleted: 0,
        perfectScores: 0,
        currentStreak: 0,
        badges: ['First Step: Arena Contender'],
      });
    }

    profile.totalXp += xpGain;
    profile.quizzesCompleted += 1;
    if (isPerfect) profile.perfectScores += 1;
    profile.level = Math.floor(profile.totalXp / 250) + 1;
    profile.currentStreak += 1;
    profile.lastQuizDate = new Date();

    // Add new badges uniquely
    for (const b of newBadges) {
      if (!profile.badges.includes(b)) {
        profile.badges.push(b);
      }
    }
    if (profile.quizzesCompleted >= 5 && !profile.badges.includes('Quiz Veteran (5+ Completed)')) {
      profile.badges.push('Quiz Veteran (5+ Completed)');
    }

    await profile.save();
  }

  /** Get competitive leaderboard rankings */
  async getLeaderboard(orgId: string, departmentId?: string): Promise<any[]> {
    const filter: Record<string, any> = { organizationId: orgId };
    if (departmentId && departmentId !== 'ALL') {
      filter.departmentId = departmentId;
    }

    const leaders = await this.gamificationModel
      .find(filter)
      .sort({ totalXp: -1, quizzesCompleted: -1 })
      .limit(50)
      .lean();

    return leaders.map((l, index) => ({
      rank: index + 1,
      id: l.employeeId,
      displayName: l.displayName || 'Colleague',
      avatarUrl: l.avatarUrl || '',
      departmentName: l.departmentName || 'Operations',
      designationTitle: l.designationTitle || 'Team Member',
      totalXp: l.totalXp,
      level: l.level,
      quizzesCompleted: l.quizzesCompleted,
      perfectScores: l.perfectScores,
      currentStreak: l.currentStreak,
      badges: l.badges,
    }));
  }

  /** Get employee stats */
  async getMyStats(orgId: string, employeeId: string): Promise<any> {
    let profile = await this.gamificationModel.findOne({ organizationId: orgId, employeeId }).lean();
    if (!profile) {
      const emp = await this.employeeModel.findById(employeeId).lean();
      return {
        totalXp: 0,
        level: 1,
        rank: 1,
        quizzesCompleted: 0,
        perfectScores: 0,
        currentStreak: 0,
        badges: [],
        displayName: emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() : 'You',
      };
    }

    // Determine current rank
    const higherCount = await this.gamificationModel.countDocuments({
      organizationId: orgId,
      totalXp: { $gt: profile.totalXp },
    });

    return {
      ...profile,
      rank: higherCount + 1,
    };
  }
}
