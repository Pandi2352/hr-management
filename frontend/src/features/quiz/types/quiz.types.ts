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

export interface QuizQuestion {
  id?: string;
  prompt: string;
  options: string[];
  correctOptionIndex?: number;
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
