import type { AuthUser } from '../../auth/api/auth.api';

/** HR/Admin/Manager style HR check used across employee screens. */
export function isHrOrAdmin(user: AuthUser | null): boolean {
  if (!user) return false;
  return Boolean(
    user.roles?.some((r) =>
      ['ADMIN', 'HR', 'HR_ADMIN', 'SUPER_ADMIN', 'ORG_ADMIN', 'Admin', 'HR Manager', 'HR Admin'].includes(r),
    ) ||
      user.permissions?.includes('EMPLOYEE_UPDATE') ||
      user.permissions?.includes('EMPLOYEE_CREATE'),
  );
}

/** May assign login roles (HR Admin access) to an employee file. */
export function canAssignRoles(user: AuthUser | null): boolean {
  if (!user) return false;
  return Boolean(
    user.roles?.some((r) => r.toUpperCase() === 'SUPER_ADMIN') ||
      user.permissions?.includes('*') ||
      user.permissions?.includes('users:manage'),
  );
}

/** May edit employment attributes (manager, designation, department…). */
export function canEditEmployment(user: AuthUser | null): boolean {
  if (!user) return false;
  return Boolean(
    user.roles?.some((r) =>
      ['SUPER_ADMIN', 'HR_ADMIN', 'ADMIN', 'HR', 'ORG_ADMIN'].includes(r.toUpperCase()),
    ) ||
      user.permissions?.includes('*') ||
      user.permissions?.includes('employee:update'),
  );
}
