import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LoggerHelper } from '../../common/logger';
import { Employee, EmployeeDocument } from '../employees/schemas/employee.schema';
import { Quiz, QuizDocument } from './schemas/quiz.schema';
import { QuizAttempt, QuizAttemptDocument } from './schemas/quiz-attempt.schema';
import { QuizAssignment, QuizAssignmentDocument } from './schemas/quiz-assignment.schema';
import {
  EmployeeGamification,
  EmployeeGamificationDocument,
} from './schemas/gamification.schema';
import { LearningLoop, LearningLoopDocument } from './schemas/learning-loop.schema';
import { conceptKey } from './learning-loop.util';
import {
  clarityFlag,
  clarityReason,
  improvementAfterRetry,
  passportHeadline,
  rate,
  recomputeScore,
  skillLevel,
  supportRank,
  trainingRecommendations,
  SUPPORT_REASON_LABELS,
  GRADING_RULES,
  GRADING_VERSION,
  type ClarityFlag,
  type SupportReason,
} from './quiz-insights.util';

/**
 * The three things a quiz programme has to be able to answer once it is more
 * than a leaderboard:
 *
 *   "What can this person do?"        → `skillPassport`
 *   "Did any of this work?"           → `trainingRoi`
 *   "Why did I get that score?"       → `explainAttempt`
 *
 * All three read; none of them write. That is deliberate — a reporting surface
 * that can also mutate is one nobody can trust the history of.
 */
@Injectable()
export class QuizInsightsService {
  private readonly logger = LoggerHelper.Instance.child(QuizInsightsService.name);

  constructor(
    @InjectModel(Quiz.name) private readonly quizModel: Model<QuizDocument>,
    @InjectModel(QuizAttempt.name) private readonly attemptModel: Model<QuizAttemptDocument>,
    @InjectModel(QuizAssignment.name)
    private readonly assignmentModel: Model<QuizAssignmentDocument>,
    @InjectModel(EmployeeGamification.name)
    private readonly gamificationModel: Model<EmployeeGamificationDocument>,
    @InjectModel(LearningLoop.name) private readonly loopModel: Model<LearningLoopDocument>,
    @InjectModel(Employee.name) private readonly employeeModel: Model<EmployeeDocument>,
  ) {}

  // --- Explainable Score ----------------------------------------------------

  /**
   * Everything behind one score.
   *
   * Built from the attempt's own stored copy of the questions rather than from
   * the quiz, so editing or deleting a quiz afterwards cannot change what
   * somebody is shown about the attempt they sat. Where an old attempt predates
   * those snapshots, the live quiz is used and the response says so — an
   * explanation that quietly substitutes different questions would be worse
   * than no explanation at all.
   */
  async explainAttempt(
    orgId: string,
    attemptId: string,
    viewer: { employeeId: string; canViewOthers: boolean },
  ) {
    const attempt = await this.attemptModel.findOne({ _id: attemptId, organizationId: orgId }).lean();
    if (!attempt) throw new NotFoundException('That attempt does not exist.');

    if (attempt.employeeId !== viewer.employeeId && !viewer.canViewOthers) {
      throw new ForbiddenException('You can only see the working behind your own scores.');
    }

    const quiz = await this.quizModel.findOne({ _id: attempt.quizId, organizationId: orgId }).lean();
    const employee = await this.employeeModel
      .findOne({ _id: attempt.employeeId, organizationId: orgId })
      .select('firstName lastName employeeCode')
      .lean();

    const hasSnapshots = (attempt.answers || []).some((a: any) => a.prompt);

    const questions = (attempt.answers || []).map((a: any) => {
      const live = quiz?.questions?.[a.questionIndex];
      const prompt = a.prompt || live?.prompt || '(question no longer available)';
      const options: string[] = a.options?.length ? a.options : live?.options || [];
      const correctIndex =
        typeof a.correctOptionIndex === 'number' && a.correctOptionIndex >= 0
          ? a.correctOptionIndex
          : (live?.correctOptionIndex ?? -1);

      return {
        index: a.questionIndex,
        prompt,
        options,
        concepts: a.concepts || [],
        selectedOptionIndex: a.selectedOptionIndex,
        selectedOptionText:
          a.selectedOptionIndex >= 0 ? options[a.selectedOptionIndex] || '' : null,
        correctOptionIndex: correctIndex,
        correctOptionText: correctIndex >= 0 ? options[correctIndex] || '' : '',
        isCorrect: a.isCorrect,
        pointsAwarded: a.pointsAwarded || 0,
        pointsPossible: a.pointsPossible || 0,
        explanation: a.explanation || live?.explanation || '',
        answered: a.selectedOptionIndex >= 0,
      };
    });

    const recomputed = recomputeScore(attempt.answers as any[]);
    const answered = questions.filter((q) => q.answered).length;

    return {
      attemptId: attempt._id,
      gradingVersion: attempt.gradingVersion || GRADING_VERSION,
      gradingRules: GRADING_RULES[attempt.gradingVersion || GRADING_VERSION] || [],

      quizId: attempt.quizId,
      quizTitle: attempt.quizTitle || quiz?.title || '',
      employeeId: attempt.employeeId,
      employeeName: employee
        ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim()
        : '',

      submittedAt: attempt.completedAt,
      timeTakenSeconds: attempt.timeTakenSeconds || 0,
      autoSubmitted: Boolean(attempt.autoSubmitted),
      attemptNumber: attempt.attemptNumber || 1,
      attemptPolicy: attempt.attemptPolicySnapshot || {},

      passMarkPct: attempt.passingScorePct ?? quiz?.passingScorePct ?? 0,
      scorePct: attempt.scorePct,
      passed: attempt.passed,
      xpEarned: attempt.xpEarned || 0,

      calculation: {
        questionsTotal: questions.length,
        questionsAnswered: answered,
        questionsUnanswered: questions.length - answered,
        questionsCorrect: questions.filter((q) => q.isCorrect).length,
        pointsAwarded: recomputed.awarded,
        pointsPossible: recomputed.possible,
        recomputedScorePct: recomputed.pct,
        /*
         * An audit needs to be told when the stored score cannot be reproduced
         * from the stored answers, not shielded from it.
         */
        matchesStoredScore: recomputed.pct === attempt.scorePct,
        formula: 'points awarded ÷ points possible × 100, rounded',
      },

      questions,
      /** False for attempts taken before per-answer snapshots were recorded. */
      snapshotAvailable: hasSnapshots,
    };
  }

  /** A person's attempts at one quiz, newest first. */
  async listMyAttempts(orgId: string, employeeId: string, quizId: string) {
    const attempts = await this.attemptModel
      .find({ organizationId: orgId, employeeId, quizId })
      .sort({ createdAt: -1 })
      .lean();

    return attempts.map((a: any) => ({
      attemptId: a._id,
      attemptNumber: a.attemptNumber || 1,
      scorePct: a.scorePct,
      passed: a.passed,
      submittedAt: a.completedAt,
      timeTakenSeconds: a.timeTakenSeconds || 0,
      autoSubmitted: Boolean(a.autoSubmitted),
      questionsCorrect: (a.answers || []).filter((x: any) => x.isCorrect).length,
      questionsTotal: (a.answers || []).length,
    }));
  }

  // --- Skill Passport -------------------------------------------------------

  /**
   * What this person can actually do, rather than how many points they have.
   *
   * XP measures participation; it goes up for sitting a quiz badly. The skills
   * here come from the learning loop's per-concept tallies, which only move
   * when a question on that concept is answered — so the passport says
   * something XP cannot.
   */
  async skillPassport(orgId: string, employeeId: string) {
    const [employee, gamification, loops, attempts] = await Promise.all([
      this.employeeModel
        .findOne({ _id: employeeId, organizationId: orgId })
        .select('firstName lastName employeeCode avatarUrl designationTitle departmentName')
        .lean(),
      this.gamificationModel.findOne({ organizationId: orgId, employeeId }).lean(),
      this.loopModel.find({ organizationId: orgId, employeeId }).lean(),
      this.attemptModel.find({ organizationId: orgId, employeeId }).lean(),
    ]);

    // The same concept can be measured by several quizzes; a person has one
    // level of understanding of it, so the evidence is pooled.
    const bySkill = new Map<
      string,
      { skill: string; seen: number; correct: number; lastSeenAt: Date; trend: string; quizzes: Set<string> }
    >();

    for (const loop of loops as any[]) {
      for (const c of loop.concepts || []) {
        const key = conceptKey(c.concept);
        const row = bySkill.get(key) || {
          skill: c.concept,
          seen: 0,
          correct: 0,
          lastSeenAt: new Date(0),
          trend: 'FLAT',
          quizzes: new Set<string>(),
        };
        row.seen += c.seen || 0;
        row.correct += c.correct || 0;
        row.quizzes.add(loop.quizId);
        const seenAt = new Date(c.lastSeenAt || 0);
        if (seenAt > row.lastSeenAt) row.lastSeenAt = seenAt;

        // Recent direction, from the stored per-concept history.
        const history = c.history || [];
        if (history.length >= 4) {
          const recent = history.slice(-3);
          const earlier = history.slice(0, -3);
          const r = recent.filter((h: any) => h.correct).length / recent.length;
          const e = earlier.filter((h: any) => h.correct).length / earlier.length;
          row.trend = r - e >= 0.2 ? 'UP' : r - e <= -0.2 ? 'DOWN' : 'FLAT';
        }

        bySkill.set(key, row);
      }
    }

    const skills = Array.from(bySkill.values())
      .map((row) => {
        const pct = row.seen > 0 ? Math.round((row.correct / row.seen) * 100) : 0;
        return {
          skill: row.skill,
          masteryPct: pct,
          level: skillLevel(pct, row.seen),
          evidenceCount: row.seen,
          correct: row.correct,
          trend: row.trend as 'UP' | 'DOWN' | 'FLAT',
          measuredByQuizzes: row.quizzes.size,
          lastSeenAt: row.lastSeenAt,
          /*
           * Named so the passport can grow past quizzes without rewriting what
           * it already says. Completed training and self-rated confidence are
           * the obvious next two, and they belong beside quiz evidence rather
           * than in a separate profile.
           */
          evidence: ['QUIZ' as const],
        };
      })
      .sort((a, b) => b.masteryPct - a.masteryPct || b.evidenceCount - a.evidenceCount);

    const improving = skills.filter((s) => s.trend === 'UP').length;
    const slipping = skills.filter((s) => s.trend === 'DOWN').length;
    const passedAttempts = (attempts as any[]).filter((a) => a.passed).length;

    return {
      employeeId,
      employeeName: employee
        ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim()
        : '',
      employeeCode: (employee as any)?.employeeCode || '',
      avatarUrl: (employee as any)?.avatarUrl || '',
      jobTitle: (employee as any)?.designationTitle || '',
      department: (employee as any)?.departmentName || '',

      headline: passportHeadline({ skillsTracked: skills.length, improving, slipping }),
      xp: (gamification as any)?.totalXp || 0,
      level: (gamification as any)?.level || 1,
      badges: (gamification as any)?.badges || [],
      currentStreak: (gamification as any)?.currentStreak || 0,

      skillsTracked: skills.length,
      quizzesCompleted: attempts.length,
      passRate: rate(passedAttempts, attempts.length),

      strengths: skills.filter((s) => s.level === 'Advanced').slice(0, 5),
      growthAreas: [...skills]
        .reverse()
        .filter((s) => s.level === 'Developing' || s.level === 'Emerging')
        .slice(0, 5),
      skills,
    };
  }

  // --- Training ROI ---------------------------------------------------------

  /**
   * Did any of this change what people can do?
   *
   * The headline figure everywhere else in this space is completion, which
   * measures attendance. Completion is here because it has to be — the rest of
   * the numbers are unreadable without knowing how many people are in them —
   * but it is deliberately not the answer to the question.
   */
  async trainingRoi(orgId: string, quizId?: string) {
    const scope = quizId ? { organizationId: orgId, quizId } : { organizationId: orgId };

    const [assignments, attempts, loops, quizzes] = await Promise.all([
      this.assignmentModel.find(scope).lean(),
      this.attemptModel.find(scope).lean(),
      this.loopModel.find(scope).lean(),
      this.quizModel.find(quizId ? { organizationId: orgId, _id: quizId } : { organizationId: orgId }).lean(),
    ]);

    const completion = rate(
      (assignments as any[]).filter((a) => a.status === 'COMPLETED').length,
      assignments.length,
    );
    const pass = rate((attempts as any[]).filter((a) => a.passed).length, attempts.length);

    // Improvement is per person per quiz: somebody who retried Security is not
    // evidence about whether they improved at Payroll.
    const byLearner = new Map<string, { first: any; latest: any; attempts: number }>();
    for (const a of attempts as any[]) {
      const key = `${a.employeeId}::${a.quizId}`;
      const row = byLearner.get(key);
      const at = new Date(a.completedAt || a.createdAt || 0).getTime();
      if (!row) {
        byLearner.set(key, { first: { ...a, at }, latest: { ...a, at }, attempts: 1 });
        continue;
      }
      row.attempts += 1;
      if (at < row.first.at) row.first = { ...a, at };
      if (at > row.latest.at) row.latest = { ...a, at };
    }

    const improvement = improvementAfterRetry(
      Array.from(byLearner.values()).map((r) => ({
        firstScorePct: r.first.scorePct,
        latestScorePct: r.latest.scorePct,
        attempts: r.attempts,
      })),
    );

    // --- Weakest skills, pooled across everybody -----------------------------
    const skillTally = new Map<
      string,
      { skill: string; seen: number; correct: number; learners: Set<string> }
    >();
    for (const loop of loops as any[]) {
      for (const c of loop.concepts || []) {
        const key = conceptKey(c.concept);
        const row = skillTally.get(key) || {
          skill: c.concept,
          seen: 0,
          correct: 0,
          learners: new Set<string>(),
        };
        row.seen += c.seen || 0;
        row.correct += c.correct || 0;
        row.learners.add(loop.employeeId);
        skillTally.set(key, row);
      }
    }

    const weakestSkills = Array.from(skillTally.values())
      .filter((s) => s.seen >= 3)
      .map((s) => ({
        skill: s.skill,
        masteryPct: Math.round((s.correct / s.seen) * 100),
        learnersAffected: s.learners.size,
        answersSeen: s.seen,
      }))
      .sort((a, b) => a.masteryPct - b.masteryPct || b.learnersAffected - a.learnersAffected)
      .slice(0, 8);

    // --- Who needs a hand ----------------------------------------------------
    const employeeIds = Array.from(new Set((attempts as any[]).map((a) => a.employeeId)));
    const people = await this.employeeModel
      .find({ organizationId: orgId, _id: { $in: employeeIds } })
      .select('firstName lastName departmentName')
      .lean();
    const nameById = new Map(
      (people as any[]).map((p) => [
        String(p._id),
        { name: `${p.firstName || ''} ${p.lastName || ''}`.trim(), department: p.departmentName || '' },
      ]),
    );
    const quizById = new Map((quizzes as any[]).map((q) => [String(q._id), q]));

    const needingSupport: {
      employeeId: string;
      employeeName: string;
      department: string;
      quizId: string;
      quizTitle: string;
      scorePct: number;
      attempts: number;
      reason: SupportReason;
      reasonLabel: string;
      weakConcepts: string[];
    }[] = [];

    for (const [key, row] of byLearner) {
      const [employeeId, qId] = key.split('::');
      const quiz = quizById.get(qId);
      if (row.latest.passed) continue;

      const maxAttempts =
        row.latest.attemptPolicySnapshot?.maxAttempts ?? quiz?.attemptPolicy?.maxAttempts ?? 1;

      let reason: SupportReason = 'BELOW_PASS';
      if (maxAttempts > 0 && row.attempts >= maxAttempts) reason = 'FAILED_ALL_ATTEMPTS';
      else if (row.attempts > 1 && row.latest.scorePct <= row.first.scorePct) reason = 'NOT_IMPROVING';

      const loop = (loops as any[]).find((l) => l.employeeId === employeeId && l.quizId === qId);

      needingSupport.push({
        employeeId,
        employeeName: nameById.get(employeeId)?.name || '',
        department: nameById.get(employeeId)?.department || '',
        quizId: qId,
        quizTitle: row.latest.quizTitle || quiz?.title || '',
        scorePct: row.latest.scorePct,
        attempts: row.attempts,
        reason,
        reasonLabel: SUPPORT_REASON_LABELS[reason],
        weakConcepts: loop?.weakConcepts || [],
      });
    }

    needingSupport.sort(
      (a, b) => supportRank(a.reason) - supportRank(b.reason) || a.scorePct - b.scorePct,
    );

    // --- Questions that are not doing their job ------------------------------
    const questionTally = new Map<
      string,
      { quizId: string; index: number; prompt: string; responses: number; correct: number }
    >();
    for (const a of attempts as any[]) {
      for (const ans of a.answers || []) {
        const key = `${a.quizId}::${ans.questionIndex}`;
        const quiz = quizById.get(String(a.quizId));
        const row = questionTally.get(key) || {
          quizId: a.quizId,
          index: ans.questionIndex,
          prompt: ans.prompt || quiz?.questions?.[ans.questionIndex]?.prompt || '',
          responses: 0,
          correct: 0,
        };
        row.responses += 1;
        if (ans.isCorrect) row.correct += 1;
        if (!row.prompt && ans.prompt) row.prompt = ans.prompt;
        questionTally.set(key, row);
      }
    }

    const flaggedQuestions = Array.from(questionTally.values())
      .map((q) => {
        const correctPct = q.responses > 0 ? Math.round((q.correct / q.responses) * 100) : 0;
        const flag: ClarityFlag = clarityFlag(q.correct, q.responses);
        return {
          quizId: q.quizId,
          quizTitle: quizById.get(String(q.quizId))?.title || '',
          questionIndex: q.index,
          prompt: q.prompt,
          responses: q.responses,
          correctPct,
          flag,
          reason: clarityReason(flag, correctPct),
        };
      })
      .filter((q) => q.flag !== 'HEALTHY')
      .sort((a, b) => a.correctPct - b.correctPct);

    const recommendations = trainingRecommendations({
      completion,
      pass,
      improvement,
      weakestSkills,
      flaggedQuestions: flaggedQuestions.length,
      needingSupport: needingSupport.length,
    });

    return {
      scope: quizId ? 'QUIZ' : 'ORGANISATION',
      quizId: quizId || null,
      generatedAt: new Date(),

      completion,
      pass,
      improvement,
      weakestSkills,
      needingSupport: needingSupport.slice(0, 20),
      flaggedQuestions: flaggedQuestions.slice(0, 20),
      recommendations,

      totals: {
        quizzes: quizzes.length,
        assignments: assignments.length,
        attempts: attempts.length,
        learners: new Set((attempts as any[]).map((a) => a.employeeId)).size,
      },
    };
  }
}
