export type TaskCategory = 'HR' | 'IT' | 'MANAGER' | 'EMPLOYEE';
export type TaskStatus = 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';
export type OnboardingStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';

export interface TaskSubmission {
  textNotes?: string;
  fileUrls?: string[];
  payload?: Record<string, any> | null;
}

export interface OnboardingTask {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  isMandatory: boolean;
  status: TaskStatus;
  assignedTo?: string | null;
  dueDaysFromJoining: number;
  dueDate?: string;
  submission?: TaskSubmission;
  remarks?: string;
  completedAt?: string | null;
  completedBy?: string | null;
}

export interface OnboardingEmployeeSummary {
  _id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  workEmail: string;
  avatarUrl?: string;
  status?: string;
  departmentId?: string;
  departmentName?: string;
  designationId?: string;
  designationTitle?: string;
  managerName?: string;
  phone?: string;
  personalEmail?: string;
}

export interface OnboardingSession {
  _id: string;
  organizationId: string;
  employeeId: string;
  targetJoiningDate: string;
  status: OnboardingStatus;
  overallProgress: number;
  completedTasks: number;
  totalTasks: number;
  tasks: OnboardingTask[];
  isOverdue?: boolean;
  employee?: OnboardingEmployeeSummary | null;
  completedAt?: string | null;
  completedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface OnboardingMetrics {
  total: number;
  inProgress: number;
  completed: number;
  overdue: number;
  avgCompletion: number;
}

export interface OnboardingListResponse {
  items: OnboardingSession[];
  total: number;
  page: number;
  limit: number;
  metrics: OnboardingMetrics;
}

export interface InitializeOnboardingParams {
  employeeId: string;
  targetJoiningDate: string;
  additionalTasks?: Array<{
    title: string;
    description?: string;
    category: TaskCategory;
    isMandatory?: boolean;
    dueDaysFromJoining?: number;
  }>;
}

export interface UpdateTaskStatusParams {
  status: TaskStatus;
  remarks?: string;
  notes?: string;
  fileUrls?: string[];
}

export interface CandidateSubmitStepParams {
  step: 'PERSONAL' | 'BANK' | 'DOCUMENTS' | 'POLICY';
  data: Record<string, any>;
}
