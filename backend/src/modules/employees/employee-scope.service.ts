import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Employee, EmployeeDocument } from './schemas/employee.schema';
import { Department, DepartmentDocument } from '../organization/schemas/department.schema';
import { Role, RoleDocument } from '../users/schemas/role.schema';
import { UserRole } from '../../common/constants';
import { LoggerHelper } from '../../common/logger';

/** The authenticated principal as attached to the request by JwtStrategy. */
export interface RequestUser {
  userId: string;
  email?: string;
  roles?: string[];
  permissions?: string[];
  departmentScope?: string[];
  organizationId?: string | null;
}

/**
 * Resolves which departments a given user is allowed to see employee data for.
 *
 * `null` means unrestricted. An array means "only employees in these
 * departments" — already expanded to include descendant departments.
 */
@Injectable()
export class EmployeeScopeService {
  private readonly logger = LoggerHelper.Instance.child(EmployeeScopeService.name);

  constructor(
    @InjectModel(Employee.name) private readonly empModel: Model<EmployeeDocument>,
    @InjectModel(Department.name) private readonly deptModel: Model<DepartmentDocument>,
    @InjectModel(Role.name) private readonly roleModel: Model<RoleDocument>,
  ) {}

  /**
   * Builds the set of identifier strings that resolve to a given system role,
   * covering both the display name (assigned via the UI) and the enum literal
   * (assigned by the seed script).
   */
  private async identifiersForRole(code: string, enumLiteral: string): Promise<Set<string>> {
    const role = await this.roleModel.findOne({ code }).lean();
    return new Set(
      role ? [role.name, role.code, role.code.toUpperCase(), enumLiteral] : [enumLiteral, code],
    );
  }

  /** Expands a set of department ids to also include all descendant departments. */
  async expandWithDescendants(departmentIds: string[], orgId: string): Promise<string[]> {
    if (departmentIds.length === 0) return [];

    const departments = await this.deptModel
      .find({ organizationId: orgId, isDeleted: false }, '_id parentId')
      .lean();

    const childrenByParent = new Map<string, string[]>();
    for (const dept of departments) {
      const parent = dept.parentId ? String(dept.parentId) : null;
      if (!parent) continue;
      if (!childrenByParent.has(parent)) childrenByParent.set(parent, []);
      childrenByParent.get(parent)!.push(String(dept._id));
    }

    const resolved = new Set<string>();
    const queue = [...departmentIds];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (resolved.has(current)) continue; // also guards against cyclic parent links
      resolved.add(current);
      for (const child of childrenByParent.get(current) || []) {
        if (!resolved.has(child)) queue.push(child);
      }
    }

    return Array.from(resolved);
  }

  /**
   * Returns the department ids this user may see employees for, or null when
   * unrestricted.
   *
   * Precedence:
   *  1. Super Admin role or `*` permission -> unrestricted.
   *  2. HR Admin role -> unrestricted (org-wide by design).
   *  3. Explicit `departmentScope` on the user -> that scope (+ descendants).
   *  4. Department Manager role -> their own linked employee's department
   *     (+ descendants). A manager with no linked employee record, or whose
   *     record has no department, sees nothing rather than everything.
   *  5. Anyone else -> unrestricted (unchanged pre-existing behaviour).
   */
  async resolveDepartmentScope(user: RequestUser, orgId: string): Promise<string[] | null> {
    if (!user) return null;

    const roles = user.roles || [];
    const permissions = user.permissions || [];

    if (permissions.includes('*')) return null;

    const superAdminIds = await this.identifiersForRole(
      UserRole.SUPER_ADMIN.toLowerCase(),
      UserRole.SUPER_ADMIN,
    );
    if (roles.some((r) => superAdminIds.has(r))) return null;

    const hrAdminIds = await this.identifiersForRole(
      UserRole.HR_ADMIN.toLowerCase(),
      UserRole.HR_ADMIN,
    );
    if (roles.some((r) => hrAdminIds.has(r))) return null;

    if (user.departmentScope && user.departmentScope.length > 0) {
      return this.expandWithDescendants(user.departmentScope, orgId);
    }

    const managerIds = await this.identifiersForRole(
      UserRole.MANAGER.toLowerCase(),
      UserRole.MANAGER,
    );
    if (roles.some((r) => managerIds.has(r))) {
      const linkedEmployee = await this.empModel
        .findOne(
          {
            organizationId: orgId,
            isDeleted: false,
            $or: [{ userId: user.userId }, { workEmail: user.email }],
          },
          'departmentId',
        )
        .lean();

      const departmentId = linkedEmployee?.departmentId;
      if (!departmentId) {
        this.logger.warn(null, 'Manager has no linked employee department; scoping to nothing', {
          userId: user.userId,
          email: user.email,
        });
        return [];
      }

      return this.expandWithDescendants([String(departmentId)], orgId);
    }

    return null;
  }

  /** Convenience guard: is this employee record inside the user's scope? */
  async isEmployeeInScope(
    employeeDepartmentId: string | null | undefined,
    user: RequestUser,
    orgId: string,
  ): Promise<boolean> {
    const scope = await this.resolveDepartmentScope(user, orgId);
    if (scope === null) return true;
    if (!employeeDepartmentId) return false;
    return scope.includes(String(employeeDepartmentId));
  }
}
