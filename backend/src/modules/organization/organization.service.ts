import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Organization,
  OrganizationDocument,
} from './schemas/organization.schema';
import {
  Department,
  DepartmentDocument,
} from './schemas/department.schema';
import { paginate } from '../../common/pagination/pagination.util';
import {
  Designation,
  DesignationDocument,
} from './schemas/designation.schema';
import {
  Location,
  LocationDocument,
} from './schemas/location.schema';
import {
  CostCenter,
  CostCenterDocument,
} from './schemas/cost-center.schema';
import { Employee, EmployeeDocument } from '../employees/schemas/employee.schema';
import { AuditService } from '../../common/audit/audit.service';
import { AuditAction } from '../../common/audit/audit.constants';
import {
  UpdateOrganizationDto,
  CreateDepartmentDto,
  UpdateDepartmentDto,
  CreateDesignationDto,
  UpdateDesignationDto,
  CreateLocationDto,
  UpdateLocationDto,
  CreateCostCenterDto,
  UpdateCostCenterDto,
} from './dto/organization.dto';

/**
 * Organization call sites historically passed composite strings such as
 * `DEPARTMENT_CREATED` or `LOCATION_INACTIVE`. Collapse them onto the shared
 * action vocabulary so the audit trail stays filterable.
 */
function normalizeLegacyAction(action: string): AuditAction {
  const suffix = action.split('_').pop() || '';
  switch (suffix) {
    case 'CREATED':
      return AuditAction.CREATE;
    case 'UPDATED':
      return AuditAction.UPDATE;
    case 'DELETED':
      return AuditAction.DELETE;
    case 'ACTIVE':
      return AuditAction.ACTIVATE;
    case 'INACTIVE':
      return AuditAction.DEACTIVATE;
    case 'CHANGED':
      return AuditAction.HIERARCHY_CHANGED;
    default:
      return AuditAction.UPDATE;
  }
}

function describeOrgChange(
  entityType: string,
  action: AuditAction,
  before: any,
  after: any,
): string {
  const label = (after?.name || before?.name || after?.title || before?.title || '').toString();
  const readableType = entityType.toLowerCase().replace(/_/g, ' ');
  const verb =
    action === AuditAction.CREATE
      ? 'Created'
      : action === AuditAction.DELETE
        ? 'Deleted'
        : action === AuditAction.ACTIVATE
          ? 'Activated'
          : action === AuditAction.DEACTIVATE
            ? 'Deactivated'
            : action === AuditAction.HIERARCHY_CHANGED
              ? 'Reparented'
              : 'Updated';
  return label ? `${verb} ${readableType} "${label}"` : `${verb} ${readableType}`;
}

@Injectable()
export class OrganizationService {
  constructor(
    @InjectModel(Organization.name)
    private readonly orgModel: Model<OrganizationDocument>,
    @InjectModel(Department.name)
    private readonly deptModel: Model<DepartmentDocument>,
    @InjectModel(Designation.name)
    private readonly desigModel: Model<DesignationDocument>,
    @InjectModel(Location.name)
    private readonly locModel: Model<LocationDocument>,
    @InjectModel(CostCenter.name)
    private readonly ccModel: Model<CostCenterDocument>,
    @InjectModel(Employee.name)
    private readonly empModel: Model<EmployeeDocument>,
    private readonly auditService: AuditService,
  ) {}

  private async audit(
    orgId: string,
    userId: string,
    entityType: string,
    entityId: string,
    action: string,
    before: any = null,
    after: any = null,
  ) {
    // Legacy call sites pass composite strings like `DEPARTMENT_CREATED`;
    // normalize onto the canonical action vocabulary.
    const normalized = normalizeLegacyAction(action);

    await this.auditService.record({
      action: normalized,
      resourceType: entityType,
      resourceId: entityId,
      organizationId: orgId,
      actorUserId: userId,
      description: describeOrgChange(entityType, normalized, before, after),
      before,
      after,
    });
  }

  // ==========================================
  // 1. ORGANIZATION PROFILE
  // ==========================================
  async getProfile(organizationId?: string): Promise<Organization> {
    let org: OrganizationDocument | null = null;
    if (organizationId) {
      org = await this.orgModel.findOne({ _id: organizationId, isDeleted: false });
    }
    if (!org) {
      org = await this.orgModel.findOne({ isDeleted: false });
    }
    if (!org) {
      // Create initial default organization profile
      org = await this.orgModel.create({
        legalName: 'CloudIQ Technologies Inc.',
        tradeName: 'CloudIQ Technologies',
        registrationCode: 'REG-2026-HQ01',
        taxId: 'US-EIN-98-7654321',
        corporateEmail: 'contact@cloudiqtech.com',
        phone: '+1 (555) 234-5678',
        website: 'https://cloudiqtech.com',
        timezone: 'Asia/Kolkata',
        currency: 'USD',
        fiscalYearStartMonth: 'January',
        status: 'ACTIVE',
      });
    }
    return org;
  }

  async updateProfile(
    dto: UpdateOrganizationDto,
    userId: string,
    organizationId?: string,
  ): Promise<Organization> {
    const current = await this.getProfile(organizationId);
    const updated = await this.orgModel.findByIdAndUpdate(
      current._id,
      { $set: dto },
      { new: true },
    );
    if (!updated) throw new NotFoundException('Organization not found');

    await this.audit(
      updated._id,
      userId,
      'ORGANIZATION',
      updated._id,
      'ORGANIZATION_UPDATED',
      current,
      updated,
    );
    return updated;
  }

  // ==========================================
  // 2. DEPARTMENTS
  // ==========================================
  async getDepartments(
    orgId: string,
    query: { search?: string; status?: string; page?: number; pageSize?: number },
  ) {
    const filter: any = { organizationId: orgId, isDeleted: false };
    if (query.status && query.status !== 'ALL') {
      filter.status = query.status;
    }
    if (query.search) {
      const regex = new RegExp(query.search, 'i');
      filter.$or = [{ name: regex }, { code: regex }];
    }

    if (query.page !== undefined || query.pageSize !== undefined) {
      return paginate<Department>(this.deptModel, filter, {
        page: query.page,
        pageSize: query.pageSize,
      }, { createdAt: -1 });
    }

    return this.deptModel.find(filter).sort({ createdAt: -1 });
  }

  async getDepartmentById(id: string, orgId: string) {
    const dept = await this.deptModel.findOne({ _id: id, organizationId: orgId, isDeleted: false });
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  async createDepartment(dto: CreateDepartmentDto, orgId: string, userId: string) {
    const existing = await this.deptModel.findOne({
      organizationId: orgId,
      code: dto.code.trim().toUpperCase(),
      isDeleted: false,
    });
    if (existing) {
      throw new ConflictException(`Department code "${dto.code}" already exists`);
    }

    if (dto.parentId) {
      const parent = await this.deptModel.findOne({
        _id: dto.parentId,
        organizationId: orgId,
        isDeleted: false,
      });
      if (!parent) throw new BadRequestException('Selected parent department does not exist');
    }

    const dept = await this.deptModel.create({
      ...dto,
      code: dto.code.trim().toUpperCase(),
      organizationId: orgId,
      status: 'ACTIVE',
    });

    await this.audit(orgId, userId, 'DEPARTMENT', dept._id, 'DEPARTMENT_CREATED', null, dept);
    return dept;
  }

  async updateDepartment(id: string, dto: UpdateDepartmentDto, orgId: string, userId: string) {
    const dept = await this.getDepartmentById(id, orgId);

    if (dto.code && dto.code.trim().toUpperCase() !== dept.code) {
      const duplicate = await this.deptModel.findOne({
        _id: { $ne: id },
        organizationId: orgId,
        code: dto.code.trim().toUpperCase(),
        isDeleted: false,
      });
      if (duplicate) {
        throw new ConflictException(`Department code "${dto.code}" is already in use`);
      }
    }

    // Circular check
    if (dto.parentId) {
      await this.validateHierarchyChange(id, dto.parentId, orgId);
    }

    const updated = await this.deptModel.findByIdAndUpdate(
      id,
      { ...dto, code: dto.code.trim().toUpperCase() },
      { new: true },
    );

    await this.audit(orgId, userId, 'DEPARTMENT', id, 'DEPARTMENT_UPDATED', dept, updated);
    return updated;
  }

  async updateDepartmentParent(id: string, parentId: string | null, orgId: string, userId: string) {
    const dept = await this.getDepartmentById(id, orgId);
    if (parentId) {
      await this.validateHierarchyChange(id, parentId, orgId);
    }
    const updated = await this.deptModel.findByIdAndUpdate(id, { parentId }, { new: true });
    await this.audit(orgId, userId, 'DEPARTMENT', id, 'DEPARTMENT_HIERARCHY_CHANGED', dept, updated);
    return updated;
  }

  async toggleDepartmentStatus(id: string, orgId: string, userId: string) {
    const dept = await this.getDepartmentById(id, orgId);
    const newStatus = dept.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

    if (newStatus === 'INACTIVE') {
      // Check active children
      const childCount = await this.deptModel.countDocuments({
        parentId: id,
        organizationId: orgId,
        isDeleted: false,
        status: 'ACTIVE',
      });
      if (childCount > 0) {
        throw new UnprocessableEntityException(
          `Cannot deactivate department "${dept.name}" because it has ${childCount} active sub-departments. Reassign them first.`,
        );
      }
    }

    const updated = await this.deptModel.findByIdAndUpdate(id, { status: newStatus }, { new: true });
    await this.audit(
      orgId,
      userId,
      'DEPARTMENT',
      id,
      newStatus === 'ACTIVE' ? 'DEPARTMENT_ACTIVATED' : 'DEPARTMENT_DEACTIVATED',
      dept,
      updated,
    );
    return updated;
  }

  async deleteDepartment(id: string, orgId: string, userId: string) {
    const dept = await this.getDepartmentById(id, orgId);
    const childCount = await this.deptModel.countDocuments({
      parentId: id,
      organizationId: orgId,
      isDeleted: false,
    });
    if (childCount > 0) {
      throw new BadRequestException(
        `Cannot delete department "${dept.name}" with sub-departments attached.`,
      );
    }

    // Deleting a department that still has staff would orphan those employee
    // records — they'd keep a departmentId pointing at nothing, and every
    // department-scoped query would silently drop them.
    const employeeCount = await this.empModel.countDocuments({
      departmentId: id,
      organizationId: orgId,
      isDeleted: false,
    });
    if (employeeCount > 0) {
      throw new BadRequestException(
        `Cannot delete department "${dept.name}": ${employeeCount} active employee${
          employeeCount === 1 ? ' is' : 's are'
        } still assigned to it. Reassign them first.`,
      );
    }

    await this.deptModel.findByIdAndUpdate(id, { isDeleted: true });
    await this.audit(orgId, userId, 'DEPARTMENT', id, 'DEPARTMENT_DELETED', dept, null);
    return { success: true, message: 'Department deleted successfully' };
  }

  private async validateHierarchyChange(deptId: string, newParentId: string, orgId: string) {
    if (deptId === newParentId) {
      throw new BadRequestException('A department cannot be its own parent.');
    }
    // Traversal upward from newParentId to make sure deptId is not an ancestor
    let currentId: string | null = newParentId;
    const visited = new Set<string>();

    while (currentId) {
      if (currentId === deptId) {
        throw new BadRequestException(
          'Circular hierarchy detected: cannot move a parent department underneath one of its descendants.',
        );
      }
      if (visited.has(currentId)) break;
      visited.add(currentId);

      const parentDept = await this.deptModel.findOne({
        _id: currentId,
        organizationId: orgId,
        isDeleted: false,
      });
      currentId = parentDept?.parentId || null;
    }
  }

  // ==========================================
  // 3. DESIGNATIONS
  // ==========================================
  async getDesignations(
    orgId: string,
    query: { search?: string; status?: string; page?: number; pageSize?: number },
  ) {
    const filter: any = { organizationId: orgId, isDeleted: false };
    if (query.status && query.status !== 'ALL') filter.status = query.status;
    if (query.search) {
      const regex = new RegExp(query.search, 'i');
      filter.$or = [{ title: regex }, { code: regex }];
    }

    if (query.page !== undefined || query.pageSize !== undefined) {
      return paginate<Designation>(this.desigModel, filter, {
        page: query.page,
        pageSize: query.pageSize,
      }, { grade: -1, createdAt: -1 });
    }

    return this.desigModel.find(filter).sort({ grade: -1, createdAt: -1 });
  }

  async createDesignation(dto: CreateDesignationDto, orgId: string, userId: string) {
    const existing = await this.desigModel.findOne({
      organizationId: orgId,
      code: dto.code.trim().toUpperCase(),
      isDeleted: false,
    });
    if (existing) {
      throw new ConflictException(`Designation code "${dto.code}" already exists`);
    }

    const desig = await this.desigModel.create({
      ...dto,
      code: dto.code.trim().toUpperCase(),
      organizationId: orgId,
      status: 'ACTIVE',
    });

    await this.audit(orgId, userId, 'DESIGNATION', desig._id, 'DESIGNATION_CREATED', null, desig);
    return desig;
  }

  async updateDesignation(id: string, dto: UpdateDesignationDto, orgId: string, userId: string) {
    const desig = await this.desigModel.findOne({ _id: id, organizationId: orgId, isDeleted: false });
    if (!desig) throw new NotFoundException('Designation not found');

    if (dto.code && dto.code.trim().toUpperCase() !== desig.code) {
      const dup = await this.desigModel.findOne({
        _id: { $ne: id },
        organizationId: orgId,
        code: dto.code.trim().toUpperCase(),
        isDeleted: false,
      });
      if (dup) throw new ConflictException(`Designation code "${dto.code}" already in use`);
    }

    const updated = await this.desigModel.findByIdAndUpdate(
      id,
      { ...dto, code: dto.code.trim().toUpperCase() },
      { new: true },
    );
    await this.audit(orgId, userId, 'DESIGNATION', id, 'DESIGNATION_UPDATED', desig, updated);
    return updated;
  }

  async toggleDesignationStatus(id: string, orgId: string, userId: string) {
    const desig = await this.desigModel.findOne({ _id: id, organizationId: orgId, isDeleted: false });
    if (!desig) throw new NotFoundException('Designation not found');

    const newStatus = desig.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const updated = await this.desigModel.findByIdAndUpdate(id, { status: newStatus }, { new: true });
    await this.audit(orgId, userId, 'DESIGNATION', id, `DESIGNATION_${newStatus}`, desig, updated);
    return updated;
  }

  // ==========================================
  // 4. LOCATIONS
  // ==========================================
  async getLocations(
    orgId: string,
    query: { search?: string; status?: string; page?: number; pageSize?: number },
  ) {
    const filter: any = { organizationId: orgId, isDeleted: false };
    if (query.status && query.status !== 'ALL') filter.status = query.status;
    if (query.search) {
      const regex = new RegExp(query.search, 'i');
      filter.$or = [{ name: regex }, { city: regex }, { country: regex }];
    }

    if (query.page !== undefined || query.pageSize !== undefined) {
      return paginate<Location>(this.locModel, filter, {
        page: query.page,
        pageSize: query.pageSize,
      }, { createdAt: -1 });
    }

    return this.locModel.find(filter).sort({ createdAt: -1 });
  }

  async createLocation(dto: CreateLocationDto, orgId: string, userId: string) {
    const loc = await this.locModel.create({
      ...dto,
      organizationId: orgId,
      status: 'ACTIVE',
    });
    await this.audit(orgId, userId, 'LOCATION', loc._id, 'LOCATION_CREATED', null, loc);
    return loc;
  }

  async updateLocation(id: string, dto: UpdateLocationDto, orgId: string, userId: string) {
    const loc = await this.locModel.findOne({ _id: id, organizationId: orgId, isDeleted: false });
    if (!loc) throw new NotFoundException('Location not found');

    const updated = await this.locModel.findByIdAndUpdate(id, dto, { new: true });
    await this.audit(orgId, userId, 'LOCATION', id, 'LOCATION_UPDATED', loc, updated);
    return updated;
  }

  async toggleLocationStatus(id: string, orgId: string, userId: string) {
    const loc = await this.locModel.findOne({ _id: id, organizationId: orgId, isDeleted: false });
    if (!loc) throw new NotFoundException('Location not found');

    const newStatus = loc.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const updated = await this.locModel.findByIdAndUpdate(id, { status: newStatus }, { new: true });
    await this.audit(orgId, userId, 'LOCATION', id, `LOCATION_${newStatus}`, loc, updated);
    return updated;
  }

  // ==========================================
  // 5. COST CENTERS
  // ==========================================
  async getCostCenters(
    orgId: string,
    query: { search?: string; status?: string; page?: number; pageSize?: number },
  ) {
    const filter: any = { organizationId: orgId, isDeleted: false };
    if (query.status && query.status !== 'ALL') filter.status = query.status;
    if (query.search) {
      const regex = new RegExp(query.search, 'i');
      filter.$or = [{ name: regex }, { code: regex }];
    }

    if (query.page !== undefined || query.pageSize !== undefined) {
      return paginate<CostCenter>(this.ccModel, filter, {
        page: query.page,
        pageSize: query.pageSize,
      }, { createdAt: -1 });
    }

    return this.ccModel.find(filter).sort({ createdAt: -1 });
  }

  async createCostCenter(dto: CreateCostCenterDto, orgId: string, userId: string) {
    const existing = await this.ccModel.findOne({
      organizationId: orgId,
      code: dto.code.trim().toUpperCase(),
      isDeleted: false,
    });
    if (existing) {
      throw new ConflictException(`Cost Center code "${dto.code}" already exists`);
    }

    const cc = await this.ccModel.create({
      ...dto,
      code: dto.code.trim().toUpperCase(),
      organizationId: orgId,
      status: 'ACTIVE',
    });
    await this.audit(orgId, userId, 'COST_CENTER', cc._id, 'COST_CENTER_CREATED', null, cc);
    return cc;
  }

  async updateCostCenter(id: string, dto: UpdateCostCenterDto, orgId: string, userId: string) {
    const cc = await this.ccModel.findOne({ _id: id, organizationId: orgId, isDeleted: false });
    if (!cc) throw new NotFoundException('Cost Center not found');

    if (dto.code && dto.code.trim().toUpperCase() !== cc.code) {
      const dup = await this.ccModel.findOne({
        _id: { $ne: id },
        organizationId: orgId,
        code: dto.code.trim().toUpperCase(),
        isDeleted: false,
      });
      if (dup) throw new ConflictException(`Cost Center code "${dto.code}" already in use`);
    }

    const updated = await this.ccModel.findByIdAndUpdate(
      id,
      { ...dto, code: dto.code.trim().toUpperCase() },
      { new: true },
    );
    await this.audit(orgId, userId, 'COST_CENTER', id, 'COST_CENTER_UPDATED', cc, updated);
    return updated;
  }

  async toggleCostCenterStatus(id: string, orgId: string, userId: string) {
    const cc = await this.ccModel.findOne({ _id: id, organizationId: orgId, isDeleted: false });
    if (!cc) throw new NotFoundException('Cost Center not found');

    const newStatus = cc.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const updated = await this.ccModel.findByIdAndUpdate(id, { status: newStatus }, { new: true });
    await this.audit(orgId, userId, 'COST_CENTER', id, `COST_CENTER_${newStatus}`, cc, updated);
    return updated;
  }
}
