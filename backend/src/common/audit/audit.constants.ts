/**
 * Centralized audit vocabulary.
 *
 * Modules MUST use these constants rather than inventing their own action or
 * resource strings — divergent strings make the audit trail unfilterable.
 */

export enum AuditAction {
  // Generic lifecycle
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  RESTORE = 'RESTORE',
  ACTIVATE = 'ACTIVATE',
  DEACTIVATE = 'DEACTIVATE',
  SUSPEND = 'SUSPEND',
  TERMINATE = 'TERMINATE',

  // Authentication
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_RESET = 'PASSWORD_RESET',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  SESSION_REVOKED = 'SESSION_REVOKED',

  // Invitations
  INVITE_SENT = 'INVITE_SENT',
  INVITE_RESENT = 'INVITE_RESENT',
  INVITE_REVOKED = 'INVITE_REVOKED',
  INVITE_ACCEPTED = 'INVITE_ACCEPTED',
  EMAIL_SENT = 'EMAIL_SENT',

  // Access control
  ROLE_ASSIGNED = 'ROLE_ASSIGNED',
  ROLE_REMOVED = 'ROLE_REMOVED',
  PERMISSION_CHANGED = 'PERMISSION_CHANGED',
  SCOPE_CHANGED = 'SCOPE_CHANGED',

  // Hierarchy
  HIERARCHY_CHANGED = 'HIERARCHY_CHANGED',

  // Data movement
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
  BULK_UPDATE = 'BULK_UPDATE',

  // Documents
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  DOCUMENT_DELETED = 'DOCUMENT_DELETED',
  DOCUMENT_VERIFIED = 'DOCUMENT_VERIFIED',
  DOCUMENT_DOWNLOADED = 'DOCUMENT_DOWNLOADED',
}

export enum AuditResource {
  // Authentication & identity
  AUTH = 'AUTH',
  SESSION = 'SESSION',
  USER = 'USER',
  ROLE = 'ROLE',
  PERMISSION = 'PERMISSION',
  SECURITY_POLICY = 'SECURITY_POLICY',
  INVITATION = 'INVITATION',

  // Organization
  ORGANIZATION = 'ORGANIZATION',
  DEPARTMENT = 'DEPARTMENT',
  DESIGNATION = 'DESIGNATION',
  LOCATION = 'LOCATION',
  COST_CENTER = 'COST_CENTER',

  // Workforce
  EMPLOYEE = 'EMPLOYEE',
  EMPLOYEE_DOCUMENT = 'EMPLOYEE_DOCUMENT',

  // Time off
  HOLIDAY = 'HOLIDAY',
  LEAVE_TYPE = 'LEAVE_TYPE',
  LEAVE_BALANCE = 'LEAVE_BALANCE',
  LEAVE_REQUEST = 'LEAVE_REQUEST',
  ATTENDANCE = 'ATTENDANCE',

  // Compliance
  AUDIT_LOG = 'AUDIT_LOG',
}

export enum AuditStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
}

/** Actor kinds — distinguishes a human operator from automated activity. */
export enum ActorType {
  USER = 'USER',
  SYSTEM = 'SYSTEM',
  ANONYMOUS = 'ANONYMOUS',
}

/** Human-readable labels for the audit UI (checklist §26). */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  [AuditAction.CREATE]: 'Created',
  [AuditAction.UPDATE]: 'Updated',
  [AuditAction.DELETE]: 'Deleted',
  [AuditAction.RESTORE]: 'Restored',
  [AuditAction.ACTIVATE]: 'Activated',
  [AuditAction.DEACTIVATE]: 'Deactivated',
  [AuditAction.SUSPEND]: 'Suspended',
  [AuditAction.TERMINATE]: 'Terminated',
  [AuditAction.LOGIN]: 'Signed in',
  [AuditAction.LOGOUT]: 'Signed out',
  [AuditAction.LOGIN_FAILED]: 'Sign-in failed',
  [AuditAction.ACCOUNT_LOCKED]: 'Account locked',
  [AuditAction.ACCOUNT_UNLOCKED]: 'Account unlocked',
  [AuditAction.PASSWORD_CHANGED]: 'Password changed',
  [AuditAction.PASSWORD_RESET]: 'Password reset',
  [AuditAction.PASSWORD_RESET_REQUESTED]: 'Password reset requested',
  [AuditAction.SESSION_REVOKED]: 'Sessions revoked',
  [AuditAction.INVITE_SENT]: 'Invitation sent',
  [AuditAction.INVITE_RESENT]: 'Invitation resent',
  [AuditAction.INVITE_REVOKED]: 'Invitation revoked',
  [AuditAction.INVITE_ACCEPTED]: 'Invitation accepted',
  [AuditAction.EMAIL_SENT]: 'Email sent',
  [AuditAction.ROLE_ASSIGNED]: 'Roles assigned',
  [AuditAction.ROLE_REMOVED]: 'Role removed',
  [AuditAction.PERMISSION_CHANGED]: 'Permissions changed',
  [AuditAction.SCOPE_CHANGED]: 'Access scope changed',
  [AuditAction.HIERARCHY_CHANGED]: 'Hierarchy changed',
  [AuditAction.EXPORT]: 'Exported',
  [AuditAction.IMPORT]: 'Imported',
  [AuditAction.BULK_UPDATE]: 'Bulk updated',
  [AuditAction.DOCUMENT_UPLOADED]: 'Document uploaded',
  [AuditAction.DOCUMENT_DELETED]: 'Document deleted',
  [AuditAction.DOCUMENT_VERIFIED]: 'Document verified',
  [AuditAction.DOCUMENT_DOWNLOADED]: 'Document downloaded',
};

export const AUDIT_RESOURCE_LABELS: Record<string, string> = {
  [AuditResource.AUTH]: 'Authentication',
  [AuditResource.SESSION]: 'Session',
  [AuditResource.USER]: 'User Account',
  [AuditResource.ROLE]: 'Role',
  [AuditResource.PERMISSION]: 'Permission',
  [AuditResource.SECURITY_POLICY]: 'Security Policy',
  [AuditResource.INVITATION]: 'Invitation',
  [AuditResource.ORGANIZATION]: 'Organization',
  [AuditResource.DEPARTMENT]: 'Department',
  [AuditResource.DESIGNATION]: 'Designation',
  [AuditResource.LOCATION]: 'Location',
  [AuditResource.COST_CENTER]: 'Cost Center',
  [AuditResource.EMPLOYEE]: 'Employee',
  [AuditResource.EMPLOYEE_DOCUMENT]: 'Employee Document',
  [AuditResource.HOLIDAY]: 'Holiday',
  [AuditResource.LEAVE_TYPE]: 'Leave Type',
  [AuditResource.LEAVE_BALANCE]: 'Leave Balance',
  [AuditResource.LEAVE_REQUEST]: 'Leave Request',
  [AuditResource.ATTENDANCE]: 'Attendance',
  [AuditResource.AUDIT_LOG]: 'Audit Log',
};
