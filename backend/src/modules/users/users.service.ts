import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Role, RoleDocument } from './schemas/role.schema';
import { SecurityPolicy, SecurityPolicyDocument } from './schemas/security-policy.schema';
import { Invitation, InvitationDocument, InvitationStatus } from './schemas/invitation.schema';
import { Employee, EmployeeDocument } from '../employees/schemas/employee.schema';
import { AuditService } from '../../common/audit/audit.service';
import { AuditAction, AuditResource } from '../../common/audit/audit.constants';
import { MailService } from '../mail/mail.service';
import { AuthService } from '../auth/auth.service';
import {
  UpdateUserStatusDto,
  AssignRolesDto,
  CreateRoleDto,
  UpdateRoleDto,
  UpdateSecurityPolicyDto,
} from './dto/users.dto';
import {
  UserStatus,
  UserRole,
  PERMISSIONS,
  ALL_PERMISSIONS,
  migrateLegacyPermissionKeys,
} from '../../common/constants';
import { DEFAULT_SECURITY_POLICY } from '../../common/utils/password-policy.util';
import { randomBytes, randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { extname, join, resolve } from 'path';

export const DEFAULT_PERMISSIONS: string[] = ALL_PERMISSIONS;

const DEFAULT_SYSTEM_ROLES = [
  {
    name: 'Super Administrator',
    code: UserRole.SUPER_ADMIN.toLowerCase(),
    description: 'Full uninhibited master governance across all domains and settings.',
    isSystem: true,
    permissions: ALL_PERMISSIONS,
  },
  {
    name: 'HR Administrator',
    code: UserRole.HR_ADMIN.toLowerCase(),
    description: 'Full operational control over employees, documents, organization, and workforce.',
    isSystem: true,
    permissions: [
      PERMISSIONS.EMPLOYEE_READ,
      PERMISSIONS.EMPLOYEE_CREATE,
      PERMISSIONS.EMPLOYEE_UPDATE,
      PERMISSIONS.EMPLOYEE_DELETE,
      PERMISSIONS.EMPLOYEE_STATUS,
      PERMISSIONS.EMPLOYEE_COMPENSATION,
      PERMISSIONS.EMPLOYEE_EXPORT,
      PERMISSIONS.ORG_PROFILE_READ,
      PERMISSIONS.ORG_PROFILE_WRITE,
      PERMISSIONS.ORG_DEPARTMENTS_MANAGE,
      PERMISSIONS.ORG_DESIGNATIONS_MANAGE,
      PERMISSIONS.ORG_LOCATIONS_MANAGE,
      PERMISSIONS.ORG_COST_CENTERS_MANAGE,
      PERMISSIONS.USERS_READ,
      PERMISSIONS.AUDIT_READ,
    ],
  },
  {
    name: 'Department Manager',
    code: UserRole.MANAGER.toLowerCase(),
    description: 'Supervisory oversight for departmental subordinates and direct reports.',
    isSystem: true,
    permissions: [PERMISSIONS.EMPLOYEE_READ, PERMISSIONS.ORG_PROFILE_READ],
  },
  {
    name: 'Standard Employee',
    code: UserRole.EMPLOYEE.toLowerCase(),
    description: 'Self-service profile access, credentials management, and personal records.',
    isSystem: true,
    permissions: [PERMISSIONS.EMPLOYEE_READ],
  },
];

export interface EnrichedUser {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  roles: string[];
  permissions: string[];
  departmentScope: string[];
  failedLoginAttempts: number;
  lockedUntil?: Date | null;
  lastLoginAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  linkedEmployee?: {
    _id: string;
    employeeCode: string;
    displayName: string;
    avatarUrl?: string;
  } | null;
}

export interface PaginatedUsersResponse {
  data: EnrichedUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable()
export class UsersService implements OnModuleInit {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Role.name) private readonly roleModel: Model<RoleDocument>,
    @InjectModel(SecurityPolicy.name) private readonly policyModel: Model<SecurityPolicyDocument>,
    @InjectModel(Invitation.name) private readonly invitationModel: Model<InvitationDocument>,
    @InjectModel(Employee.name) private readonly employeeModel: Model<EmployeeDocument>,
    private readonly mailService: MailService,
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  private async audit(
    orgId: string | null | undefined,
    actorId: string | null | undefined,
    entityId: string,
    action: AuditAction,
    before: any = null,
    after: any = null,
    description = '',
    resourceType: AuditResource = AuditResource.USER,
  ) {
    await this.auditService.record({
      action,
      resourceType,
      resourceId: entityId,
      organizationId: orgId,
      actorUserId: actorId,
      description,
      before,
      after,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.seedDefaultRoles();
    await this.migrateLegacyPermissions();
    await this.seedDefaultSecurityPolicy();
  }

  private async seedDefaultRoles(): Promise<void> {
    for (const roleDef of DEFAULT_SYSTEM_ROLES) {
      const exists = await this.roleModel.findOne({ code: roleDef.code });
      if (!exists) {
        await this.roleModel.create(roleDef);
        this.logger.log(`Seeded system role: ${roleDef.name} (${roleDef.code})`);
      }
    }
  }

  /**
   * Rewrites any role/user still holding pre-catalog permission keys (the old
   * coarse `employee:view` style, or the dot-notation keys controllers used to
   * require) onto the canonical catalog. Idempotent — a no-op once migrated.
   */
  private async migrateLegacyPermissions(): Promise<void> {
    let migratedRoles = 0;
    let migratedUsers = 0;

    const roles = await this.roleModel.find().lean();
    for (const role of roles) {
      const migrated = migrateLegacyPermissionKeys(role.permissions || []);
      if (migrated) {
        await this.roleModel.updateOne({ _id: role._id }, { $set: { permissions: migrated } });
        migratedRoles++;
      }
    }

    const users = await this.userModel.find({ permissions: { $ne: [] } }).lean();
    for (const user of users) {
      const migrated = migrateLegacyPermissionKeys(user.permissions || []);
      if (migrated) {
        await this.userModel.updateOne({ _id: user._id }, { $set: { permissions: migrated } });
        migratedUsers++;
      }
    }

    if (migratedRoles || migratedUsers) {
      this.logger.log(
        `Migrated legacy permission keys on ${migratedRoles} role(s) and ${migratedUsers} user(s)`,
      );
    }

    // Super Administrator is documented as unconstrained and its matrix is
    // read-only in the UI, so it must always hold the full catalog — including
    // permissions introduced after it was first seeded. Other system roles are
    // left alone because their matrices are legitimately customisable.
    const superAdminCode = UserRole.SUPER_ADMIN.toLowerCase();
    const superAdmin = await this.roleModel.findOne({ code: superAdminCode }).lean();
    if (superAdmin) {
      const missing = ALL_PERMISSIONS.filter((p) => !(superAdmin.permissions || []).includes(p));
      if (missing.length > 0) {
        await this.roleModel.updateOne(
          { code: superAdminCode },
          { $set: { permissions: ALL_PERMISSIONS } },
        );
        this.logger.log(
          `Granted ${missing.length} newly-added permission(s) to the Super Administrator role`,
        );
      }
    }
  }

  private async seedDefaultSecurityPolicy(): Promise<void> {
    const exists = await this.policyModel.findOne();
    if (!exists) {
      await this.policyModel.create(DEFAULT_SECURITY_POLICY);
      this.logger.log('Seeded default platform security policy');
    }
  }

  // --- USER ROSTER OPERATIONS ---

  async findAllUsers(query: {
    search?: string;
    role?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedUsersResponse> {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const filter: any = { isDeleted: false };

    if (query.status && query.status !== 'ALL') {
      filter.status = query.status;
    }

    if (query.role && query.role !== 'ALL') {
      filter.roles = query.role;
    }

    if (query.search && query.search.trim()) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { email: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
      ];
    }

    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
      this.userModel.countDocuments(filter),
    ]);

    const userEmails = users.map((u) => u.email);
    const employees = await this.employeeModel
      .find({
        $or: [
          { workEmail: { $in: userEmails } },
          { personalEmail: { $in: userEmails } },
          { userId: { $in: users.map((u) => u._id) } },
        ],
        isDeleted: false,
      })
      .select('_id employeeCode firstName lastName displayName avatarUrl')
      .lean();

    const enrichedUsers: EnrichedUser[] = users.map((u: any) => {
      const linkedEmp = employees.find(
        (e: any) => e.userId === u._id || e.workEmail === u.email || e.personalEmail === u.email,
      );
      return {
        _id: u._id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        status: u.status,
        roles: u.roles || [],
        permissions: u.permissions || [],
        departmentScope: u.departmentScope || [],
        failedLoginAttempts: u.failedLoginAttempts || 0,
        lockedUntil: u.lockedUntil,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        linkedEmployee: linkedEmp
          ? {
              _id: linkedEmp._id,
              employeeCode: linkedEmp.employeeCode,
              displayName: linkedEmp.displayName || `${linkedEmp.firstName} ${linkedEmp.lastName}`,
              avatarUrl: linkedEmp.avatarUrl,
            }
          : null,
      };
    });

    return {
      data: enrichedUsers,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async updateUserStatus(
    userId: string,
    dto: UpdateUserStatusDto,
    actorId?: string,
  ): Promise<{ message: string }> {
    const user = await this.userModel.findById(userId);
    if (!user || user.isDeleted) {
      throw new NotFoundException('User record not found');
    }

    const previousStatus = user.status;
    user.status = dto.status;
    await user.save();

    await this.audit(
      user.organizationId,
      actorId,
      userId,
      dto.status === UserStatus.SUSPENDED ? AuditAction.SUSPEND : AuditAction.ACTIVATE,
      { status: previousStatus },
      { status: dto.status },
    );

    return { message: `User status updated to ${dto.status}` };
  }

  async unlockUser(userId: string, actorId?: string): Promise<{ message: string }> {
    const user = await this.userModel.findById(userId);
    if (!user || user.isDeleted) {
      throw new NotFoundException('User record not found');
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = null as any;
    if (user.status === UserStatus.LOCKED) {
      user.status = UserStatus.ACTIVE;
    }
    await user.save();

    await this.audit(user.organizationId, actorId, userId, AuditAction.ACCOUNT_UNLOCKED, null, null, `Unlocked account ${user.email}`);

    return { message: `User account for ${user.email} has been unlocked successfully.` };
  }

  async assignRoles(
    userId: string,
    dto: AssignRolesDto,
    actorId?: string,
  ): Promise<{ message: string; roles: string[] }> {
    const user = await this.userModel.findById(userId);
    if (!user || user.isDeleted) {
      throw new NotFoundException('User record not found');
    }

    // Resolve every known Role document so we can compare by canonical code
    // (roles get assigned by display name from the UI, but seeded via the
    // UserRole enum literal — both must resolve to the same identity here).
    const allRoles = await this.roleModel.find().lean();
    const identifiersFor = (role: (typeof allRoles)[number]) => [
      role.name,
      role.code,
      role.code.toUpperCase(),
    ];
    const superAdminRole = allRoles.find((r) => r.code === UserRole.SUPER_ADMIN.toLowerCase());
    const superAdminIdentifiers = new Set(
      superAdminRole ? [...identifiersFor(superAdminRole), UserRole.SUPER_ADMIN] : [UserRole.SUPER_ADMIN],
    );

    const hadSuperAdmin = user.roles.some((r) => superAdminIdentifiers.has(r));
    const willHaveSuperAdmin = dto.roles.some((r) => superAdminIdentifiers.has(r));

    if (hadSuperAdmin && !willHaveSuperAdmin) {
      const remainingSuperAdmins = await this.userModel.countDocuments({
        _id: { $ne: userId },
        roles: { $in: Array.from(superAdminIdentifiers) },
        isDeleted: false,
        status: { $ne: UserStatus.INACTIVE },
      });
      if (remainingSuperAdmins === 0) {
        throw new BadRequestException(
          'Cannot remove the last remaining Super Administrator from the organization.',
        );
      }
    }

    // Keep user.permissions in sync with the permission sets of the assigned
    // roles so PermissionsGuard checks work regardless of how roles were granted.
    const matchedRoles = allRoles.filter((role) =>
      dto.roles.some((assigned) => identifiersFor(role).includes(assigned)),
    );
    const mergedPermissions = matchedRoles.some((r) => r.permissions.includes('*'))
      ? ['*']
      : Array.from(new Set(matchedRoles.flatMap((r) => r.permissions)));

    const previousRoles = user.roles;
    const previousScope = user.departmentScope || [];
    user.roles = dto.roles;
    user.permissions = mergedPermissions;
    if (dto.departmentScope !== undefined) {
      user.departmentScope = dto.departmentScope;
    }
    await user.save();

    await this.audit(
      user.organizationId,
      actorId,
      userId,
      AuditAction.ROLE_ASSIGNED,
      { roles: previousRoles, departmentScope: previousScope },
      { roles: dto.roles, departmentScope: user.departmentScope || [] },
    );

    return { message: 'Roles assigned successfully', roles: user.roles };
  }

  async sendPasswordReset(userId: string, actorId?: string): Promise<{ message: string }> {
    const user = await this.userModel.findById(userId);
    if (!user || user.isDeleted) {
      throw new NotFoundException('User record not found');
    }

    const resetToken = randomBytes(32).toString('hex');
    await this.mailService.sendPasswordResetLink(
      user.email,
      resetToken,
      user.firstName || 'Employee',
    );

    await this.audit(user.organizationId, actorId, userId, AuditAction.PASSWORD_RESET_REQUESTED, null, null, `Dispatched password reset to ${user.email}`);

    return { message: `Password reset instructions sent to ${user.email}` };
  }

  async terminateSessions(userId: string, actorId?: string): Promise<{ message: string }> {
    const user = await this.userModel.findById(userId);
    if (!user || user.isDeleted) {
      throw new NotFoundException('User record not found');
    }

    const result = await this.authService.logoutAll(userId);
    await this.audit(user.organizationId, actorId, userId, AuditAction.SESSION_REVOKED, null, null, `Terminated all sessions for ${user.email}`);

    return { message: `All active sessions for ${user.email} have been terminated. ${result.message}` };
  }

  async getMetrics(): Promise<{
    totalActive: number;
    pendingInvitations: number;
    suspended: number;
    locked: number;
    activeAdminsAndManagers: number;
  }> {
    const [totalActive, pendingInvitations, suspended, locked, activeAdminsAndManagers] = await Promise.all([
      this.userModel.countDocuments({ status: UserStatus.ACTIVE, isDeleted: false }),
      this.invitationModel.countDocuments({ status: InvitationStatus.PENDING }),
      this.userModel.countDocuments({ status: UserStatus.SUSPENDED, isDeleted: false }),
      this.userModel.countDocuments({ status: UserStatus.LOCKED, isDeleted: false }),
      this.userModel.countDocuments({
        isDeleted: false,
        status: UserStatus.ACTIVE,
        roles: {
          $in: [
            UserRole.SUPER_ADMIN,
            UserRole.HR_ADMIN,
            UserRole.MANAGER,
            UserRole.SUPER_ADMIN.toLowerCase(),
            UserRole.HR_ADMIN.toLowerCase(),
            UserRole.MANAGER.toLowerCase(),
          ],
        },
      }),
    ]);

    return { totalActive, pendingInvitations, suspended, locked, activeAdminsAndManagers };
  }

  // --- ROLES & PERMISSIONS OPERATIONS ---

  async getRoles(): Promise<any[]> {
    const roles = await this.roleModel.find().sort({ isSystem: -1, name: 1 }).lean();

    const enriched = await Promise.all(
      roles.map(async (role) => {
        const count = await this.userModel.countDocuments({
          roles: { $in: [role.name, role.code.toUpperCase(), role.code] },
          isDeleted: false,
        });
        return {
          ...role,
          userCount: count,
        };
      }),
    );

    return enriched;
  }

  async getRoleById(roleId: string): Promise<any> {
    const role = await this.roleModel.findById(roleId).lean();
    if (!role) throw new NotFoundException('Role not found');
    const count = await this.userModel.countDocuments({
      roles: { $in: [role.name, role.code.toUpperCase(), role.code] },
      isDeleted: false,
    });
    return { ...role, userCount: count };
  }

  async createRole(dto: CreateRoleDto): Promise<Role> {
    const code = dto.code.trim().toLowerCase().replace(/\s+/g, '_');
    const existing = await this.roleModel.findOne({ code });
    if (existing) {
      throw new BadRequestException(`Role with code '${code}' already exists`);
    }

    const created = await this.roleModel.create({
      name: dto.name.trim(),
      code,
      description: dto.description?.trim() || '',
      permissions: dto.permissions || [],
      isSystem: false,
    });

    return created;
  }

  async updateRole(roleId: string, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.roleModel.findById(roleId);
    if (!role) throw new NotFoundException('Role not found');

    if (dto.name) role.name = dto.name.trim();
    if (dto.description !== undefined) role.description = dto.description.trim();
    if (dto.permissions) role.permissions = dto.permissions;

    await role.save();
    return role;
  }

  async deleteRole(roleId: string): Promise<{ message: string }> {
    const role = await this.roleModel.findById(roleId);
    if (!role) throw new NotFoundException('Role not found');

    if (role.isSystem) {
      throw new BadRequestException('Built-in system roles cannot be deleted');
    }

    const assignedCount = await this.userModel.countDocuments({
      roles: { $in: [role.name, role.code.toUpperCase(), role.code] },
      isDeleted: false,
    });

    if (assignedCount > 0) {
      throw new BadRequestException(
        `Cannot delete role '${role.name}' because it is currently assigned to ${assignedCount} user(s). Reassign them first.`,
      );
    }

    await this.roleModel.deleteOne({ _id: roleId });
    return { message: `Role '${role.name}' has been deleted.` };
  }

  // --- SECURITY POLICIES ---

  async getSecurityPolicy(): Promise<SecurityPolicy> {
    let policy = await this.policyModel.findOne().lean();
    if (!policy) {
      policy = await this.policyModel.create(DEFAULT_SECURITY_POLICY);
    }
    return policy as SecurityPolicy;
  }

  async updateSecurityPolicy(dto: UpdateSecurityPolicyDto, actorId?: string): Promise<SecurityPolicy> {
    let policy = await this.policyModel.findOne();
    if (!policy) {
      policy = new this.policyModel();
    }

    const before = policy.toObject();
    Object.assign(policy, dto);
    await policy.save();

    await this.audit(undefined, actorId, String(policy._id), AuditAction.UPDATE, before, dto, 'Updated organization security policy', AuditResource.SECURITY_POLICY);

    return policy;
  }

  // --- PROFILE & AVATAR MANAGEMENT ---

  async uploadAvatar(
    userId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ): Promise<{ avatarUrl: string }> {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only JPG, PNG, WEBP and GIF image formats are supported.');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Image size cannot exceed 5MB.');
    }

    const uploadsDir = resolve(process.cwd(), 'uploads', 'avatars');
    await mkdir(uploadsDir, { recursive: true });

    const ext = extname(file.originalname).toLowerCase() || '.jpg';
    const filename = `${userId}-${randomUUID()}${ext}`;
    const filePath = join(uploadsDir, filename);

    await writeFile(filePath, file.buffer);

    const avatarUrl = `/api/v1/users/avatar/${filename}`;

    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found.');

    const oldAvatar = user.avatarUrl;
    user.avatarUrl = avatarUrl;
    await user.save();

    // Also update linked Employee record if it exists
    await this.employeeModel.updateOne(
      { $or: [{ userId }, { workEmail: user.email }] },
      { $set: { avatarUrl } },
    );

    // Clean up old local avatar
    if (oldAvatar && oldAvatar.startsWith('/api/v1/users/avatar/')) {
      const oldFilename = oldAvatar.replace('/api/v1/users/avatar/', '');
      const oldPath = join(uploadsDir, oldFilename);
      if (existsSync(oldPath)) {
        await unlink(oldPath).catch(() => {});
      }
    }

    return { avatarUrl };
  }

  async removeAvatar(userId: string): Promise<{ message: string }> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found.');

    const oldAvatar = user.avatarUrl;
    user.avatarUrl = undefined;
    await user.save();

    await this.employeeModel.updateOne(
      { $or: [{ userId }, { workEmail: user.email }] },
      { $unset: { avatarUrl: 1 } },
    );

    if (oldAvatar && oldAvatar.startsWith('/api/v1/users/avatar/')) {
      const uploadsDir = resolve(process.cwd(), 'uploads', 'avatars');
      const oldFilename = oldAvatar.replace('/api/v1/users/avatar/', '');
      const oldPath = join(uploadsDir, oldFilename);
      if (existsSync(oldPath)) {
        await unlink(oldPath).catch(() => {});
      }
    }

    return { message: 'Profile avatar removed successfully.' };
  }

  getAvatarFilePath(filename: string): string {
    const safeFilename = filename.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const uploadsDir = resolve(process.cwd(), 'uploads', 'avatars');
    const fullPath = join(uploadsDir, safeFilename);

    if (!existsSync(fullPath)) {
      throw new NotFoundException('Avatar image not found.');
    }
    return fullPath;
  }

  async updateProfile(
    userId: string,
    dto: { firstName?: string; lastName?: string; phone?: string; location?: string; bio?: string },
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found.');

    if (dto.firstName) user.firstName = dto.firstName;
    if (dto.lastName) user.lastName = dto.lastName;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.location !== undefined) user.location = dto.location;
    if (dto.bio !== undefined) user.bio = dto.bio;

    await user.save();

    const employeeUpdates: any = {};
    if (dto.firstName) employeeUpdates.firstName = dto.firstName;
    if (dto.lastName) employeeUpdates.lastName = dto.lastName;
    if (dto.phone) employeeUpdates.phone = dto.phone;
    if (Object.keys(employeeUpdates).length > 0) {
      await this.employeeModel.updateOne(
        { $or: [{ userId }, { workEmail: user.email }] },
        { $set: employeeUpdates },
      );
    }

    return {
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        permissions: user.permissions,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        location: user.location,
        bio: user.bio,
      },
    };
  }

  async getMyProfile(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found.');

    const linkedEmp = await this.employeeModel
      .findOne({ $or: [{ userId }, { workEmail: user.email }] })
      .select('employeeCode phone avatarUrl')
      .lean();

    return {
      id: user._id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`.trim(),
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
      permissions: user.permissions,
      avatarUrl: user.avatarUrl || linkedEmp?.avatarUrl || null,
      phone: user.phone || linkedEmp?.phone || null,
      location: user.location || 'San Francisco',
      bio: user.bio || null,
      department: 'Engineering',
      designation: 'Front-End Developer',
      employeeCode: linkedEmp?.employeeCode || 'EMP000001',
    };
  }
}
