export type PipelineStage =
  | 'APPLIED'
  | 'SHORTLISTED'
  | 'INTERVIEWING'
  | 'OFFERED'
  | 'HIRED'
  | 'REJECTED'
  | 'WITHDRAWN';

export interface PipelineApplication {
  _id: string;
  jobId: string;
  jobTitle: string;
  department: string;
  fullName: string;
  email: string;
  phone: string;
  linkedinUrl?: string;
  yearsExperience?: string;
  earliestStartDate?: string;
  coverLetter?: string;
  resumeFileName: string;
  resumeOriginalName: string;
  resumeUrl: string;
  status: PipelineStage;
  createdAt?: string;
  aiScore?: number | null;
  aiRecommendation?: 'SHORTLIST' | 'MAYBE' | 'REJECT' | null;
  aiSummary?: string;
  aiStrengths?: string[];
  aiGaps?: string[];
  aiProvider?: string | null;
  aiScoredAt?: string | null;
}

export interface Interview {
  _id: string;
  applicationId: string;
  jobTitle: string;
  roundNumber: number;
  title: string;
  interviewerName: string;
  scheduledDate: string;
  scheduledTime: string;
  mode: 'IN_PERSON' | 'VIDEO' | 'PHONE';
  location?: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  rating?: number | null;
  recommendation?: 'HIRE' | 'MAYBE' | 'NO_HIRE' | null;
  feedback?: string;
}

export interface Offer {
  _id: string;
  applicationId: string;
  candidateName: string;
  jobTitle: string;
  designation?: string;
  department?: string;
  salaryOffered?: string;
  joiningDate?: string;
  expiryDate?: string;
  notes?: string;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'WITHDRAWN';
}

export interface CandidateDetail extends PipelineApplication {
  interviews: Interview[];
  offer: Offer | null;
}

export interface PipelineStats {
  totalJobOpenings: number;
  totalApplications: number;
  applied: number;
  shortlisted: number;
  interviewing: number;
  offered: number;
  hired: number;
  rejected: number;
  upcoming: (Interview & {
    candidateName: string;
    candidateRole: string;
    candidateEmail: string;
    candidatePhone: string;
  })[];
}

export const PIPELINE_STAGES: { id: PipelineStage; label: string; tint: string }[] = [
  { id: 'APPLIED', label: 'Applied', tint: 'bg-sky-500' },
  { id: 'SHORTLISTED', label: 'Shortlisted', tint: 'bg-indigo-500' },
  { id: 'INTERVIEWING', label: 'Interviewing', tint: 'bg-amber-500' },
  { id: 'OFFERED', label: 'Offered', tint: 'bg-violet-500' },
  { id: 'HIRED', label: 'Hired', tint: 'bg-emerald-500' },
  { id: 'REJECTED', label: 'Rejected', tint: 'bg-rose-500' },
];

/** Legal forward moves from each stage (hire goes through the hire action). */
export const NEXT_STAGES: Record<string, PipelineStage[]> = {
  APPLIED: ['SHORTLISTED', 'REJECTED', 'WITHDRAWN'],
  SHORTLISTED: ['INTERVIEWING', 'REJECTED', 'WITHDRAWN'],
  INTERVIEWING: ['OFFERED', 'REJECTED', 'WITHDRAWN'],
  OFFERED: ['REJECTED', 'WITHDRAWN'],
};
