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
import { CostCenter, CostCenterDocument } from '../organization/schemas/cost-center.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { AuditService } from '../../common/audit/audit.service';
import { AuditAction, AuditResource } from '../../common/audit/audit.constants';
import { PERMISSIONS } from '../../common/constants';
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
import { UsersService } from '../users/users.service';
import { AssignRolesDto } from '../users/dto/users.dto';
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

export interface OrgChartNode {
  _id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatarUrl?: string;
  initials: string;
  workEmail: string;
  phone?: string;
  departmentId?: string;
  departmentName: string;
  departmentCode: string;
  designationId?: string;
  designationTitle: string;
  designationCode: string;
  managerId?: string | null;
  status: string;
  directReportsCount: number;
  children: OrgChartNode[];
}

@Injectable()
export class EmployeesService {
  constructor(
    @InjectModel(Employee.name) private empModel: Model<EmployeeDocument>,
    @InjectModel(Department.name) private deptModel: Model<DepartmentDocument>,
    @InjectModel(Designation.name) private desigModel: Model<DesignationDocument>,
    @InjectModel(Location.name) private locModel: Model<LocationDocument>,
    @InjectModel(CostCenter.name) private costCenterModel: Model<CostCenterDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly provisioningService: EmployeeProvisioningService,
    private readonly scopeService: EmployeeScopeService,
    private readonly auditService: AuditService,
    private readonly storageService: DocumentStorageService,
    private readonly usersService: UsersService,
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
    employee: { departmentId?: string | null; userId?: string | null; personalEmail?: string | null; workEmail?: string | null },
    orgId: string,
    scopeUser?: RequestUser,
  ): Promise<void> {
    if (!scopeUser) return;

    // Self-service access: an employee can always access their own profile
    const userId = (scopeUser as any).id || (scopeUser as any).userId || (scopeUser as any)._id;
    const userEmail = (scopeUser.email || '').toLowerCase().trim();
    if (employee.userId && String(employee.userId) === String(userId)) return;
    if (employee.personalEmail && employee.personalEmail.toLowerCase().trim() === userEmail) return;
    if (employee.workEmail && employee.workEmail.toLowerCase().trim() === userEmail) return;

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

  /** Checks if the user is accessing their own linked employee profile */
  async isSelfServiceUser(employeeId: string, orgId: string, user: any): Promise<boolean> {
    if (!user) return false;
    const userId = user.id || user.userId || user._id;
    const userEmail = (user.email || '').toLowerCase().trim();
    const emp = await this.empModel
      .findOne({
        _id: employeeId,
        organizationId: orgId,
        isDeleted: false,
      })
      .lean();
    if (!emp) return false;
    if (emp.userId && String(emp.userId) === String(userId)) return true;
    if (emp.personalEmail && emp.personalEmail.toLowerCase().trim() === userEmail) return true;
    if (emp.workEmail && emp.workEmail.toLowerCase().trim() === userEmail) return true;
    return false;
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
    const costCenterIds = [...new Set(result.data.map((e) => e.costCenterId).filter(Boolean))];
    const managerIds = [...new Set(result.data.map((e) => e.managerId).filter(Boolean))];
    const hrIds = [...new Set(result.data.map((e) => (e as any).hrId).filter(Boolean))];

    const [departments, designations, locations, costCenters, managers, hrPeople] = await Promise.all([
      this.deptModel.find({ _id: { $in: departmentIds } }).lean(),
      this.desigModel.find({ _id: { $in: designationIds } }).lean(),
      this.locModel.find({ _id: { $in: locationIds } }).lean(),
      this.costCenterModel.find({ _id: { $in: costCenterIds } }).lean(),
      this.empModel.find({ _id: { $in: managerIds } }, 'firstName lastName displayName employeeCode avatarUrl').lean(),
      this.empModel.find({ _id: { $in: hrIds } }, 'firstName lastName displayName employeeCode workEmail avatarUrl').lean(),
    ]);

    const deptMap = new Map(departments.map((d) => [String(d._id), d.name]));
    const desigMap = new Map(designations.map((d) => [String(d._id), d.title]));
    const locMap = new Map(locations.map((l) => [String(l._id), l.name]));
    const costCenterMap = new Map(costCenters.map((c) => [String(c._id), c.name]));
    const managerMap = new Map(managers.map((m) => [String(m._id), m]));
    const hrMap = new Map(hrPeople.map((h) => [String(h._id), h]));

    const enrichedData = result.data.map((emp) => {
      const json = JSON.parse(JSON.stringify(emp));
      return {
        ...json,
        departmentName: emp.departmentId ? deptMap.get(emp.departmentId) || null : null,
        designationTitle: emp.designationId ? desigMap.get(emp.designationId) || null : null,
        locationName: emp.locationId ? locMap.get(emp.locationId) || null : null,
        costCenterName: emp.costCenterId ? costCenterMap.get(emp.costCenterId) || null : null,
        manager: emp.managerId ? managerMap.get(emp.managerId) || null : null,
        hr: (emp as any).hrId ? hrMap.get((emp as any).hrId) || null : null,
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

  // 1.9. GET CURRENT AUTHENTICATED EMPLOYEE'S PROFILE
  async getMyEmployeeProfile(userId: string, orgId: string, email: string): Promise<any> {
    const cleanEmail = (email || '').toLowerCase().trim();

    // A `userId: undefined` clause would match every employee without a linked
    // account and findOne would return whichever came first (wrong person).
    // Match the linked account first, fall back to email only when needed.
    if (userId) {
      const byUser = await this.empModel
        .findOne({ organizationId: orgId, userId, isDeleted: false })
        .lean();
      if (byUser) {
        return this.getEmployeeById(byUser._id, orgId);
      }
    }

    if (cleanEmail) {
      const byEmail = await this.empModel
        .findOne({
          organizationId: orgId,
          isDeleted: false,
          $or: [{ workEmail: cleanEmail }, { personalEmail: cleanEmail }],
        })
        .lean();
      if (byEmail) {
        return this.getEmployeeById(byEmail._id, orgId);
      }
    }

    return null;
  }

  // 1.10. MY TEAM — manager, department head & HR contacts for self-service
  async getMyTeam(userId: string, orgId: string, email: string) {
    const cleanEmail = (email || '').toLowerCase().trim();
    let employee: any = null;
    if (userId) {
      employee = await this.empModel.findOne({ organizationId: orgId, userId, isDeleted: false }).lean();
    }
    if (!employee && cleanEmail) {
      employee = await this.empModel
        .findOne({
          organizationId: orgId,
          isDeleted: false,
          $or: [{ workEmail: cleanEmail }, { personalEmail: cleanEmail }],
        })
        .lean();
    }
    if (!employee) {
      throw new NotFoundException('No employee record is linked to this login.');
    }

    const person = (e: any) =>
      e
        ? {
            _id: String(e._id),
            employeeCode: e.employeeCode,
            displayName: e.displayName || `${e.firstName} ${e.lastName}`.trim(),
            workEmail: e.workEmail,
            avatarUrl: e.avatarUrl || null,
          }
        : null;

    const [managerDoc, deptDoc, hrUsers, reportingHrDoc] = await Promise.all([
      employee.managerId
        ? this.empModel.findOne({ _id: employee.managerId, isDeleted: false }, 'firstName lastName displayName employeeCode workEmail avatarUrl').lean()
        : null,
      employee.departmentId
        ? this.deptModel.findOne({ _id: employee.departmentId, organizationId: orgId, isDeleted: false }, '_id name code headEmployeeId').lean()
        : null,
      this.userModel
        .find(
          {
            organizationId: orgId,
            status: 'ACTIVE',
            isDeleted: { $ne: true },
            roles: {
              $in: ['SUPER_ADMIN', 'super_admin', 'Super Administrator', 'HR_ADMIN', 'hr_admin', 'HR Admin'],
            },
          },
          'firstName lastName email avatarUrl roles',
        )
        .limit(5)
        .lean(),
      employee.hrId
        ? this.empModel.findOne({ _id: employee.hrId, isDeleted: false }, 'firstName lastName displayName employeeCode workEmail avatarUrl').lean()
        : null,
    ]);

    let departmentHead: any = null;
    if (deptDoc?.headEmployeeId && String(deptDoc.headEmployeeId) !== String(employee._id)) {
      const head = await this.empModel
        .findOne({ _id: deptDoc.headEmployeeId, isDeleted: false }, 'firstName lastName displayName employeeCode workEmail avatarUrl')
        .lean();
      departmentHead = person(head);
    }

    return {
      manager: person(managerDoc),
      departmentHead,
      department: deptDoc ? { _id: String(deptDoc._id), name: deptDoc.name, code: deptDoc.code } : null,
      reportingHr: person(reportingHrDoc),
      hrContacts: (hrUsers || []).map((u: any) => ({
        name: `${u.firstName} ${u.lastName}`.trim(),
        email: u.email,
        avatarUrl: u.avatarUrl || null,
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

    const [dept, desig, loc, costCenter, manager, hrPerson, directReports, auditLogs] = await Promise.all([
      employee.departmentId ? this.deptModel.findOne({ _id: employee.departmentId }).lean() : null,
      employee.designationId ? this.desigModel.findOne({ _id: employee.designationId }).lean() : null,
      employee.locationId ? this.locModel.findOne({ _id: employee.locationId }).lean() : null,
      employee.costCenterId ? this.costCenterModel.findOne({ _id: employee.costCenterId }).lean() : null,
      employee.managerId
        ? this.empModel.findOne({ _id: employee.managerId }, 'firstName lastName displayName employeeCode workEmail avatarUrl').lean()
        : null,
      (employee as any).hrId
        ? this.empModel.findOne({ _id: (employee as any).hrId }, 'firstName lastName displayName employeeCode workEmail avatarUrl').lean()
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
      costCenter: costCenter,
      manager,
      hr: hrPerson,
      directReports,
      profileCompletion: this.calculateProfileCompletion(employee),
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
   * Calculates mathematically weighted employee profile completion percentage and missing items.
   */
  calculateProfileCompletion(employee: any) {
    const missingFields: string[] = [];
    let score = 0;

    // 1. Personal Information (20%)
    let personalComplete = true;
    if (!employee.firstName || !employee.lastName) { personalComplete = false; missingFields.push('Full Legal Name'); }
    if (!employee.avatarUrl) { personalComplete = false; missingFields.push('Profile Photo'); }
    if (!employee.dateOfBirth) { personalComplete = false; missingFields.push('Date of Birth'); }
    if (!employee.gender) { personalComplete = false; missingFields.push('Gender'); }
    if (!employee.nationality) { personalComplete = false; missingFields.push('Nationality'); }
    if (personalComplete) {
      score += 20;
    } else {
      if (employee.firstName && employee.lastName) score += 10;
      if (employee.avatarUrl) score += 5;
      if (employee.dateOfBirth || employee.gender) score += 5;
    }

    // 2. Contact Information (15%)
    let contactComplete = true;
    if (!employee.personalEmail) { contactComplete = false; missingFields.push('Personal Email'); }
    if (!employee.phone) { contactComplete = false; missingFields.push('Personal Mobile'); }
    if (!employee.currentAddress?.addressLine1 || !employee.currentAddress?.city) {
      contactComplete = false;
      missingFields.push('Residential Address');
    }
    if (contactComplete) {
      score += 15;
    } else {
      if (employee.personalEmail || employee.workEmail) score += 5;
      if (employee.phone) score += 5;
      if (employee.currentAddress?.addressLine1) score += 5;
    }

    // 3. Emergency Contact (15%)
    const hasPrimaryEmergency = (employee.emergencyContacts || []).some(
      (c: any) => c.name && c.phone && c.relationship,
    );
    if (hasPrimaryEmergency) {
      score += 15;
    } else {
      missingFields.push('Primary Emergency Contact');
    }

    // 4. Employment (15%)
    let employmentComplete = true;
    if (!employee.departmentId) { employmentComplete = false; missingFields.push('Department Assignment'); }
    if (!employee.designationId) { employmentComplete = false; missingFields.push('Job Designation'); }
    if (!employee.joiningDate) { employmentComplete = false; missingFields.push('Date of Joining'); }
    if (employmentComplete) {
      score += 15;
    } else {
      if (employee.departmentId) score += 5;
      if (employee.designationId) score += 5;
      if (employee.joiningDate) score += 5;
    }

    // 5. Work Information (10%)
    let workInfoComplete = true;
    if (!employee.workType) { workInfoComplete = false; missingFields.push('Work Type (On-site/Remote/Hybrid)'); }
    if (!employee.shift) { workInfoComplete = false; missingFields.push('Shift Schedule'); }
    if (workInfoComplete) {
      score += 10;
    } else {
      if (employee.workType || employee.shift) score += 5;
    }

    // 6. Identification (15%)
    const hasId = Boolean(employee.identification?.idNumber || employee.nationalId);
    if (hasId) {
      score += 15;
    } else {
      missingFields.push('Government Identification');
    }

    // 7. Payroll / Payment Details (10%)
    const hasPayroll = Boolean(employee.payrollInfo?.bankName && employee.payrollInfo?.accountNumber);
    if (hasPayroll) {
      score += 10;
    } else {
      missingFields.push('Bank & Payroll Account Details');
    }

    const percentage = Math.min(Math.max(Math.round(score), 0), 100);

    return {
      percentage,
      isComplete: percentage === 100,
      missingFields,
      sections: {
        personal: personalComplete,
        contact: contactComplete,
        emergency: hasPrimaryEmergency,
        employment: employmentComplete,
        workInfo: workInfoComplete,
        identification: hasId,
        payroll: hasPayroll,
        documents: (employee.documents || []).length > 0,
      },
    };
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

  // 3.0. GENERATE NEXT SEQUENTIAL EMPLOYEE CODE
  async generateEmployeeCode(orgId: string): Promise<{ employeeCode: string }> {
    const employeeCode = await this.provisioningService.generateUniqueEmployeeCode(orgId);
    return { employeeCode };
  }

  // 3.1. GENERATE NEXT UNIQUE ORGANIZATION WORK EMAIL
  async generateWorkEmail(
    orgId: string,
    firstName?: string,
    lastName?: string,
  ): Promise<{ workEmail: string }> {
    const workEmail = await this.provisioningService.generateUniqueOrganizationEmail(
      firstName || '',
      lastName || '',
      orgId,
    );
    return { workEmail };
  }

  // 3. CREATE EMPLOYEE VIA PROVISIONING ENGINE
  async createEmployee(dto: CreateEmployeeDto, orgId: string, userId: string) {
    // 1. Atomic Employee ID Generation with collision retry
    const code = await this.provisioningService.generateUniqueEmployeeCode(orgId, dto.employeeCode);

    // 2. Primary Connection & Login Email (Personal Gmail)
    // The employee connects and logs in directly with their personal email / Gmail
    const loginEmail = (dto.personalEmail || dto.workEmail || '').trim().toLowerCase();
    if (!loginEmail) {
      throw new BadRequestException('Personal email (Gmail) is required to connect with employee and create login credentials.');
    }

    const workEmail = dto.workEmail?.trim()?.toLowerCase() || loginEmail;

    // 3. Cryptographically Secure Temporary Password
    const { plainText: temporaryPassword, hash: passwordHashPromise } =
      this.provisioningService.generateSecureTemporaryPassword();
    const passwordHash = await passwordHashPromise;

    // 4. Provision Linked User Account using personal email (Gmail)
    const linkedUserId = await this.provisioningService.provisionUserAccount({
      orgId,
      email: loginEmail,
      firstName: dto.firstName,
      lastName: dto.lastName,
      passwordHash,
      avatarUrl: dto.avatarUrl,
    });

    const displayName = dto.displayName || `${dto.firstName} ${dto.lastName}`.trim();

    let deptName = '';
    let desigTitle = '';
    if (dto.departmentId) {
      const d = await this.deptModel.findOne({ _id: dto.departmentId }).lean();
      if (d) deptName = d.name;
    }
    if (dto.designationId) {
      const dg = await this.desigModel.findOne({ _id: dto.designationId }).lean();
      if (dg) desigTitle = dg.title;
    }

    // 5. Dispatch Onboarding Offer & Welcome Email with Login Password to Personal Gmail
    const emailResult = await this.provisioningService.dispatchOnboardingEmail({
      personalEmail: loginEmail,
      loginEmail,
      workEmail,
      employeeName: displayName,
      employeeCode: code,
      temporaryPassword,
      department: deptName,
      designation: desigTitle,
      joiningDate: dto.joiningDate,
    });

    // 6. Create Employee Master Record
    const employee = await this.empModel.create({
      ...dto,
      _id: generateUuid(),
      organizationId: orgId,
      userId: linkedUserId,
      employeeCode: code,
      displayName,
      personalEmail: loginEmail,
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

    const isHrOrAdmin = !scopeUser || Boolean(
      scopeUser.roles?.some((r) =>
        ['ADMIN', 'HR', 'HR_ADMIN', 'SUPER_ADMIN', 'ORG_ADMIN', 'Admin', 'HR Manager', 'HR Admin'].includes(r)
      ) ||
      scopeUser.permissions?.includes(PERMISSIONS.EMPLOYEE_UPDATE) ||
      scopeUser.permissions?.includes(PERMISSIONS.EMPLOYEE_CREATE)
    );

    const updatePayload: any = { ...dto };

    // If regular employee (non HR/Admin), strictly enforce Profile Access Rules:
    // HR-controlled fields cannot be modified by the employee directly
    if (scopeUser && !isHrOrAdmin) {
      delete updatePayload.employeeCode;
      delete updatePayload.status;
      delete updatePayload.departmentId;
      delete updatePayload.designationId;
      delete updatePayload.locationId;
      delete updatePayload.costCenterId;
      delete updatePayload.employmentType;
      delete updatePayload.joiningDate;
      delete updatePayload.workEmail;
      delete updatePayload.managerId;
      delete updatePayload.hrId;
      delete updatePayload.workType;
      delete updatePayload.shift;
      delete updatePayload.payrollInfo;
      delete updatePayload.confirmationDate;
      delete updatePayload.resignationDate;
      delete updatePayload.lastWorkingDate;
      delete updatePayload.terminationReason;
    }

    if (updatePayload.employeeCode && updatePayload.employeeCode.trim().toUpperCase() !== existing.employeeCode) {
      const formattedCode = updatePayload.employeeCode.trim().toUpperCase();
      const duplicateCode = await this.empModel.findOne({
        _id: { $ne: id },
        organizationId: orgId,
        employeeCode: formattedCode,
        isDeleted: false,
      });
      if (duplicateCode) {
        throw new ConflictException(`Employee ID ${formattedCode} is already assigned to another employee.`);
      }
      updatePayload.employeeCode = formattedCode;
    }

    if (updatePayload.workEmail && updatePayload.workEmail.toLowerCase().trim() !== existing.workEmail) {
      const duplicate = await this.empModel.findOne({
        _id: { $ne: id },
        organizationId: orgId,
        workEmail: updatePayload.workEmail.toLowerCase().trim(),
        isDeleted: false,
      });
      if (duplicate) {
        throw new ConflictException(`Work email ${updatePayload.workEmail} is already registered to another employee.`);
      }
      updatePayload.workEmail = updatePayload.workEmail.toLowerCase().trim();
    }

    const updated = await this.empModel.findByIdAndUpdate(
      id,
      {
        ...updatePayload,
        displayName: updatePayload.displayName || `${updatePayload.firstName || existing.firstName} ${updatePayload.lastName || existing.lastName}`.trim(),
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

  // 5.1. LINKED LOGIN ROLES — assign HR / Manager / Employee access
  /** Resolves the login account behind an employee file (direct link, then email). */
  private async resolveLinkedUser(employee: {
    userId?: string | null;
    workEmail?: string | null;
    personalEmail?: string | null;
  }) {
    if (employee.userId) {
      const byId = await this.userModel.findOne({ _id: employee.userId, isDeleted: false }).lean();
      if (byId) return byId;
    }
    const emails = [employee.workEmail, employee.personalEmail]
      .map((e) => (e || '').toLowerCase().trim())
      .filter(Boolean);
    if (emails.length === 0) return null;
    return this.userModel.findOne({ email: { $in: emails }, isDeleted: false }).lean();
  }

  /** Read-only view of the login behind an employee (for the Assign-Roles UI). */
  async getEmployeeLogin(id: string, orgId: string, scopeUser?: RequestUser) {
    const employee = await this.empModel.findOne({ _id: id, organizationId: orgId, isDeleted: false }).lean();
    if (!employee) throw new NotFoundException('Employee not found');

    await this.assertEmployeeInScope(employee, orgId, scopeUser);

    const linked: any = await this.resolveLinkedUser(employee);
    if (!linked) {
      return { linked: false as const, userId: null, email: null, roles: [], status: null };
    }
    return {
      linked: true as const,
      userId: String(linked._id),
      email: linked.email,
      roles: linked.roles || [],
      status: linked.status,
    };
  }

  /**
   * Assigns system roles (HR Admin, Manager, Employee…) to the employee's
   * login account. Delegates to UsersService so last-super-admin protection,
   * permission sync and user audit stay in one place; adds an employee
   * timeline entry so the change is visible on the file.
   */
  async assignEmployeeRoles(
    id: string,
    dto: AssignRolesDto,
    orgId: string,
    actorUserId: string,
    scopeUser?: RequestUser,
  ) {
    const employee = await this.empModel.findOne({ _id: id, organizationId: orgId, isDeleted: false });
    if (!employee) throw new NotFoundException('Employee not found');

    await this.assertEmployeeInScope(employee, orgId, scopeUser);

    const linked: any = await this.resolveLinkedUser(employee);
    if (!linked) {
      throw new NotFoundException(
        'No login account is linked to this employee yet. Create the login via onboarding first.',
      );
    }

    const before = { roles: linked.roles || [], departmentScope: linked.departmentScope || [] };
    const result = await this.usersService.assignRoles(String(linked._id), dto, actorUserId);

    await this.audit(
      orgId,
      actorUserId,
      AuditAction.ROLE_ASSIGNED,
      id,
      before,
      { roles: result.roles },
      `Updated login roles for ${employee.employeeCode} to ${result.roles.join(', ') || 'none'}`,
    );

    return { ...result, userId: String(linked._id), email: linked.email };
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

  // 9. ORGANIZATION HIERARCHY CHART TREE
  async getOrgChart(orgId: string): Promise<{
    roots: OrgChartNode[];
    totalEmployees: number;
    totalDepartments: number;
    totalDesignations: number;
  }> {
    const employees = await this.empModel
      .find({ organizationId: orgId, isDeleted: false })
      .lean();

    const departments = await this.deptModel.find({ organizationId: orgId }).lean();
    const designations = await this.desigModel.find({ organizationId: orgId }).lean();

    const deptMap = new Map<string, any>();
    departments.forEach((d) => deptMap.set(String(d._id), d));

    const desigMap = new Map<string, any>();
    designations.forEach((d) => desigMap.set(String(d._id), d));

    const nodeMap = new Map<string, OrgChartNode>();

    employees.forEach((emp: any) => {
      const dept = emp.departmentId ? deptMap.get(String(emp.departmentId)) : null;
      const desig = emp.designationId ? desigMap.get(String(emp.designationId)) : null;

      const initials = `${(emp.firstName || '').charAt(0)}${(emp.lastName || '').charAt(0)}`.toUpperCase() || 'EM';

      const node: OrgChartNode = {
        _id: String(emp._id),
        employeeCode: emp.employeeCode,
        firstName: emp.firstName,
        lastName: emp.lastName,
        displayName: emp.displayName || `${emp.firstName} ${emp.lastName}`.trim(),
        avatarUrl: emp.avatarUrl || '',
        initials,
        workEmail: emp.workEmail,
        phone: emp.phone || '',
        departmentId: emp.departmentId ? String(emp.departmentId) : undefined,
        departmentName: dept?.name || 'Unassigned',
        departmentCode: dept?.code || '',
        designationId: emp.designationId ? String(emp.designationId) : undefined,
        designationTitle: desig?.title || 'Staff Member',
        designationCode: desig?.code || '',
        managerId: emp.managerId ? String(emp.managerId) : null,
        status: emp.status || 'ACTIVE',
        directReportsCount: 0,
        children: [],
      };

      nodeMap.set(String(emp._id), node);
    });

    const roots: OrgChartNode[] = [];

    // Link children to parents
    nodeMap.forEach((node) => {
      if (node.managerId && nodeMap.has(node.managerId)) {
        const manager = nodeMap.get(node.managerId)!;
        manager.children.push(node);
        manager.directReportsCount += 1;
      } else {
        roots.push(node);
      }
    });

    // Sort roots & children by hierarchy or code
    const sortNodes = (nodes: OrgChartNode[]) => {
      nodes.sort((a, b) => a.employeeCode.localeCompare(b.employeeCode, undefined, { numeric: true }));
      nodes.forEach((n) => sortNodes(n.children));
    };
    sortNodes(roots);

    return {
      roots,
      totalEmployees: employees.length,
      totalDepartments: departments.length,
      totalDesignations: designations.length,
    };
  }
}
