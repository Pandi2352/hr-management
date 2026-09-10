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
} from '../types/quiz.types';

export const quizApi = {
  listQuizzes: async (category?: string): Promise<Quiz[]> => {
    const res = await apiClient.get('/quizzes', { params: category ? { category } : {} });
    return res.data.data as Quiz[];
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
    payload: { answers: { questionIndex: number; selectedOptionIndex: number }[]; timeTakenSeconds: number },
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
};
