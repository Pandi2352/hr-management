import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Employee, EmployeeDocument } from './schemas/employee.schema';
import { Department, DepartmentDocument } from '../organization/schemas/department.schema';
import { Designation, DesignationDocument } from '../organization/schemas/designation.schema';
import { Location, LocationDocument } from '../organization/schemas/location.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { AuditService } from '../../common/audit/audit.service';
import { AuditAction, AuditResource } from '../../common/audit/audit.constants';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeQueryDto,
  ChangeEmployeeStatusDto,
} from './dto/employee.dto';
import { paginate } from '../../common/pagination/pagination.util';
import { generateUuid } from '../../common/utils/uuid.util';
import { EmployeeProvisioningService } from './employee-provisioning.service';
import { EmployeeScopeService, type RequestUser } from './employee-scope.service';
import { DocumentStorageService } from './document-storage.service';
import { resolve, join, extname } from 'path';
import { existsSync } from 'fs';
import { mkdir, writeFile, unlink } from 'fs/promises';
import { randomUUID } from 'crypto';

/** Maps an employee lifecycle status onto the canonical audit action. */
function statusAuditAction(status: string): AuditAction {
  switch (status) {
    case 'ACTIVE':
      return AuditAction.ACTIVATE;
    case 'SUSPENDED':
      return AuditAction.SUSPEND;
    case 'TERMINATED':
    case 'RESIGNED':
      return AuditAction.TERMINATE;
    case 'INACTIVE':
      return AuditAction.DEACTIVATE;
    default:
      return AuditAction.UPDATE;
  }
}

@Injectable()
export class EmployeesService {
  constructor(
    @InjectModel(Employee.name) private empModel: Model<EmployeeDocument>,
    @InjectModel(Department.name) private deptModel: Model<DepartmentDocument>,
    @InjectModel(Designation.name) private desigModel: Model<DesignationDocument>,
    @InjectModel(Location.name) private locModel: Model<LocationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly provisioningService: EmployeeProvisioningService,
    private readonly scopeService: EmployeeScopeService,
    private readonly auditService: AuditService,
    private readonly storageService: DocumentStorageService,
  ) {}

  /**
   * Narrows a Mongo filter to the departments the requesting user may see.
   * Managers restricted to departments they don't currently filter by get an
   * intersection, so they can never widen their own visibility via query params.
   */
  private async applyDepartmentScope(
    filter: any,
    orgId: string,
    scopeUser?: RequestUser,
  ): Promise<void> {
    if (!scopeUser) return;

    const scope = await this.scopeService.resolveDepartmentScope(scopeUser, orgId);
    if (scope === null) return;

    if (filter.departmentId && typeof filter.departmentId === 'string') {
      // An explicit ?departmentId= filter is only honoured if it's within scope.
      filter.departmentId = scope.includes(filter.departmentId)
        ? filter.departmentId
        : { $in: [] };
      return;
    }

    filter.departmentId = { $in: scope };
  }

  /** Throws if the given employee sits outside the requesting user's department scope. */
  private async assertEmployeeInScope(
    employee: { departmentId?: string | null },
    orgId: string,
    scopeUser?: RequestUser,
  ): Promise<void> {
    if (!scopeUser) return;

    const allowed = await this.scopeService.isEmployeeInScope(
      employee.departmentId,
      scopeUser,
      orgId,
    );
    if (!allowed) {
      throw new ForbiddenException(
        'This employee record is outside the departments you are permitted to access.',
      );
    }
  }

  private async audit(
    orgId: string,
    userId: string,
    action: AuditAction,
    entityId: string,
    before: any = null,
    after: any = null,
    description = '',
  ) {
    await this.auditService.record({
      action,
      resourceType: AuditResource.EMPLOYEE,
      resourceId: entityId,
      organizationId: orgId,
      actorUserId: userId,
      actorEmployeeId: entityId,
      description,
      before,
      after,
    });
  }

  // 1. LIST WITH PAGINATION, MULTI-FILTERS & SEARCH
  async getEmployees(orgId: string, query: EmployeeQueryDto, scopeUser?: RequestUser) {
    const filter: any = { organizationId: orgId, isDeleted: false };

    if (query.departmentId && query.departmentId !== 'ALL') {
      filter.departmentId = query.departmentId;
    }
    if (query.designationId && query.designationId !== 'ALL') {
      filter.designationId = query.designationId;
    }
    if (query.locationId && query.locationId !== 'ALL') {
      filter.locationId = query.locationId;
    }
    if (query.status && query.status !== 'ALL') {
      filter.status = query.status;
    }
    if (query.employmentType && query.employmentType !== 'ALL') {
      filter.employmentType = query.employmentType;
    }

    if (query.search && query.search.trim()) {
      const q = query.search.trim();
      const regex = new RegExp(q, 'i');
      filter.$or = [
        { firstName: regex },
        { lastName: regex },
        { displayName: regex },
        { employeeCode: regex },
        { workEmail: regex },
        { personalEmail: regex },
      ];
    }

    await this.applyDepartmentScope(filter, orgId, scopeUser);

    const result = await paginate<Employee>(
      this.empModel,
      filter,
      {
        page: query.page,
        pageSize: query.pageSize,
      },
      { createdAt: -1 },
    );

    // Populate relations for the paginated slice
    const departmentIds = [...new Set(result.data.map((e) => e.departmentId).filter(Boolean))];
    const designationIds = [...new Set(result.data.map((e) => e.designationId).filter(Boolean))];
    const locationIds = [...new Set(result.data.map((e) => e.locationId).filter(Boolean))];
    const managerIds = [...new Set(result.data.map((e) => e.managerId).filter(Boolean))];

    const [departments, designations, locations, managers] = await Promise.all([
      this.deptModel.find({ _id: { $in: departmentIds } }).lean(),
      this.desigModel.find({ _id: { $in: designationIds } }).lean(),
      this.locModel.find({ _id: { $in: locationIds } }).lean(),
      this.empModel.find({ _id: { $in: managerIds } }, 'firstName lastName displayName employeeCode avatarUrl').lean(),
    ]);

    const deptMap = new Map(departments.map((d) => [String(d._id), d.name]));
    const desigMap = new Map(designations.map((d) => [String(d._id), d.title]));
    const locMap = new Map(locations.map((l) => [String(l._id), l.name]));
    const managerMap = new Map(managers.map((m) => [String(m._id), m]));

    const enrichedData = result.data.map((emp) => {
      const json = JSON.parse(JSON.stringify(emp));
      return {
        ...json,
        departmentName: emp.departmentId ? deptMap.get(emp.departmentId) || null : null,
        designationTitle: emp.designationId ? desigMap.get(emp.designationId) || null : null,
        locationName: emp.locationId ? locMap.get(emp.locationId) || null : null,
        manager: emp.managerId ? managerMap.get(emp.managerId) || null : null,
      };
    });

    return {
      data: enrichedData,
      meta: result.meta,
    };
  }

  /**
   * Aggregated headcount figures for the dashboard.
   *
   * Uses server-side aggregation rather than counting a page of rows, and
   * honours the caller's department scope so a Manager's dashboard reflects
   * only their own subtree.
   */
  async getStats(orgId: string, scopeUser?: RequestUser) {
    const baseFilter: any = { organizationId: orgId, isDeleted: false };
    await this.applyDepartmentScope(baseFilter, orgId, scopeUser);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [total, statusRows, departmentRows, typeRows, newJoiners] = await Promise.all([
      this.empModel.countDocuments(baseFilter),
      this.empModel.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.empModel.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$departmentId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      this.empModel.aggregate([
        { $match: baseFilter },
        { $group: { _id: '$employmentType', count: { $sum: 1 } } },
      ]),
      // joiningDate is stored as an ISO `YYYY-MM-DD` string, so compare lexically.
      this.empModel.countDocuments({
        ...baseFilter,
        joiningDate: { $gte: startOfMonth.toISOString().slice(0, 10) },
      }),
    ]);

    const departments = await this.deptModel
      .find({ organizationId: orgId, isDeleted: false }, '_id name code')
      .lean();
    const deptMap = new Map(departments.map((d) => [String(d._id), d]));

    const toRecord = (rows: { _id: string | null; count: number }[]) =>
      rows.reduce<Record<string, number>>((acc, row) => {
        acc[row._id || 'UNASSIGNED'] = row.count;
        return acc;
      }, {});

    return {
      total,
      newJoinersThisMonth: newJoiners,
      departmentCount: departments.length,
      byStatus: toRecord(statusRows),
      byEmploymentType: toRecord(typeRows),
      byDepartment: departmentRows.map((row) => ({
        departmentId: row._id || null,
        name: row._id ? deptMap.get(String(row._id))?.name || 'Unknown' : 'Unassigned',
        code: row._id ? deptMap.get(String(row._id))?.code || '' : '',
        count: row.count,
      })),
    };
  }

  // 2. GET EMPLOYEE BY ID (SCOPED WITH TENANT ISOLATION)
  async getEmployeeById(id: string, orgId: string, scopeUser?: RequestUser): Promise<any> {
    const employee = await this.empModel
      .findOne({ _id: id, organizationId: orgId, isDeleted: false })
      .lean();

    if (!employee) {
      throw new NotFoundException('Employee not found or unauthorized');
    }

    await this.assertEmployeeInScope(employee, orgId, scopeUser);

    const [dept, desig, loc, manager, directReports, auditLogs] = await Promise.all([
      employee.departmentId ? this.deptModel.findOne({ _id: employee.departmentId }).lean() : null,
      employee.designationId ? this.desigModel.findOne({ _id: employee.designationId }).lean() : null,
      employee.locationId ? this.locModel.findOne({ _id: employee.locationId }).lean() : null,
      employee.managerId
        ? this.empModel.findOne({ _id: employee.managerId }, 'firstName lastName displayName employeeCode workEmail avatarUrl').lean()
        : null,
      this.empModel
        .find({ managerId: id, organizationId: orgId, isDeleted: false }, 'firstName lastName displayName employeeCode workEmail avatarUrl status designationId')
        .lean(),
      this.auditService.findForResource(AuditResource.EMPLOYEE, id, {
        organizationId: orgId,
        limit: 20,
      }),
    ]);

    return {
      ...employee,
      documents: (employee.documents || []).map((d) => this.toDocumentResponse(d)),
      department: dept,
      designation: desig,
      location: loc,
      manager,
      directReports,
      // findForResource returns a paginated envelope; the detail page wants the rows.
      auditLogs: auditLogs.data,
    };
  }

  // --- DOCUMENT VAULT ---------------------------------------------------

  /** Loads an employee, enforcing tenant and department scope. */
  private async getScopedEmployee(id: string, orgId: string, scopeUser?: RequestUser) {
    const employee = await this.empModel.findOne({
      _id: id,
      organizationId: orgId,
      isDeleted: false,
    });
    if (!employee) throw new NotFoundException('Employee not found');
    await this.assertEmployeeInScope(employee, orgId, scopeUser);
    return employee;
  }

  /**
   * `storageKey` is an internal filesystem path. Clients only ever get the
   * `fileUrl` download route, so it must never cross the API boundary.
   */
  private toDocumentResponse(doc: any) {
    const plain = typeof doc?.toObject === 'function' ? doc.toObject() : { ...doc };
    delete plain.storageKey;
    return plain;
  }

  async addDocument(
    id: string,
    orgId: string,
    userId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    meta: { title?: string; category?: string },
    scopeUser?: RequestUser,
  ) {
    const employee = await this.getScopedEmployee(id, orgId, scopeUser);

    this.storageService.validate(file);
    const storageKey = await this.storageService.save(id, file);

    const document = {
      id: generateUuid(),
      title: meta.title?.trim() || file.originalname,
      category: meta.category || 'GENERAL',
      fileUrl: `/employees/${id}/documents/`,
      storageKey,
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      uploadedAt: new Date(),
      uploadedBy: userId,
      verificationStatus: 'PENDING' as const,
      reviewNote: '',
      reviewedBy: '',
      reviewedAt: null,
    };
    document.fileUrl = `/employees/${id}/documents/${document.id}/download`;

    employee.documents = [...(employee.documents || []), document as any];
    await employee.save();

    await this.audit(
      orgId,
      userId,
      AuditAction.DOCUMENT_UPLOADED,
      id,
      null,
      null,
      `Uploaded "${document.title}" to ${employee.employeeCode}'s document vault`,
    );

    return this.toDocumentResponse(document);
  }

  async getDocumentForDownload(
    id: string,
    documentId: string,
    orgId: string,
    userId: string,
    scopeUser?: RequestUser,
  ) {
    const employee = await this.getScopedEmployee(id, orgId, scopeUser);
    const document: any = (employee.documents || []).find((d: any) => d.id === documentId);
    if (!document) throw new NotFoundException('Document not found');

    // HR documents are sensitive; who read what is as auditable as who changed what.
    await this.audit(
      orgId,
      userId,
      AuditAction.DOCUMENT_DOWNLOADED,
      id,
      null,
      null,
      `Downloaded "${document.title}" from ${employee.employeeCode}'s document vault`,
    );

    return {
      stream: this.storageService.createReadStream((document as any).storageKey),
      document,
    };
  }

  async reviewDocument(
    id: string,
    documentId: string,
    orgId: string,
    userId: string,
    review: { status: 'VERIFIED' | 'REJECTED'; note?: string },
    scopeUser?: RequestUser,
  ) {
    const employee = await this.getScopedEmployee(id, orgId, scopeUser);
    const document: any = (employee.documents || []).find((d: any) => d.id === documentId);
    if (!document) throw new NotFoundException('Document not found');

    if (review.status === 'REJECTED' && !review.note?.trim()) {
      throw new BadRequestException('A rejection note is required so the employee knows what to re-upload.');
    }

    const before = { verificationStatus: document.verificationStatus, reviewNote: document.reviewNote };

    document.verificationStatus = review.status;
    document.reviewNote = review.note?.trim() || '';
    document.reviewedBy = userId;
    document.reviewedAt = new Date();

    employee.markModified('documents');
    await employee.save();

    await this.audit(
      orgId,
      userId,
      AuditAction.DOCUMENT_VERIFIED,
      id,
      before,
      { verificationStatus: document.verificationStatus, reviewNote: document.reviewNote },
      `Marked "${document.title}" as ${review.status.toLowerCase()} for ${employee.employeeCode}`,
    );

    return this.toDocumentResponse(document);
  }

  async removeDocument(
    id: string,
    documentId: string,
    orgId: string,
    userId: string,
    scopeUser?: RequestUser,
  ) {
    const employee = await this.getScopedEmployee(id, orgId, scopeUser);
    const document: any = (employee.documents || []).find((d: any) => d.id === documentId);
    if (!document) throw new NotFoundException('Document not found');

    employee.documents = (employee.documents || []).filter((d: any) => d.id !== documentId);
    await employee.save();

    if (document.storageKey) await this.storageService.remove(document.storageKey);

    await this.audit(
      orgId,
      userId,
      AuditAction.DOCUMENT_DELETED,
      id,
      null,
      null,
      `Removed "${document.title}" from ${employee.employeeCode}'s document vault`,
    );

    return { message: `Document "${document.title}" removed.` };
  }

  // 3. CREATE EMPLOYEE VIA PROVISIONING ENGINE
  async createEmployee(dto: CreateEmployeeDto, orgId: string, userId: string) {
    // 1. Atomic Employee ID Generation with collision retry
    const code = await this.provisioningService.generateUniqueEmployeeCode(orgId, dto.employeeCode);

    // 2. Automatic Organization Email Generation with collision resolution
    const workEmail = await this.provisioningService.generateUniqueOrganizationEmail(
      dto.firstName,
      dto.lastName,
      orgId,
      dto.workEmail,
    );

    // 3. Cryptographically Secure Temporary Password
    const { plainText: temporaryPassword, hash: passwordHashPromise } =
      this.provisioningService.generateSecureTemporaryPassword();
    const passwordHash = await passwordHashPromise;

    // 4. Provision Linked User Account
    const linkedUserId = await this.provisioningService.provisionUserAccount({
      orgId,
      email: workEmail,
      firstName: dto.firstName,
      lastName: dto.lastName,
      passwordHash,
      avatarUrl: dto.avatarUrl,
    });

    const displayName = dto.displayName || `${dto.firstName} ${dto.lastName}`.trim();

    // 5. Dispatch Onboarding Email to Personal Email
    const emailResult = await this.provisioningService.dispatchOnboardingEmail({
      personalEmail: dto.personalEmail,
      workEmail,
      employeeName: displayName,
      employeeCode: code,
      temporaryPassword,
    });

    // 6. Create Employee Master Record
    const employee = await this.empModel.create({
      ...dto,
      _id: generateUuid(),
      organizationId: orgId,
      userId: linkedUserId,
      employeeCode: code,
      displayName,
      workEmail,
      initialPassword: temporaryPassword,
      onboardingEmailStatus: emailResult.status,
      onboardingEmailSentAt: emailResult.sentAt || null,
      status: dto.status || 'ACTIVE',
      isDeleted: false,
    });

    await this.audit(orgId, userId, AuditAction.CREATE, employee._id, null, employee, `Onboarded employee ${employee.employeeCode} (${employee.displayName || employee.firstName})`);
    return employee;
  }

  // 4. UPDATE EMPLOYEE
  async updateEmployee(
    id: string,
    dto: UpdateEmployeeDto,
    orgId: string,
    userId: string,
    scopeUser?: RequestUser,
  ) {
    const existing = await this.empModel.findOne({ _id: id, organizationId: orgId, isDeleted: false });
    if (!existing) throw new NotFoundException('Employee not found');

    await this.assertEmployeeInScope(existing, orgId, scopeUser);

    if (dto.workEmail && dto.workEmail.toLowerCase().trim() !== existing.workEmail) {
      const duplicate = await this.empModel.findOne({
        _id: { $ne: id },
        organizationId: orgId,
        workEmail: dto.workEmail.toLowerCase().trim(),
        isDeleted: false,
      });
      if (duplicate) {
        throw new ConflictException(`Work email ${dto.workEmail} is already registered to another employee.`);
      }
    }

    const updated = await this.empModel.findByIdAndUpdate(
      id,
      {
        ...dto,
        workEmail: dto.workEmail ? dto.workEmail.toLowerCase().trim() : existing.workEmail,
        displayName: dto.displayName || `${dto.firstName || existing.firstName} ${dto.lastName || existing.lastName}`.trim(),
      },
      { new: true },
    );

    // Sync linked user name or avatar if changed
    if (existing.userId) {
      const userUpdates: any = {};
      if (updated?.firstName) userUpdates.firstName = updated.firstName;
      if (updated?.lastName) userUpdates.lastName = updated.lastName;
      if (updated?.workEmail) userUpdates.email = updated.workEmail;
      if (updated?.avatarUrl) userUpdates.avatarUrl = updated.avatarUrl;
      if (Object.keys(userUpdates).length > 0) {
        await this.userModel.findByIdAndUpdate(existing.userId, userUpdates);
      }
    }

    await this.audit(orgId, userId, AuditAction.UPDATE, id, existing, updated, `Updated employee ${existing.employeeCode}`);
    return updated;
  }

  // 4.1. UPLOAD EMPLOYEE PROFILE PICTURE (CAN CHANGE ANY TIME)
  async uploadAvatar(
    id: string,
    orgId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    actorUserId: string,
    scopeUser?: RequestUser,
  ): Promise<{ avatarUrl: string }> {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only JPG, PNG, WEBP and GIF image formats are supported.');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Image size cannot exceed 5MB.');
    }

    const employee = await this.getScopedEmployee(id, orgId, scopeUser);

    const uploadsDir = resolve(process.cwd(), 'uploads', 'avatars');
    await mkdir(uploadsDir, { recursive: true });

    const ext = extname(file.originalname).toLowerCase() || '.jpg';
    const filename = `emp-${id}-${randomUUID()}${ext}`;
    const filePath = join(uploadsDir, filename);

    await writeFile(filePath, file.buffer);

    const avatarUrl = `/api/v1/users/avatar/${filename}`;
    const oldAvatar = employee.avatarUrl;

    employee.avatarUrl = avatarUrl;
    await employee.save();

    // Also update linked user account if exists
    if (employee.userId) {
      await this.userModel.findByIdAndUpdate(employee.userId, { avatarUrl });
    } else {
      await this.userModel.updateOne(
        { email: employee.workEmail.toLowerCase().trim() },
        { $set: { avatarUrl } },
      );
    }

    // Clean up old avatar if it was locally uploaded
    if (oldAvatar && oldAvatar.startsWith('/api/v1/users/avatar/emp-')) {
      const oldFilename = oldAvatar.replace('/api/v1/users/avatar/', '');
      const oldPath = join(uploadsDir, oldFilename);
      if (existsSync(oldPath)) {
        await unlink(oldPath).catch(() => {});
      }
    }

    await this.audit(
      orgId,
      actorUserId,
      AuditAction.UPDATE,
      id,
      { avatarUrl: oldAvatar },
      { avatarUrl },
      `Updated profile picture for ${employee.employeeCode}`,
    );

    return { avatarUrl };
  }

  // 4.2. UPLOAD PRE-HIRE AVATAR (FOR EMPLOYEE CREATION WIZARD)
  async uploadPreHireAvatar(
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
    const filename = `prehire-${randomUUID()}${ext}`;
    const filePath = join(uploadsDir, filename);

    await writeFile(filePath, file.buffer);

    const avatarUrl = `/api/v1/users/avatar/${filename}`;
    return { avatarUrl };
  }

  // 5. CHANGE EMPLOYEE STATUS (LIFECYCLE TRANSITIONS)
  async changeStatus(
    id: string,
    dto: ChangeEmployeeStatusDto,
    orgId: string,
    userId: string,
    scopeUser?: RequestUser,
  ) {
    const existing = await this.empModel.findOne({ _id: id, organizationId: orgId, isDeleted: false });
    if (!existing) throw new NotFoundException('Employee not found');

    await this.assertEmployeeInScope(existing, orgId, scopeUser);

    const updatePayload: any = {
      status: dto.status,
    };

    if (dto.reason) {
      updatePayload.terminationReason = dto.reason;
    }

    if (dto.status === 'TERMINATED' || dto.status === 'RESIGNED') {
      updatePayload.lastWorkingDate = dto.effectiveDate || new Date().toISOString().split('T')[0];
      if (dto.status === 'RESIGNED') {
        updatePayload.resignationDate = dto.effectiveDate || new Date().toISOString().split('T')[0];
      }
    }

    const updated = await this.empModel.findByIdAndUpdate(id, updatePayload, { new: true });

    // Reflect on linked user account login eligibility
    if (existing.userId) {
      const userStatus =
        dto.status === 'ACTIVE' || dto.status === 'PROBATION' || dto.status === 'ON_LEAVE'
          ? 'ACTIVE'
          : dto.status === 'SUSPENDED'
          ? 'SUSPENDED'
          : 'INACTIVE';

      await this.userModel.findByIdAndUpdate(existing.userId, { status: userStatus });
    }

    await this.audit(orgId, userId, statusAuditAction(dto.status), id, existing, updated, `Employee ${existing.employeeCode} status changed to ${dto.status}`);
    return updated;
  }

  // 6. RESEND ONBOARDING CREDENTIALS
  async resendOnboardingCredentials(
    id: string,
    orgId: string,
    userId: string,
    scopeUser?: RequestUser,
  ) {
    const employee = await this.empModel.findOne({ _id: id, organizationId: orgId, isDeleted: false });
    if (!employee) throw new NotFoundException('Employee not found');

    await this.assertEmployeeInScope(employee, orgId, scopeUser);

    if (!employee.personalEmail) {
      throw new BadRequestException('Employee does not have a registered personal email address.');
    }

    // Generate fresh secure temporary password
    const { plainText: newTempPassword, hash: passwordHashPromise } =
      this.provisioningService.generateSecureTemporaryPassword();
    const newPasswordHash = await passwordHashPromise;

    // Update user auth password
    if (employee.userId) {
      await this.userModel.findByIdAndUpdate(employee.userId, {
        passwordHash: newPasswordHash,
        status: 'ACTIVE',
        failedLoginAttempts: 0,
      });
    }

    // Dispatch email
    const emailResult = await this.provisioningService.dispatchOnboardingEmail({
      personalEmail: employee.personalEmail,
      workEmail: employee.workEmail,
      employeeName: employee.displayName || `${employee.firstName} ${employee.lastName}`,
      employeeCode: employee.employeeCode,
      temporaryPassword: newTempPassword,
    });

    const updated = await this.empModel.findByIdAndUpdate(
      id,
      {
        initialPassword: newTempPassword,
        onboardingEmailStatus: emailResult.status,
        onboardingEmailSentAt: emailResult.sentAt || new Date(),
      },
      { new: true },
    );

    await this.auditService.record({
      action: AuditAction.EMAIL_SENT,
      resourceType: AuditResource.EMPLOYEE,
      resourceId: id,
      organizationId: orgId,
      actorUserId: userId,
      actorEmployeeId: id,
      description: `Resent onboarding credentials for ${employee.employeeCode}`,
      metadata: { deliveryStatus: emailResult.status },
    });

    return {
      success: true,
      message: emailResult.status === 'SENT'
        ? `Onboarding credentials sent to ${employee.personalEmail}`
        : `Email delivery queued/pending for ${employee.personalEmail}`,
      employee: updated,
    };
  }

  // 7. SOFT DELETE EMPLOYEE
  async deleteEmployee(id: string, orgId: string, userId: string, scopeUser?: RequestUser) {
    const existing = await this.empModel.findOne({ _id: id, organizationId: orgId, isDeleted: false });
    if (!existing) throw new NotFoundException('Employee not found');

    await this.assertEmployeeInScope(existing, orgId, scopeUser);

    const updated = await this.empModel.findByIdAndUpdate(
      id,
      {
        isDeleted: true,
        status: 'TERMINATED',
        deletedAt: new Date(),
      },
      { new: true },
    );

    if (existing.userId) {
      await this.userModel.findByIdAndUpdate(existing.userId, {
        isDeleted: true,
        status: 'INACTIVE',
      });
    }

    await this.audit(orgId, userId, AuditAction.DELETE, id, existing, updated, `Archived employee ${existing.employeeCode}`);
    return { success: true, message: 'Employee record archived and user account deactivated successfully' };
  }

  // 8. CSV EXPORT STREAM GENERATOR
  async exportEmployees(orgId: string, query: EmployeeQueryDto, scopeUser?: RequestUser) {
    const filter: any = { organizationId: orgId, isDeleted: false };
    if (query.departmentId && query.departmentId !== 'ALL') filter.departmentId = query.departmentId;
    if (query.status && query.status !== 'ALL') filter.status = query.status;

    await this.applyDepartmentScope(filter, orgId, scopeUser);

    const employees = await this.empModel.find(filter).sort({ employeeCode: 1 }).lean();

    const headers = 'Employee Code,First Name,Last Name,Work Email,Personal Email,Phone,Employment Type,Status,Joining Date\n';
    const rows = employees.map(
      (e) =>
        `"${e.employeeCode}","${e.firstName}","${e.lastName}","${e.workEmail}","${e.personalEmail || ''}","${e.phone || ''}","${e.employmentType}","${e.status}","${e.joiningDate}"`,
    );

    return headers + rows.join('\n');
  }
}
