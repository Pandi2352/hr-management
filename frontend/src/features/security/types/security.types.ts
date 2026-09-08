export interface LinkedEmployee {
  _id: string;
  employeeCode: string;
  displayName: string;
  avatarUrl?: string;
  departmentName?: string;
  designationTitle?: string;
}

export interface UserAccount {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'LOCKED' | 'INVITED' | 'INACTIVE';
  roles: string[];
  permissions?: string[];
  departmentScope?: string[];
  failedLoginAttempts: number;
  lockedUntil?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  avatarUrl?: string;
  linkedEmployee?: LinkedEmployee | null;
}

export interface Role {
  _id: string;
  name: string;
  code: string;
  description: string;
  isSystem: boolean;
  permissions: string[];
  userCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

export interface Invitation {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  status: InvitationStatus;
  invitedByUserId: string;
  invitedByName: string;
  expiresAt: string;
  acceptedAt?: string | null;
  resendCount: number;
  lastResentAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserMetrics {
  totalActive: number;
  pendingInvitations: number;
  suspended: number;
  locked: number;
  activeAdminsAndManagers: number;
}

export interface SecurityPolicy {
  _id?: string;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireLowercase: boolean;
  passwordRequireNumbers: boolean;
  passwordRequireSymbols: boolean;
  sessionTimeoutMinutes: number;
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
}

export interface PermissionGroup {
  category: string;
  description: string;
  permissions: {
    key: string;
    label: string;
    description: string;
  }[];
}

/**
 * Mirrors the backend canonical catalog in
 * `backend/src/common/constants/permissions.constant.ts`. Keys must match
 * exactly — a mismatch silently denies access.
 */
export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    category: 'Employee Master Record',
    description: 'Governance over employee profiles, onboarding, directories, and documents',
    permissions: [
      { key: 'employee:read', label: 'View Employees', description: 'Search, browse employee directory, and view detail profiles.' },
      { key: 'employee:create', label: 'Onboard Employee', description: 'Create and provision new employee profiles and credentials.' },
      { key: 'employee:update', label: 'Edit Profiles', description: 'Modify employee personal, job, and department details.' },
      { key: 'employee:delete', label: 'Archive / Deactivate', description: 'Soft-delete or terminate employee profiles.' },
      { key: 'employee:status', label: 'Change Status', description: 'Move employees through probation, leave, resignation, or termination.' },
      { key: 'employee:compensation', label: 'Compensation Access', description: 'View and modify CTC, salary, and bank details. (No compensation fields exist in the schema yet — reserved.)' },
      { key: 'employee:export', label: 'Export Data', description: 'Download CSV rosters of employee records.' },
    ],
  },
  {
    category: 'Organization Hierarchy',
    description: 'Governance over legal entity, departments, designations, locations, and cost centers',
    permissions: [
      { key: 'org:profile:read', label: 'View Organization', description: 'View corporate profile, department tree, designations, locations, and cost centers.' },
      { key: 'org:profile:write', label: 'Edit Corporate Profile', description: 'Modify legal entity details and corporate profile settings.' },
      { key: 'org:departments:manage', label: 'Manage Departments', description: 'Create, edit, reparent, and archive departments.' },
      { key: 'org:designations:manage', label: 'Manage Designations', description: 'Manage designations and seniority grades.' },
      { key: 'org:locations:manage', label: 'Manage Locations', description: 'Manage office branches and facilities.' },
      { key: 'org:cost_centers:manage', label: 'Manage Cost Centers', description: 'Manage financial cost centers.' },
    ],
  },
  {
    category: 'User Accounts & Security',
    description: 'Administration of login credentials, role assignments, and lockout overrides',
    permissions: [
      { key: 'users:read', label: 'View Users', description: 'View system user accounts, linked roles, and login statuses.' },
      { key: 'users:invite', label: 'Invite Users', description: 'Send, resend, and revoke administrative user invitations.' },
      { key: 'users:manage', label: 'Manage Accounts', description: 'Assign roles, suspend/activate, unlock, and terminate sessions.' },
      { key: 'roles:manage', label: 'Manage Roles', description: 'Create custom roles and edit permission matrices.' },
      { key: 'security:policy:manage', label: 'Manage Security Policy', description: 'Edit password complexity, session timeout, and lockout rules.' },
    ],
  },
  {
    category: 'Audit & Compliance',
    description: 'Forensic visibility into administrative actions and authentication records',
    permissions: [
      { key: 'audit:read', label: 'View Audit Logs', description: 'Inspect timestamped records of data alterations.' },
      { key: 'audit:export', label: 'Export Audit Logs', description: 'Export security and audit data for regulatory audits.' },
      { key: 'audit:login_history', label: 'View Login History', description: 'Inspect IP addresses, devices, and authentication attempt logs.' },
    ],
  },
];
