import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  LifecycleTransition,
  LifecycleTransitionDocument,
} from './schemas/lifecycle-transition.schema';
import { Employee, EmployeeDocument } from '../../employees/schemas/employee.schema';
import { Department, DepartmentDocument } from '../../organization/schemas/department.schema';
import { Designation, DesignationDocument } from '../../organization/schemas/designation.schema';
import { CreateTransitionDto, QueryTransitionDto } from './dto/transition.dto';

@Injectable()
export class TransitionsService {
  private readonly logger = new Logger(TransitionsService.name);

  constructor(
    @InjectModel(LifecycleTransition.name)
    private readonly transitionModel: Model<LifecycleTransitionDocument>,
    @InjectModel(Employee.name)
    private readonly employeeModel: Model<EmployeeDocument>,
    @InjectModel(Department.name)
    private readonly deptModel: Model<DepartmentDocument>,
    @InjectModel(Designation.name)
    private readonly desgModel: Model<DesignationDocument>,
  ) {}

  async listTransitions(organizationId: string, query: QueryTransitionDto): Promise<any> {
    const [departments, designations] = await Promise.all([
      this.deptModel.find({ organizationId }).lean().exec(),
      this.desgModel.find({ organizationId }).lean().exec(),
    ]);

    const deptMap = new Map<string, string>(departments.map((d: any) => [String(d._id), d.name]));
    const desgMap = new Map<string, string>(designations.map((d: any) => [String(d._id), d.title]));

    const transitions: any[] = await this.transitionModel
      .find({ organizationId })
      .sort({ effectiveDate: -1, createdAt: -1 })
      .lean()
      .exec();

    const empIds = Array.from(new Set(transitions.map((t) => t.employeeId)));
    const employees: any[] = await this.employeeModel
      .find({ _id: { $in: empIds } })
      .lean()
      .exec();
    const empMap = new Map<string, any>(employees.map((e: any) => [String(e._id), e]));

    const enriched = transitions.map((t) => {
      const emp = empMap.get(t.employeeId);
      return {
        ...t,
        employee: emp
          ? {
              _id: emp._id,
              employeeCode: emp.employeeCode,
              displayName: emp.displayName || `${emp.firstName} ${emp.lastName}`,
              firstName: emp.firstName,
              lastName: emp.lastName,
              workEmail: emp.workEmail,
              avatarUrl: emp.avatarUrl || null,
              departmentName: emp.departmentId ? deptMap.get(emp.departmentId) || 'Unassigned' : 'Unassigned',
              designationTitle: emp.designationId ? desgMap.get(emp.designationId) || 'Staff' : 'Staff',
            }
          : null,
      };
    });

    // Metrics
    const metrics = {
      totalTransitions: enriched.length,
      promotions: enriched.filter((t) => t.type === 'PROMOTION').length,
      transfers: enriched.filter((t) => t.type === 'DEPARTMENT_TRANSFER').length,
      managerChanges: enriched.filter((t) => t.type === 'MANAGER_CHANGE').length,
      confirmations: enriched.filter((t) => t.type === 'CONFIRMATION').length,
    };

    // Filter
    let filtered = enriched;
    if (query.type && query.type !== 'ALL') {
      filtered = filtered.filter((t) => t.type === query.type);
    }
    if (query.status && query.status !== 'ALL') {
      filtered = filtered.filter((t) => t.status === query.status);
    }
    if (query.employeeId) {
      filtered = filtered.filter((t) => t.employeeId === query.employeeId);
    }
    if (query.search && query.search.trim()) {
      const s = query.search.trim().toLowerCase();
      filtered = filtered.filter((t) => {
        const title = t.title?.toLowerCase() || '';
        const name = t.employee?.displayName?.toLowerCase() || '';
        const code = t.employee?.employeeCode?.toLowerCase() || '';
        return title.includes(s) || name.includes(s) || code.includes(s);
      });
    }

    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const pagedData = filtered.slice(start, start + pageSize);

    return {
      data: pagedData,
      metrics,
      total,
      page,
      pageSize,
    };
  }

  async createTransition(
    organizationId: string,
    initiatedBy: string,
    dto: CreateTransitionDto,
  ): Promise<any> {
    const employee = await this.employeeModel.findOne({ _id: dto.employeeId, organizationId }).exec();
    if (!employee) {
      throw new NotFoundException(`Employee with ID "${dto.employeeId}" not found.`);
    }

    // Resolve previous names
    let prevDeptName = 'Unassigned';
    let prevDesgTitle = 'Staff';
    let prevManagerName = 'None';

    if (employee.departmentId) {
      const dept = await this.deptModel.findById(employee.departmentId).lean().exec();
      if (dept) prevDeptName = dept.name;
    }
    if (employee.designationId) {
      const desg = await this.desgModel.findById(employee.designationId).lean().exec();
      if (desg) prevDesgTitle = desg.title;
    }
    if (employee.managerId) {
      const mgr = await this.employeeModel.findById(employee.managerId).lean().exec();
      if (mgr) prevManagerName = mgr.displayName || `${mgr.firstName} ${mgr.lastName}`;
    }

    // Resolve new names
    let newDeptName = prevDeptName;
    let newDesgTitle = prevDesgTitle;
    let newManagerName = prevManagerName;

    if (dto.newDepartmentId) {
      const dept = await this.deptModel.findById(dto.newDepartmentId).lean().exec();
      if (dept) newDeptName = dept.name;
    }
    if (dto.newDesignationId) {
      const desg = await this.desgModel.findById(dto.newDesignationId).lean().exec();
      if (desg) newDesgTitle = desg.title;
    }
    if (dto.newManagerId) {
      const mgr = await this.employeeModel.findById(dto.newManagerId).lean().exec();
      if (mgr) newManagerName = mgr.displayName || `${mgr.firstName} ${mgr.lastName}`;
    }

    const previousState = {
      departmentId: employee.departmentId || null,
      departmentName: prevDeptName,
      designationId: employee.designationId || null,
      designationTitle: prevDesgTitle,
      managerId: employee.managerId || null,
      managerName: prevManagerName,
      employmentType: employee.employmentType,
    };

    const newState = {
      departmentId: dto.newDepartmentId || employee.departmentId || null,
      departmentName: newDeptName,
      designationId: dto.newDesignationId || employee.designationId || null,
      designationTitle: newDesgTitle,
      managerId: dto.newManagerId || employee.managerId || null,
      managerName: newManagerName,
      employmentType: dto.newEmploymentType || employee.employmentType,
    };

    const transition = await this.transitionModel.create({
      organizationId,
      employeeId: employee._id,
      type: dto.type,
      effectiveDate: dto.effectiveDate,
      title: dto.title,
      justification: dto.justification || '',
      previousState,
      newState,
      status: 'APPLIED',
      initiatedBy,
      approvedBy: initiatedBy,
      appliedAt: new Date(),
    });

    // Apply updates directly to Employee profile
    const updatePayload: Record<string, any> = {};
    if (dto.newDepartmentId) updatePayload.departmentId = dto.newDepartmentId;
    if (dto.newDesignationId) updatePayload.designationId = dto.newDesignationId;
    if (dto.newManagerId) updatePayload.managerId = dto.newManagerId;
    if (dto.newEmploymentType) updatePayload.employmentType = dto.newEmploymentType;

    if (Object.keys(updatePayload).length > 0) {
      await this.employeeModel.updateOne({ _id: employee._id }, { $set: updatePayload });
    }

    return transition;
  }

  async getEmployeeTimeline(organizationId: string, employeeId: string): Promise<any> {
    const employee = await this.employeeModel.findOne({ _id: employeeId, organizationId }).lean().exec();
    if (!employee) {
      throw new NotFoundException(`Employee with ID "${employeeId}" not found.`);
    }

    const transitions = await this.transitionModel
      .find({ organizationId, employeeId })
      .sort({ effectiveDate: -1, createdAt: -1 })
      .lean()
      .exec();

    // Map transitions to timeline milestone items
    const events: Array<{
      id: string;
      date: string;
      title: string;
      description: string;
      type: string;
      badgeColor: string;
      meta?: Record<string, any>;
    }> = [];

    // 1. Initial Joining Event
    if (employee.joiningDate) {
      events.push({
        id: `joining-${employee._id}`,
        date: employee.joiningDate,
        title: 'Joined the Organization',
        description: `Started as ${employee.employmentType} employee under code ${employee.employeeCode}.`,
        type: 'JOINING',
        badgeColor: 'emerald',
      });
    }

    // 2. Probation Confirmation if active
    if (employee.confirmationDate) {
      events.push({
        id: `confirmation-${employee._id}`,
        date: employee.confirmationDate,
        title: 'Probation Confirmed',
        description: 'Successfully completed probation period and confirmed as regular staff member.',
        type: 'CONFIRMATION',
        badgeColor: 'blue',
      });
    }

    // 3. Lifecycle Transitions
    for (const t of transitions) {
      let badgeColor = 'indigo';
      if (t.type === 'PROMOTION') badgeColor = 'purple';
      else if (t.type === 'DEPARTMENT_TRANSFER') badgeColor = 'teal';
      else if (t.type === 'MANAGER_CHANGE') badgeColor = 'amber';

      events.push({
        id: t._id,
        date: t.effectiveDate,
        title: t.title,
        description: t.justification || `Transition recorded from ${t.previousState?.designationTitle || 'previous role'} to ${t.newState?.designationTitle || 'new role'}.`,
        type: t.type,
        badgeColor,
        meta: {
          previousState: t.previousState,
          newState: t.newState,
        },
      });
    }

    // Sort descending by date
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      employee: {
        _id: employee._id,
        employeeCode: employee.employeeCode,
        displayName: employee.displayName || `${employee.firstName} ${employee.lastName}`,
        status: employee.status,
        avatarUrl: employee.avatarUrl || null,
      },
      events,
    };
  }
}
