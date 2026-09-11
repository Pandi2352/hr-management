/** A quiz's life from generated to assignable. */
export type QuizStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'ARCHIVED';

/** Only these may be put in front of employees. */
export const ASSIGNABLE_STATUSES: QuizStatus[] = ['APPROVED', 'PUBLISHED'];

export const QUIZ_STATUS_LABELS: Record<QuizStatus, string> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In review',
  APPROVED: 'Approved',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
};

export interface AttemptPolicy {
  /** 0 means unlimited. */
  maxAttempts: number;
  scoring: 'BEST' | 'LATEST';
  mustPass: boolean;
  cooldownHours: number;
}

export interface QuizSection {
  name: string;
  questionCount: number;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
}

export interface QuizTemplate {
  id: string;
  name: string;
  purpose: string;
  category: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  questionCount: number;
  timeLimitMinutes: number;
  passingScorePct: number;
  xpReward: number;
  tags: string[];
  attemptPolicy: AttemptPolicy;
  shuffleOptions: boolean;
  shuffleQuestions: boolean;
  sections: QuizSection[];
  promptGuidance: string;
}

export interface QuizLocaleOption {
  code: string;
  label: string;
}

/** What the Question Doctor reports back about one question. */
export interface QuestionDiagnosis {
  clarityScore: number;
  estimatedDifficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  ambiguityWarning: string;
  answerKeyExplanation: string;
  betterDistractors: string[];
  suggestedRewrite: string;
  sourceEvidence: string;
  issues: string[];
}

export interface BankQuestion {
  _id: string;
  prompt: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  points: number;
  category: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  tags: string[];
  locale: string;
  sourceEvidence: string;
  usageCount: number;
  createdByName: string;
}

export const QUESTION_TYPES = ['SINGLE', 'MULTI', 'TRUE_FALSE', 'FILL_BLANK'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  SINGLE: 'Multiple choice',
  MULTI: 'Multiple answers',
  TRUE_FALSE: 'True or false',
  FILL_BLANK: 'Fill in the blank',
};

/** What each type asks of the author, said where they choose it. */
export const QUESTION_TYPE_HINTS: Record<QuestionType, string> = {
  SINGLE: 'Four options, one right',
  MULTI: 'At least two right, all must be ticked',
  TRUE_FALSE: 'Just the two options',
  FILL_BLANK: 'They type the answer; list what you will accept',
};

export interface QuizQuestion {
  id?: string;
  type?: QuestionType;
  prompt: string;
  options: string[];
  correctOptionIndex?: number;
  /** Every correct option, for a multiple-answer question. */
  correctOptionIndexes?: number[];
  /** What counts as right for a fill-in-the-blank, matched case-insensitively. */
  acceptedAnswers?: string[];
  explanation?: string;
  points: number;
  tags?: string[];
  section?: string;
  sourceEvidence?: string;
  isApproved?: boolean;
}

export interface Quiz {
  _id: string;
  organizationId: string;
  title: string;
  description: string;
  category: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  timeLimitMinutes: number;
  passingScorePct: number;
  xpReward: number;
  questions: QuizQuestion[];
  createdBy?: string;
  createdByName?: string;
  isAiGenerated?: boolean;
  status: QuizStatus;
  tags?: string[];
  locale?: string;
  templateId?: string;
  sections?: QuizSection[];
  attemptPolicy?: AttemptPolicy;
  shuffleOptions?: boolean;
  shuffleQuestions?: boolean;
  approvedByName?: string;
  approvedAt?: string;
  reviewNote?: string;
  totalAssigned?: number;
  completedCount?: number;
  completionRate?: number;
  createdAt?: string;
}

export interface QuizAssignmentItem {
  assignmentId: string;
  quizId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED';
  dueDate?: string;
  completedAt?: string;
  score?: number;
  scorePct?: number;
  passed?: boolean;
  title: string;
  description: string;
  category: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  questionCount: number;
  timeLimitMinutes: number;
  xpReward: number;
  passingScorePct: number;
}

export interface SubmittedAnswer {
  questionIndex: number;
  selectedOptionIndex: number;
  /** The shuffle mapping handed out by the play endpoint. */
  optionOrder?: number[];
}

export interface GradedAnswer {
  questionIndex: number;
  selectedOptionIndex: number;
  correctOptionIndex: number;
  isCorrect: boolean;
  pointsAwarded: number;
  explanation?: string;
  sourceEvidence?: string;
}

export interface QuizSubmissionResult {
  attemptId: string;
  score: number;
  totalPoints: number;
  scorePct: number;
  passed: boolean;
  passingScorePct: number;
  xpEarned: number;
  badgesUnlocked: string[];
  timeTakenSeconds: number;
  answers: GradedAnswer[];
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  displayName: string;
  avatarUrl: string;
  departmentName: string;
  designationTitle: string;
  totalXp: number;
  level: number;
  quizzesCompleted: number;
  perfectScores: number;
  currentStreak: number;
  badges: string[];
}

export interface MyGamificationStats {
  totalXp: number;
  level: number;
  rank: number;
  quizzesCompleted: number;
  perfectScores: number;
  currentStreak: number;
  badges: string[];
  displayName: string;
}

export interface CreateQuizPayload {
  title: string;
  description?: string;
  category?: string;
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  timeLimitMinutes?: number;
  passingScorePct?: number;
  xpReward?: number;
  questions: {
    prompt: string;
    options: string[];
    correctOptionIndex: number;
    explanation?: string;
    points?: number;
  }[];
}

export interface GenerateAiQuizPayload {
  topic: string;
  /** The author's brief, kept apart from the topic. */
  refinedPrompt?: string;
  category?: string;
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  questionCount?: number;
  locale?: string;
  templateId?: string;
}

/** Edits to a quiz that is not yet published. */
export interface UpdateQuizPayload {
  title?: string;
  description?: string;
  category?: string;
  tags?: string[];
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  timeLimitMinutes?: number;
  passingScorePct?: number;
  xpReward?: number;
  shuffleOptions?: boolean;
  shuffleQuestions?: boolean;
  attemptPolicy?: Partial<AttemptPolicy>;
  questions?: QuizQuestion[];
}

export interface AssignQuizPayload {
  employeeIds?: string[];
  assignAll?: boolean;
  dueDate?: string;
}

// --- Wrong Answer -> Learning Loop -----------------------------------------

export type MasteryBand = 'FRAGILE' | 'DEVELOPING' | 'SOLID' | 'MASTERED';

export const MASTERY_BAND_LABELS: Record<MasteryBand, string> = {
  FRAGILE: 'Fragile',
  DEVELOPING: 'Developing',
  SOLID: 'Solid',
  MASTERED: 'Mastered',
};

export interface ConceptCoaching {
  whyItMatters: string;
  explanation: string;
  commonMistake: string;
  practiceTips: string[];
  /** Whether a model wrote this, or it was assembled from the quiz itself. */
  source: 'AI' | 'QUIZ';
  generatedAt: string | null;
}

export interface ConceptProgress {
  concept: string;
  seen: number;
  correct: number;
  masteryPct: number;
  band: MasteryBand;
  trend: 'UP' | 'DOWN' | 'FLAT';
  baselinePct: number;
  isWeak: boolean;
  coaching: ConceptCoaching | null;
  lastSeenAt: string;
}

export interface LearningLoop {
  quizId: string;
  quizTitle: string;
  quizCategory: string;
  lastScorePct: number;
  firstScorePct: number;
  attemptCount: number;
  practiceCount: number;
  lastPracticedAt: string | null;
  overallMasteryPct: number;
  weakConcepts: string[];
  concepts: ConceptProgress[];
  hasOpenPractice: boolean;
  openPracticeId: string | null;
}

export interface PracticeQuestionView {
  index: number;
  prompt: string;
  options: string[];
  concept: string;
  origin: 'QUIZ' | 'BANK' | 'AI';
}

export interface PracticeSetView {
  practiceId: string;
  quizId: string;
  quizTitle: string;
  concepts: string[];
  status: 'OPEN' | 'COMPLETED';
  questions: PracticeQuestionView[];
}

export interface ConceptMovement {
  concept: string;
  beforePct: number;
  afterPct: number;
  band: MasteryBand;
  trend: 'UP' | 'DOWN' | 'FLAT';
  /** True once the concept is no longer counted as weak. */
  resolved: boolean;
}

export interface PracticeResult {
  practiceId: string;
  scorePct: number;
  correctCount: number;
  total: number;
  answers: {
    questionIndex: number;
    prompt: string;
    options: string[];
    concept: string;
    selectedOptionIndex: number;
    correctOptionIndex: number;
    isCorrect: boolean;
    explanation: string;
  }[];
  movement: ConceptMovement[];
  remainingWeakConcepts: string[];
  loop: LearningLoop;
}

// --- Explainable Score ------------------------------------------------------

export interface ExplainedQuestion {
  index: number;
  type?: QuestionType;
  prompt: string;
  options: string[];
  selectedOptionIndexes?: number[];
  correctOptionIndexes?: number[];
  textAnswer?: string;
  acceptedAnswers?: string[];
  concepts: string[];
  selectedOptionIndex: number;
  selectedOptionText: string | null;
  correctOptionIndex: number;
  correctOptionText: string;
  isCorrect: boolean;
  pointsAwarded: number;
  pointsPossible: number;
  explanation: string;
  answered: boolean;
}

export interface ExplainedScore {
  attemptId: string;
  gradingVersion: string;
  gradingRules: string[];
  quizId: string;
  quizTitle: string;
  employeeId: string;
  employeeName: string;
  submittedAt: string;
  timeTakenSeconds: number;
  autoSubmitted: boolean;
  attemptNumber: number;
  attemptPolicy: AttemptPolicy | Record<string, never>;
  passMarkPct: number;
  scorePct: number;
  passed: boolean;
  xpEarned: number;
  calculation: {
    questionsTotal: number;
    questionsAnswered: number;
    questionsUnanswered: number;
    questionsCorrect: number;
    pointsAwarded: number;
    pointsPossible: number;
    recomputedScorePct: number;
    /** False when the stored score cannot be reproduced from the stored answers. */
    matchesStoredScore: boolean;
    formula: string;
  };
  questions: ExplainedQuestion[];
  /** False for attempts taken before per-answer snapshots were recorded. */
  snapshotAvailable: boolean;
}

export interface AttemptSummary {
  attemptId: string;
  attemptNumber: number;
  scorePct: number;
  passed: boolean;
  submittedAt: string;
  timeTakenSeconds: number;
  autoSubmitted: boolean;
  questionsCorrect: number;
  questionsTotal: number;
}

// --- Skill Passport ---------------------------------------------------------

export type SkillLevel = 'Emerging' | 'Developing' | 'Intermediate' | 'Advanced';

export interface PassportSkill {
  skill: string;
  masteryPct: number;
  level: SkillLevel;
  evidenceCount: number;
  correct: number;
  trend: 'UP' | 'DOWN' | 'FLAT';
  measuredByQuizzes: number;
  lastSeenAt: string;
  /** Where the evidence came from. Quizzes today; training and confidence next. */
  evidence: ('QUIZ' | 'TRAINING' | 'CONFIDENCE')[];
}

export interface SkillPassport {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  avatarUrl: string;
  jobTitle: string;
  department: string;
  headline: 'Starting out' | 'Growing' | 'Steady' | 'Accelerating';
  xp: number;
  level: number;
  badges: string[];
  currentStreak: number;
  skillsTracked: number;
  quizzesCompleted: number;
  passRate: { numerator: number; denominator: number; pct: number };
  strengths: PassportSkill[];
  growthAreas: PassportSkill[];
  skills: PassportSkill[];
}

// --- Training ROI -----------------------------------------------------------

export interface RateValue {
  numerator: number;
  denominator: number;
  pct: number;
}

export interface TrainingRoi {
  scope: 'QUIZ' | 'ORGANISATION';
  quizId: string | null;
  generatedAt: string;
  completion: RateValue;
  pass: RateValue;
  improvement: {
    learnersWithRetry: number;
    avgFirstPct: number;
    avgLatestPct: number;
    deltaPoints: number;
  };
  weakestSkills: {
    skill: string;
    masteryPct: number;
    learnersAffected: number;
    answersSeen: number;
  }[];
  needingSupport: {
    employeeId: string;
    employeeName: string;
    department: string;
    quizId: string;
    quizTitle: string;
    scorePct: number;
    attempts: number;
    reason: string;
    reasonLabel: string;
    weakConcepts: string[];
  }[];
  flaggedQuestions: {
    quizId: string;
    quizTitle: string;
    questionIndex: number;
    prompt: string;
    responses: number;
    correctPct: number;
    flag: 'TOO_HARD' | 'TOO_EASY' | 'HEALTHY';
    reason: string;
  }[];
  recommendations: string[];
  totals: { quizzes: number; assignments: number; attempts: number; learners: number };
}

// --- Background generation --------------------------------------------------

export type JobStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface GenerationJob {
  jobId: string;
  status: JobStatus;
  topic: string;
  questionsDone: number;
  questionsTotal: number;
  quizId: string;
  quizTitle: string;
  error: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface StartGenerationPayload {
  topic: string;
  questionCount: number;
  title?: string;
  description?: string;
  category?: string;
  difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  locale?: string;
  templateId?: string;
  durationMinutes?: number;
  refinedPrompt?: string;
}
