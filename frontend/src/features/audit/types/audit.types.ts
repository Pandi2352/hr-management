export type AuditStatus = 'SUCCESS' | 'FAILURE';
export type ActorType = 'USER' | 'SYSTEM' | 'ANONYMOUS';

export interface AuditLog {
  _id: string;
  organizationId: string;
  actorUserId: string | null;
  actorEmployeeId: string | null;
  actorName: string;
  actorEmail: string;
  actorType: ActorType;
  action: string;
  resourceType: string;
  resourceId: string | null;
  description: string;
  status: AuditStatus;
  oldValue: Record<string, any> | null;
  newValue: Record<string, any> | null;
  metadata: Record<string, any> | null;
  requestId: string | null;
  sessionId: string | null;
  ipAddress: string;
  userAgent: string;
  deviceType: string;
  createdAt: string;
}

export interface AuditMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface AuditFilters {
  search?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  actorUserId?: string;
  status?: string;
  requestId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface AuditVocabularyItem {
  value: string;
  label: string;
}

export interface AuditVocabulary {
  actions: AuditVocabularyItem[];
  resources: AuditVocabularyItem[];
}

/**
 * Action → visual treatment. Grouped by intent so the table reads at a glance;
 * the badge always carries its text label, never colour alone.
 */
export function auditActionTone(action: string): {
  dot: string;
  chip: string;
} {
  const destructive = ['DELETE', 'TERMINATE', 'SUSPEND', 'DEACTIVATE', 'INVITE_REVOKED', 'DOCUMENT_DELETED'];
  const creative = ['CREATE', 'ACTIVATE', 'RESTORE', 'INVITE_ACCEPTED', 'DOCUMENT_VERIFIED'];
  const auth = ['LOGIN', 'LOGOUT', 'SESSION_REVOKED', 'PASSWORD_CHANGED', 'PASSWORD_RESET', 'PASSWORD_RESET_REQUESTED'];
  const alarming = ['LOGIN_FAILED', 'ACCOUNT_LOCKED'];
  const movement = ['EXPORT', 'IMPORT', 'BULK_UPDATE', 'EMAIL_SENT', 'INVITE_SENT', 'INVITE_RESENT'];
  const access = ['ROLE_ASSIGNED', 'ROLE_REMOVED', 'PERMISSION_CHANGED', 'SCOPE_CHANGED', 'ACCOUNT_UNLOCKED'];

  if (destructive.includes(action)) {
    return {
      dot: 'bg-rose-500',
      chip: 'text-rose-700 bg-rose-50 dark:text-rose-400 dark:bg-rose-950/50',
    };
  }
  if (alarming.includes(action)) {
    return {
      dot: 'bg-amber-500',
      chip: 'text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/50',
    };
  }
  if (creative.includes(action)) {
    return {
      dot: 'bg-emerald-500',
      chip: 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50',
    };
  }
  if (auth.includes(action)) {
    return {
      dot: 'bg-violet-500',
      chip: 'text-violet-700 bg-violet-50 dark:text-violet-400 dark:bg-violet-950/50',
    };
  }
  if (access.includes(action)) {
    return {
      dot: 'bg-indigo-500',
      chip: 'text-indigo-700 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/50',
    };
  }
  if (movement.includes(action)) {
    return {
      dot: 'bg-cyan-500',
      chip: 'text-cyan-700 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-950/50',
    };
  }
  return {
    dot: 'bg-blue-500',
    chip: 'text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/50',
  };
}

/** "Updated" reads better in a table than "UPDATE". */
export function humanizeAction(action: string, vocabulary?: AuditVocabularyItem[]): string {
  const match = vocabulary?.find((v) => v.value === action);
  if (match) return match.label;
  return action
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function humanizeResource(resource: string, vocabulary?: AuditVocabularyItem[]): string {
  const match = vocabulary?.find((v) => v.value === resource);
  if (match) return match.label;
  return resource
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Compact relative time; the exact stamp lives in the tooltip/detail drawer. */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}
