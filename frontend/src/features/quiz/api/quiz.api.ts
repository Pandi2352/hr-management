import { apiClient } from '../../../utils/apiClient';
import type {
  Quiz,
  QuizAssignmentItem,
  QuizSubmissionResult,
  LeaderboardEntry,
  MyGamificationStats,
  CreateQuizPayload,
  GenerateAiQuizPayload,
  AssignQuizPayload,
  UpdateQuizPayload,
  QuizTemplate,
  QuizLocaleOption,
  QuestionDiagnosis,
  BankQuestion,
  LearningLoop,
  PracticeSetView,
  PracticeResult,
  ConceptProgress,
  ExplainedScore,
  AttemptSummary,
  SkillPassport,
  TrainingRoi,
  GenerationJob,
  StartGenerationPayload,
} from '../types/quiz.types';

export const quizApi = {
  listQuizzes: async (category?: string): Promise<Quiz[]> => {
    const res = await apiClient.get('/quizzes', { params: category ? { category } : {} });
    return res.data.data as Quiz[];
  },

  /** Categories already in use, so the studio can offer them instead of inventing. */
  categories: async (): Promise<{ name: string; quizCount: number }[]> => {
    const res = await apiClient.get('/quizzes/categories');
    return res.data.data as { name: string; quizCount: number }[];
  },

  /** The five starting points, with the settings that differ by purpose. */
  templates: async (): Promise<QuizTemplate[]> => {
    const res = await apiClient.get('/quizzes/templates');
    return res.data.data as QuizTemplate[];
  },

  locales: async (): Promise<QuizLocaleOption[]> => {
    const res = await apiClient.get('/quizzes/locales');
    return res.data.data as QuizLocaleOption[];
  },

  // --- Authoring -----------------------------------------------------------

  updateQuiz: async (quizId: string, payload: UpdateQuizPayload): Promise<Quiz> => {
    const res = await apiClient.patch(`/quizzes/${quizId}`, payload);
    return res.data.data as Quiz;
  },

  /** Reviews one question as posted, so it works on an unsaved draft. */
  diagnoseQuestion: async (payload: {
    prompt: string;
    options: string[];
    correctOptionIndex: number;
    explanation?: string;
    difficulty?: string;
    locale?: string;
    sourceText?: string;
  }): Promise<QuestionDiagnosis> => {
    const res = await apiClient.post('/quizzes/question-doctor', payload);
    return res.data.data as QuestionDiagnosis;
  },

  regenerateQuestion: async (
    quizId: string,
    index: number,
    instruction?: string,
  ): Promise<Quiz> => {
    const res = await apiClient.post(`/quizzes/${quizId}/questions/${index}/regenerate`, {
      instruction,
    });
    return res.data.data as Quiz;
  },

  // --- Review before publish ----------------------------------------------

  submitForReview: async (quizId: string): Promise<Quiz> => {
    const res = await apiClient.post(`/quizzes/${quizId}/submit-for-review`);
    return res.data.data as Quiz;
  },

  approveQuiz: async (quizId: string, note?: string): Promise<Quiz> => {
    const res = await apiClient.post(`/quizzes/${quizId}/approve`, { note });
    return res.data.data as Quiz;
  },

  rejectQuiz: async (quizId: string, note?: string): Promise<Quiz> => {
    const res = await apiClient.post(`/quizzes/${quizId}/reject`, { note });
    return res.data.data as Quiz;
  },

  publishQuiz: async (quizId: string): Promise<Quiz> => {
    const res = await apiClient.post(`/quizzes/${quizId}/publish`);
    return res.data.data as Quiz;
  },

  // --- Question bank -------------------------------------------------------

  listBank: async (filters: {
    category?: string;
    difficulty?: string;
    tag?: string;
    search?: string;
  } = {}): Promise<BankQuestion[]> => {
    const res = await apiClient.get('/quizzes/bank', { params: filters });
    return res.data.data as BankQuestion[];
  },

  addToBank: async (payload: {
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
  }): Promise<BankQuestion> => {
    const res = await apiClient.post('/quizzes/bank', payload);
    return res.data.data as BankQuestion;
  },

  removeFromBank: async (id: string): Promise<void> => {
    await apiClient.delete(`/quizzes/bank/${id}`);
  },

  pullFromBank: async (quizId: string, bankIds: string[]): Promise<Quiz> => {
    const res = await apiClient.post(`/quizzes/${quizId}/pull-from-bank`, { bankIds });
    return res.data.data as Quiz;
  },

  createQuiz: async (payload: CreateQuizPayload): Promise<Quiz> => {
    const res = await apiClient.post('/quizzes', payload);
    return res.data.data as Quiz;
  },

  enhancePrompt: async (payload: {
    topic: string;
    category?: string;
    difficulty?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    questionCount?: number;
  }): Promise<{
    suggestedTitle: string;
    category: string;
    difficulty: string;
    questionCount: number;
    learningObjectives: string[];
    focusAreas: string[];
    refinedPrompt: string;
  }> => {
    const res = await apiClient.post('/quizzes/enhance-prompt', payload);
    return res.data.data;
  },

  generateAiQuiz: async (payload: GenerateAiQuizPayload): Promise<any> => {
    const res = await apiClient.post('/quizzes/generate-ai', payload);
    return res.data.data;
  },

  assignQuiz: async (
    quizId: string,
    payload: AssignQuizPayload,
  ): Promise<{ assignedCount: number; isAllEmployees: boolean }> => {
    const res = await apiClient.post(`/quizzes/${quizId}/assign`, payload);
    return res.data.data;
  },

  getMyAssignments: async (): Promise<QuizAssignmentItem[]> => {
    const res = await apiClient.get('/quizzes/my-assignments');
    return res.data.data as QuizAssignmentItem[];
  },

  getQuizForPlay: async (quizId: string): Promise<any> => {
    const res = await apiClient.get(`/quizzes/${quizId}/play`);
    return res.data.data;
  },

  submitAttempt: async (
    quizId: string,
    payload: {
      answers: { questionIndex: number; selectedOptionIndex: number; optionOrder?: number[] }[];
      timeTakenSeconds: number;
      autoSubmitted?: boolean;
    },
  ): Promise<QuizSubmissionResult> => {
    const res = await apiClient.post(`/quizzes/${quizId}/submit`, payload);
    return res.data.data as QuizSubmissionResult;
  },

  getLeaderboard: async (departmentId?: string): Promise<LeaderboardEntry[]> => {
    const res = await apiClient.get('/quizzes/leaderboard', {
      params: departmentId ? { departmentId } : {},
    });
    return res.data.data as LeaderboardEntry[];
  },

  getMyStats: async (): Promise<MyGamificationStats> => {
    const res = await apiClient.get('/quizzes/my-stats');
    return res.data.data as MyGamificationStats;
  },

  // --- Wrong Answer -> Learning Loop ---------------------------------------

  /** Null when this person has not attempted the quiz yet. */
  getLearningLoop: async (quizId: string): Promise<LearningLoop | null> => {
    const res = await apiClient.get(`/quizzes/${quizId}/learning-loop`);
    return (res.data.data as LearningLoop) || null;
  },

  coachLearningLoop: async (quizId: string, refresh = false): Promise<LearningLoop> => {
    const res = await apiClient.post(`/quizzes/${quizId}/learning-loop/coach`, null, {
      params: refresh ? { refresh: 'true' } : {},
    });
    return res.data.data as LearningLoop;
  },

  buildPractice: async (quizId: string): Promise<PracticeSetView> => {
    const res = await apiClient.post(`/quizzes/${quizId}/learning-loop/practice`);
    return res.data.data as PracticeSetView;
  },

  getPractice: async (practiceId: string): Promise<PracticeSetView> => {
    const res = await apiClient.get(`/quizzes/practice/${practiceId}`);
    return res.data.data as PracticeSetView;
  },

  submitPractice: async (
    practiceId: string,
    answers: { questionIndex: number; selectedOptionIndex: number }[],
  ): Promise<PracticeResult> => {
    const res = await apiClient.post(`/quizzes/practice/${practiceId}/submit`, { answers });
    return res.data.data as PracticeResult;
  },

  getMyMastery: async (): Promise<ConceptProgress[]> => {
    const res = await apiClient.get('/quizzes/mastery');
    return res.data.data as ConceptProgress[];
  },

  // --- Explainable Score, Skill Passport, Training ROI ---------------------

  explainAttempt: async (attemptId: string): Promise<ExplainedScore> => {
    const res = await apiClient.get(`/quizzes/attempts/${attemptId}/explain`);
    return res.data.data as ExplainedScore;
  },

  listMyAttempts: async (quizId: string): Promise<AttemptSummary[]> => {
    const res = await apiClient.get(`/quizzes/${quizId}/my-attempts`);
    return res.data.data as AttemptSummary[];
  },

  /** Omit the id for your own passport. */
  getPassport: async (employeeId?: string): Promise<SkillPassport> => {
    const res = await apiClient.get(employeeId ? `/quizzes/passport/${employeeId}` : '/quizzes/passport');
    return res.data.data as SkillPassport;
  },

  getTrainingRoi: async (quizId?: string): Promise<TrainingRoi> => {
    const res = await apiClient.get('/quizzes/insights/training-roi', {
      params: quizId ? { quizId } : {},
    });
    return res.data.data as TrainingRoi;
  },

  // --- Removing a quiz -----------------------------------------------------

  archiveQuiz: async (quizId: string, note?: string): Promise<Quiz> => {
    const res = await apiClient.post(`/quizzes/${quizId}/archive`, { note });
    return res.data.data as Quiz;
  },

  deleteQuiz: async (
    quizId: string,
  ): Promise<{ deleted: boolean; assignmentsRemoved: number; attemptsKept: number }> => {
    const res = await apiClient.delete(`/quizzes/${quizId}`);
    return res.data.data;
  },

  // --- Background generation -----------------------------------------------

  startGenerationJob: async (payload: StartGenerationPayload): Promise<GenerationJob> => {
    const res = await apiClient.post('/quizzes/generation-jobs', payload);
    return res.data.data as GenerationJob;
  },

  listGenerationJobs: async (): Promise<GenerationJob[]> => {
    const res = await apiClient.get('/quizzes/generation-jobs');
    return res.data.data as GenerationJob[];
  },

  cancelGenerationJob: async (jobId: string): Promise<GenerationJob> => {
    const res = await apiClient.post(`/quizzes/generation-jobs/${jobId}/cancel`);
    return res.data.data as GenerationJob;
  },
};
