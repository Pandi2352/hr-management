/**
 * Canonical permission catalog for PeopleOS RBAC.
 *
 * Convention: `resource:action` (colon-separated). Every `@RequirePermissions()`
 * decorator and every seeded/custom role permission list MUST use these exact
 * keys — mismatched keys silently deny access.
 */
export const PERMISSIONS = {
  // Employee master record
  EMPLOYEE_READ: 'employee:read',
  EMPLOYEE_CREATE: 'employee:create',
  EMPLOYEE_UPDATE: 'employee:update',
  EMPLOYEE_DELETE: 'employee:delete',
  EMPLOYEE_STATUS: 'employee:status',
  EMPLOYEE_COMPENSATION: 'employee:compensation',
  EMPLOYEE_EXPORT: 'employee:export',

  // Organization structure
  ORG_PROFILE_READ: 'org:profile:read',
  ORG_PROFILE_WRITE: 'org:profile:write',
  ORG_DEPARTMENTS_MANAGE: 'org:departments:manage',
  ORG_DESIGNATIONS_MANAGE: 'org:designations:manage',
  ORG_LOCATIONS_MANAGE: 'org:locations:manage',
  ORG_COST_CENTERS_MANAGE: 'org:cost_centers:manage',

  // User accounts & security governance
  USERS_READ: 'users:read',
  USERS_INVITE: 'users:invite',
  USERS_MANAGE: 'users:manage',
  ROLES_MANAGE: 'roles:manage',
  SECURITY_POLICY_MANAGE: 'security:policy:manage',

  // Audit & compliance
  AUDIT_READ: 'audit:read',
  AUDIT_EXPORT: 'audit:export',
  AUDIT_LOGIN_HISTORY: 'audit:login_history',

  // Holidays & leave
  HOLIDAY_READ: 'holiday:read',
  HOLIDAY_MANAGE: 'holiday:manage',
  LEAVE_READ: 'leave:read',
  LEAVE_MANAGE: 'leave:manage',

  // Attendance
  ATTENDANCE_READ: 'attendance:read',
  ATTENDANCE_MANAGE: 'attendance:manage',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: string[] = Object.values(PERMISSIONS);

/**
 * Maps historical permission keys to their canonical replacements.
 *
 * Two legacy conventions existed: the coarse colon keys stored on seeded roles
 * (`employee:view`, `organization:manage`, …) and the dot keys that controllers
 * actually required (`employee.read`, `department.create`, …). Neither matched
 * the other, so granted permissions never satisfied a guard. Both are migrated
 * to the canonical catalog above on boot.
 */
export const LEGACY_PERMISSION_MAP: Record<string, string[]> = {
  // Legacy coarse keys previously stored on roles
  'employee:view': [PERMISSIONS.EMPLOYEE_READ],
  'organization:view': [PERMISSIONS.ORG_PROFILE_READ],
  'organization:manage': [
    PERMISSIONS.ORG_PROFILE_WRITE,
    PERMISSIONS.ORG_DEPARTMENTS_MANAGE,
    PERMISSIONS.ORG_DESIGNATIONS_MANAGE,
    PERMISSIONS.ORG_LOCATIONS_MANAGE,
    PERMISSIONS.ORG_COST_CENTERS_MANAGE,
  ],
  'user:view': [PERMISSIONS.USERS_READ],
  'user:manage': [
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.USERS_INVITE,
    PERMISSIONS.ROLES_MANAGE,
    PERMISSIONS.SECURITY_POLICY_MANAGE,
  ],
  'audit:view': [PERMISSIONS.AUDIT_READ],

  // Legacy dot-notation keys previously required by controllers
  'employee.read': [PERMISSIONS.EMPLOYEE_READ],
  'employee.create': [PERMISSIONS.EMPLOYEE_CREATE],
  'employee.update': [PERMISSIONS.EMPLOYEE_UPDATE],
  'employee.delete': [PERMISSIONS.EMPLOYEE_DELETE],
  'organization.read': [PERMISSIONS.ORG_PROFILE_READ],
  'organization.update': [PERMISSIONS.ORG_PROFILE_WRITE],
  'department.read': [PERMISSIONS.ORG_PROFILE_READ],
  'department.create': [PERMISSIONS.ORG_DEPARTMENTS_MANAGE],
  'department.update': [PERMISSIONS.ORG_DEPARTMENTS_MANAGE],
  'department.delete': [PERMISSIONS.ORG_DEPARTMENTS_MANAGE],
  'department.manage_hierarchy': [PERMISSIONS.ORG_DEPARTMENTS_MANAGE],
  'designation.read': [PERMISSIONS.ORG_PROFILE_READ],
  'designation.create': [PERMISSIONS.ORG_DESIGNATIONS_MANAGE],
  'designation.update': [PERMISSIONS.ORG_DESIGNATIONS_MANAGE],
  'location.read': [PERMISSIONS.ORG_PROFILE_READ],
  'location.create': [PERMISSIONS.ORG_LOCATIONS_MANAGE],
  'location.update': [PERMISSIONS.ORG_LOCATIONS_MANAGE],
  'cost_center.read': [PERMISSIONS.ORG_PROFILE_READ],
  'cost_center.create': [PERMISSIONS.ORG_COST_CENTERS_MANAGE],
  'cost_center.update': [PERMISSIONS.ORG_COST_CENTERS_MANAGE],
};

/**
 * Rewrites a permission list to canonical keys. Unknown keys and the `*`
 * wildcard are preserved as-is. Returns null when nothing changed, so callers
 * can skip pointless database writes.
 */
export function migrateLegacyPermissionKeys(permissions: string[]): string[] | null {
  if (!Array.isArray(permissions) || permissions.length === 0) return null;

  let changed = false;
  const migrated = new Set<string>();

  for (const permission of permissions) {
    const replacements = LEGACY_PERMISSION_MAP[permission];
    if (replacements) {
      changed = true;
      replacements.forEach((r) => migrated.add(r));
    } else {
      migrated.add(permission);
    }
  }

  return changed ? Array.from(migrated) : null;
}
