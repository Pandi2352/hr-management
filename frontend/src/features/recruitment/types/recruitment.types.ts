export interface RecruitmentMetrics {
  totalJobOpenings: number;
  totalApplications: number;
  shortlisted: number;
  interviewed: number;
  rejected: number;
  hired: number;
}

export interface InterviewScheduleItem {
  id: string;
  candidateName: string;
  candidateRole: string;
  candidateAvatar?: string;
  scheduledTimeOrDate: string;
  badgeVariant: 'orange' | 'green' | 'blue' | 'amber';
}

export interface VacancyCardItem {
  id: string;
  title: string;
  employmentType: string;
  iconType: 'figma' | 'python' | 'web' | 'react';
  appliedCount: number;
  newCount: number;
  salary: string;
  location: string;
}

export type CandidateStatus =
  | 'Hired'
  | 'Shortlisted'
  | 'Pending'
  | 'Interviewed'
  | 'Rejected';

export type CandidateInterviewStatus = 'Completed' | 'Schedule' | 'Rejected';

export interface CandidateApplicant {
  id: string;
  name: string;
  avatarUrl?: string;
  department: string;
  phone: string;
  email: string;
  status: CandidateStatus;
  interviewStatus: CandidateInterviewStatus;
  resumeUrl?: string;
}
