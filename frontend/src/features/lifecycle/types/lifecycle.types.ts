export interface RatingDimension {
  dimension: string;
  score: number;
  comments?: string;
}

export interface ProbationReviewEmployee {
  _id: string;
  employeeCode: string;
  displayName: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  avatarUrl?: string | null;
  departmentName: string;
  designationTitle: string;
  employmentType?: string;
  status: string;
}

export interface ProbationReview {
  _id: string;
  organizationId: string;
  employeeId: string;
  joiningDate: string;
  probationEndDate: string;
  status: 'PENDING_EVALUATION' | 'UNDER_HR_REVIEW' | 'CONFIRMED' | 'EXTENDED' | 'TERMINATED';
  evaluatorId?: string | null;
  ratings: RatingDimension[];
  overallScore: number;
  recommendation?: 'CONFIRM' | 'EXTEND_30' | 'EXTEND_60' | 'EXTEND_90' | 'TERMINATE' | null;
  managerComments?: string;
  hrNotes?: string;
  evaluatedAt?: string | null;
  finalizedAt?: string | null;
  finalizedBy?: string | null;
  extensionEndDate?: string;
  daysRemaining: number;
  isOverdue: boolean;
  isDueSoon: boolean;
  employee: ProbationReviewEmployee | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProbationMetrics {
  totalProbationers: number;
  dueIn15Days: number;
  overdue: number;
  confirmedThisMonth: number;
  underReview: number;
}

export interface QueryProbationParams {
  search?: string;
  status?: string;
  urgency?: string;
  departmentId?: string;
  page?: number;
  pageSize?: number;
}

export interface EvaluateProbationPayload {
  ratings: RatingDimension[];
  recommendation: 'CONFIRM' | 'EXTEND_30' | 'EXTEND_60' | 'EXTEND_90' | 'TERMINATE';
  managerComments?: string;
}

export interface SignoffProbationPayload {
  action: 'CONFIRM' | 'EXTEND_30' | 'EXTEND_60' | 'EXTEND_90' | 'TERMINATE';
  hrNotes?: string;
}

// Lifecycle Transitions
export interface LifecycleTransition {
  _id: string;
  organizationId: string;
  employeeId: string;
  type: 'PROMOTION' | 'DEPARTMENT_TRANSFER' | 'MANAGER_CHANGE' | 'CONFIRMATION' | 'COMPENSATION_REVISION';
  effectiveDate: string;
  title: string;
  justification: string;
  previousState: {
    departmentId?: string | null;
    departmentName?: string | null;
    designationId?: string | null;
    designationTitle?: string | null;
    managerId?: string | null;
    managerName?: string | null;
    employmentType?: string | null;
  };
  newState: {
    departmentId?: string | null;
    departmentName?: string | null;
    designationId?: string | null;
    designationTitle?: string | null;
    managerId?: string | null;
    managerName?: string | null;
    employmentType?: string | null;
  };
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'APPLIED' | 'REJECTED';
  initiatedBy?: string | null;
  approvedBy?: string | null;
  appliedAt?: string | null;
  employee: ProbationReviewEmployee | null;
  createdAt: string;
}

export interface TransitionMetrics {
  totalTransitions: number;
  promotions: number;
  transfers: number;
  managerChanges: number;
  confirmations: number;
}

export interface QueryTransitionParams {
  search?: string;
  type?: string;
  status?: string;
  employeeId?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateTransitionPayload {
  employeeId: string;
  type: 'PROMOTION' | 'DEPARTMENT_TRANSFER' | 'MANAGER_CHANGE' | 'CONFIRMATION' | 'COMPENSATION_REVISION';
  effectiveDate: string;
  title: string;
  justification?: string;
  newDepartmentId?: string;
  newDesignationId?: string;
  newManagerId?: string;
  newEmploymentType?: string;
}

export interface TimelineMilestone {
  id: string;
  date: string;
  title: string;
  description: string;
  type: string;
  badgeColor: string;
  meta?: Record<string, any>;
}

export interface EmployeeTimelineResponse {
  employee: {
    _id: string;
    employeeCode: string;
    displayName: string;
    status: string;
    avatarUrl?: string | null;
  };
  events: TimelineMilestone[];
}
