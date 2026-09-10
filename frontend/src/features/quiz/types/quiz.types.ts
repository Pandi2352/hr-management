export interface QuizQuestion {
  id?: string;
  prompt: string;
  options: string[];
  correctOptionIndex?: number;
  explanation?: string;
  points: number;
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
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
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

export interface GradedAnswer {
  questionIndex: number;
  selectedOptionIndex: number;
  correctOptionIndex: number;
  isCorrect: boolean;
  pointsAwarded: number;
  explanation?: string;
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
}

export interface AssignQuizPayload {
  employeeIds?: string[];
  assignAll?: boolean;
  dueDate?: string;
}
