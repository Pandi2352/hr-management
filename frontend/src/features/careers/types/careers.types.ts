export interface PublicCompanyInfo {
  companyName: string;
  legalName: string;
  logoUrl?: string;
  tagline: string;
  mission: string;
  aboutStory?: string;
  foundedYear: string;
  headquarters: string;
  globalHubs: string[];
  corporateEmail?: string;
  phone?: string;
  website?: string;
  solutions?: Array<{ title: string; description: string }>;
  stats: Array<{ label: string; value: string; change: string }>;
  values: Array<{ title: string; description: string }>;
  perks: Array<{ title: string; description: string; icon: string }>;
}

export interface PublicJobItem {
  _id: string;
  title: string;
  department: string;
  location: string;
  employmentType: string;
  experienceLevel: string;
  salaryRange: string;
  overview: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  iconType: string;
  status: 'OPEN' | 'CLOSED' | 'DRAFT';
  appliedCount: number;
  isFeatured: boolean;
  createdAt?: string;
}

export interface CandidateApplicationForm {
  jobId: string;
  fullName: string;
  email: string;
  phone: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  yearsExperience?: string;
  earliestStartDate?: string;
  coverLetter?: string;
  resumeFile: File | null;
}
