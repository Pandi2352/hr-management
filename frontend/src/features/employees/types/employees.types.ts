export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  isPrimary?: boolean;
}

export interface Address {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface EducationItem {
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
  grade?: string;
}

export interface ExperienceItem {
  company: string;
  role: string;
  location?: string;
  startDate: string;
  endDate?: string;
  description?: string;
}

export interface SkillItem {
  name: string;
  proficiency: 'BEGINNER' | 'INTERMEDIATE' | 'EXPERT';
}

export type DocumentCategory =
  | 'IDENTITY'
  | 'EMPLOYMENT'
  | 'ACADEMIC'
  | 'FINANCIAL'
  | 'GENERAL';

export type DocumentVerificationStatus = 'VERIFIED' | 'PENDING' | 'REJECTED';

export interface DocumentItem {
  id?: string;
  title: string;
  category?: DocumentCategory | string;
  /** Server-issued download route. `storageKey` is never sent to the client. */
  fileUrl: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  uploadedAt?: string;
  uploadedBy?: string;
  verificationStatus?: DocumentVerificationStatus;
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: string | null;
}

export const DOCUMENT_CATEGORY_LABELS: Record<string, string> = {
  IDENTITY: 'Identity',
  EMPLOYMENT: 'Employment',
  ACADEMIC: 'Academic',
  FINANCIAL: 'Financial',
  GENERAL: 'General',
};

export const ACCEPTED_DOCUMENT_TYPES = 'application/pdf,image/png,image/jpeg';
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export interface Employee {
  _id: string;
  id?: string;
  organizationId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  displayName?: string;
  gender?: string;
  dateOfBirth?: string;
  maritalStatus?: string;
  nationality?: string;
  avatarUrl?: string;
  workEmail: string;
  userId?: string | null;
  initialPassword?: string;
  onboardingEmailStatus?: 'PENDING' | 'SENT' | 'FAILED';
  onboardingEmailSentAt?: string | null;
  personalEmail?: string;
  phone?: string;
  currentAddress?: Address;
  permanentAddress?: Address;
  emergencyContacts?: EmergencyContact[];
  departmentId?: string | null;
  departmentName?: string | null;
  designationId?: string | null;
  designationTitle?: string | null;
  locationId?: string | null;
  locationName?: string | null;
  costCenterId?: string | null;
  managerId?: string | null;
  manager?: {
    _id: string;
    firstName: string;
    lastName: string;
    displayName?: string;
    employeeCode: string;
    avatarUrl?: string;
  } | null;
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN' | 'TEMPORARY';
  status: 'ACTIVE' | 'PROBATION' | 'ON_LEAVE' | 'SUSPENDED' | 'RESIGNED' | 'TERMINATED' | 'INACTIVE';
  joiningDate: string;
  confirmationDate?: string;
  resignationDate?: string;
  lastWorkingDate?: string;
  terminationReason?: string;
  education?: EducationItem[];
  experience?: ExperienceItem[];
  skills?: SkillItem[];
  documents?: DocumentItem[];
  isDeleted?: boolean;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  // Detail page relations
  department?: any;
  designation?: any;
  location?: any;
  directReports?: Employee[];
  auditLogs?: any[];
}

export interface EmployeeFilterParams {
  page?: number;
  pageSize?: number;
  search?: string;
  departmentId?: string;
  designationId?: string;
  locationId?: string;
  status?: string;
  employmentType?: string;
}

/** Response of `GET /employees/stats` — server-side aggregation for the directory tiles. */
export interface EmployeeStats {
  total: number;
  newJoinersThisMonth: number;
  departmentCount: number;
  byStatus: Record<string, number>;
  byEmploymentType: Record<string, number>;
  byDepartment: { departmentId: string | null; name: string; code: string; count: number }[];
}
