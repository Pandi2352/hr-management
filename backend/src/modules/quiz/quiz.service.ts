import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Quiz, QuizDocument } from './schemas/quiz.schema';
import { QuizAssignment, QuizAssignmentDocument } from './schemas/quiz-assignment.schema';
import { QuizAttempt, QuizAttemptDocument } from './schemas/quiz-attempt.schema';
import { EmployeeGamification, EmployeeGamificationDocument } from './schemas/gamification.schema';
import { Employee, EmployeeDocument } from '../employees/schemas/employee.schema';
import { AiService } from '../ai/ai.service';
import { CreateQuizDto, GenerateAiQuizDto, AssignQuizDto, SubmitQuizAttemptDto } from './dto/quiz.dto';

interface AiGeneratedQuizJson {
  title: string;
  description: string;
  category: string;
  questions: {
    prompt: string;
    options: string[];
    correctOptionIndex: number;
    explanation: string;
    points: number;
  }[];
}

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
  ) {}

  /** Create a new quiz manually */
  async createQuiz(orgId: string, userId: string, userName: string, dto: CreateQuizDto): Promise<Quiz> {
    const quiz = new this.quizModel({
      ...dto,
      organizationId: orgId,
      createdBy: userId,
      createdByName: userName,
      isAiGenerated: false,
      status: 'PUBLISHED',
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
      prompt: string;
      options: string[];
      correctOptionIndex: number;
      explanation: string;
      points: number;
    }[];
  }> {
    const questionCount = dto.questionCount || 5;
    const difficulty = dto.difficulty || 'INTERMEDIATE';
    const category = dto.category || 'General';

    const systemPrompt = `You are the PeopleOS Quiz Master Agent. You generate engaging, professional training and assessment quizzes for employees in an enterprise organization.
Respond ONLY with valid, raw JSON matching this schema:
{
  "title": "Short catchy title",
  "description": "Engaging description of this quiz",
  "category": "${category}",
  "questions": [
    {
      "prompt": "Clear question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctOptionIndex": 0,
      "explanation": "Why this answer is correct",
      "points": 10
    }
  ]
}
Each question must have exactly 4 options. Options must be distinct, realistic, and educational. Do not include markdown code fences or conversational text.`;

    const userPrompt = `Generate a ${difficulty.toLowerCase()}-level quiz with exactly ${questionCount} questions on the topic: "${dto.topic}". Category: "${category}".`;

    try {
      const generated = await this.aiService.generateJson<AiGeneratedQuizJson>(
        userPrompt,
        systemPrompt,
        { organizationId: orgId },
      );

      if (generated?.questions && Array.isArray(generated.questions) && generated.questions.length > 0) {
        return {
          title: generated.title || `${dto.topic} Assessment`,
          description: generated.description || `Assessment on ${dto.topic}`,
          category,
          difficulty,
          timeLimitMinutes: Math.max(5, questionCount * 2),
          passingScorePct: 70,
          xpReward: questionCount * 20,
          questions: generated.questions.map((q, idx) => ({
            prompt: q.prompt || `Question ${idx + 1}`,
            options: Array.isArray(q.options) && q.options.length >= 2 ? q.options : ['Yes', 'No', 'Partially', 'Not applicable'],
            correctOptionIndex: typeof q.correctOptionIndex === 'number' ? q.correctOptionIndex : 0,
            explanation: q.explanation || 'Review company guidelines for further context.',
            points: q.points || 10,
          })),
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(`AI Quiz Generation failed, providing fallback template: ${msg}`);
    }

    // Fallback template if LLM is offline or unconfigured
    return {
      title: `${dto.topic} Knowledge Check`,
      description: `Training quiz on ${dto.topic}`,
      category,
      difficulty,
      timeLimitMinutes: questionCount * 2,
      passingScorePct: 70,
      xpReward: questionCount * 20,
      questions: Array.from({ length: questionCount }, (_, i) => ({
        prompt: `Core Assessment Question ${i + 1} regarding ${dto.topic}?`,
        options: [
          `Standard protocol approach for ${dto.topic}`,
          `Alternative non-compliant approach`,
          `Unverified external recommendation`,
          `Skip procedure entirely`,
        ],
        correctOptionIndex: 0,
        explanation: `Standard enterprise procedure should always be followed for ${dto.topic}.`,
        points: 10,
      })),
    };
  }

  /** Enhance raw user prompt into structured blueprint with learning objectives */
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
    const category = dto.category || 'Compliance & Safety';
    const difficulty = dto.difficulty || 'INTERMEDIATE';
    const questionCount = dto.questionCount || 5;

    const systemPrompt = `You are the PeopleOS Quiz Master Agent. Your task is to enhance an enterprise training quiz topic into a comprehensive assessment blueprint and refined generation prompt.
Respond ONLY with valid, raw JSON matching this schema:
{
  "suggestedTitle": "Professional and engaging quiz title",
  "learningObjectives": ["Clear objective 1", "Clear objective 2", "Clear objective 3"],
  "focusAreas": ["Key area 1", "Key area 2", "Key area 3"],
  "refinedPrompt": "A detailed, professional prompt instructing an assessment AI on exactly how to evaluate employees on this topic with practical scenario-based questions."
}
Do not include markdown code fences or conversational text.`;

    const userPrompt = `Enhance this quiz topic for enterprise employees:
Topic: "${dto.topic}"
Target Category: "${category}"
Difficulty: "${difficulty}"
Number of questions: ${questionCount}`;

    try {
      const result = await this.aiService.generateJson<any>(userPrompt, systemPrompt, { organizationId: orgId });
      if (result && result.suggestedTitle && result.refinedPrompt) {
        return {
          suggestedTitle: result.suggestedTitle,
          category,
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
      category,
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

  /** Assign a quiz to specific employees or ALL active employees in the organization */
  async assignQuiz(
    orgId: string,
    assignedBy: string,
    quizId: string,
    dto: AssignQuizDto,
  ): Promise<{ assignedCount: number; isAllEmployees: boolean }> {
    const quiz = await this.quizModel.findOne({ _id: quizId, organizationId: orgId });
    if (!quiz) throw new NotFoundException('Quiz not found.');

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
  async getQuizForPlay(orgId: string, quizId: string): Promise<any> {
    const quiz = await this.quizModel.findOne({ _id: quizId, organizationId: orgId }).lean();
    if (!quiz) throw new NotFoundException('Quiz not found.');

    return {
      _id: quiz._id,
      title: quiz.title,
      description: quiz.description,
      category: quiz.category,
      difficulty: quiz.difficulty,
      timeLimitMinutes: quiz.timeLimitMinutes,
      passingScorePct: quiz.passingScorePct,
      xpReward: quiz.xpReward,
      questions: quiz.questions.map((q, idx) => ({
        index: idx,
        id: q.id,
        prompt: q.prompt,
        options: q.options,
        points: q.points,
      })),
    };
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

    let totalScore = 0;
    let maxScore = 0;
    const gradedAnswers = quiz.questions.map((q, idx) => {
      const submitted = dto.answers.find((a) => a.questionIndex === idx);
      const selected = submitted ? submitted.selectedOptionIndex : -1;
      const isCorrect = selected === q.correctOptionIndex;
      const pointsAwarded = isCorrect ? q.points : 0;
      totalScore += pointsAwarded;
      maxScore += q.points;

      return {
        questionIndex: idx,
        selectedOptionIndex: selected,
        correctOptionIndex: q.correctOptionIndex,
        isCorrect,
        pointsAwarded,
        explanation: q.explanation,
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

    // Save attempt record
    const attempt = new this.attemptModel({
      organizationId: orgId,
      quizId,
      employeeId,
      answers: gradedAnswers,
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
