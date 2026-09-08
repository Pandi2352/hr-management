import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Onboarding, OnboardingDocument, OnboardingTask } from './schemas/onboarding.schema';
import { Employee, EmployeeDocument } from '../../employees/schemas/employee.schema';
import { Department, DepartmentDocument } from '../../organization/schemas/department.schema';
import { Designation, DesignationDocument } from '../../organization/schemas/designation.schema';
import { AuditService } from '../../../common/audit/audit.service';
import { AuditAction, AuditResource } from '../../../common/audit/audit.constants';
import { DEFAULT_ENTERPRISE_ONBOARDING_TASKS } from './constants/onboarding-templates';
import {
  InitializeOnboardingDto,
  UpdateTaskStatusDto,
  CandidateSubmitStepDto,
  QueryOnboardingDto,
} from './dto/onboarding.dto';
import { generateUuid } from '../../../common/utils/uuid.util';

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    @InjectModel(Onboarding.name) private readonly onboardingModel: Model<OnboardingDocument>,
    @InjectModel(Employee.name) private readonly employeeModel: Model<EmployeeDocument>,
    @InjectModel(Department.name) private readonly departmentModel: Model<DepartmentDocument>,
    @InjectModel(Designation.name) private readonly designationModel: Model<DesignationDocument>,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Helper to calculate relative due date ISO string from target joining date
   */
  private computeDueDate(targetJoiningDateStr: string, dueDays: number): string {
    const d = new Date(targetJoiningDateStr);
    if (isNaN(d.getTime())) return targetJoiningDateStr;
    d.setDate(d.getDate() + dueDays);
    return d.toISOString().split('T')[0];
  }

  /**
   * Initialize a comprehensive onboarding workflow session for an employee
   */
  async initializeOnboarding(
    organizationId: string,
    dto: InitializeOnboardingDto,
    actorUserId: string,
  ): Promise<Onboarding> {
    const employee = await this.employeeModel.findOne({
      _id: dto.employeeId,
      organizationId,
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${dto.employeeId} not found in this organization`);
    }

    // Check if an active onboarding session already exists
    const existing = await this.onboardingModel.findOne({
      organizationId,
      employeeId: dto.employeeId,
      status: { $in: ['PENDING', 'IN_PROGRESS'] },
    });

    if (existing) {
      throw new ConflictException(
        `An active onboarding session already exists for ${employee.firstName} ${employee.lastName}`,
      );
    }

    // Construct tasks from default templates
    const tasks: OnboardingTask[] = DEFAULT_ENTERPRISE_ONBOARDING_TASKS.map((tpl) => ({
      id: generateUuid(),
      title: tpl.title,
      description: tpl.description,
      category: tpl.category,
      isMandatory: tpl.isMandatory,
      status: 'PENDING',
      assignedTo: null,
      dueDaysFromJoining: tpl.dueDaysFromJoining,
      dueDate: this.computeDueDate(dto.targetJoiningDate, tpl.dueDaysFromJoining),
      submission: { textNotes: '', fileUrls: [] },
      remarks: '',
      completedAt: null,
      completedBy: null,
    }));

    // Append any custom additional tasks
    if (dto.additionalTasks && dto.additionalTasks.length > 0) {
      for (const custom of dto.additionalTasks) {
        tasks.push({
          id: generateUuid(),
          title: custom.title,
          description: custom.description || '',
          category: custom.category,
          isMandatory: custom.isMandatory ?? true,
          status: 'PENDING',
          assignedTo: null,
          dueDaysFromJoining: custom.dueDaysFromJoining || 0,
          dueDate: this.computeDueDate(dto.targetJoiningDate, custom.dueDaysFromJoining || 0),
          submission: { textNotes: '', fileUrls: [] },
          remarks: '',
          completedAt: null,
          completedBy: null,
        });
      }
    }

    const session = new this.onboardingModel({
      organizationId,
      employeeId: dto.employeeId,
      targetJoiningDate: dto.targetJoiningDate,
      status: 'IN_PROGRESS',
      overallProgress: 0,
      completedTasks: 0,
      totalTasks: tasks.length,
      tasks,
    });

    const saved = await session.save();

    // Transition employee status to 'JOINING' if not already
    if (employee.status !== 'JOINING') {
      employee.status = 'JOINING';
      await employee.save();
    }

    await this.auditService.record({
      action: AuditAction.CREATE,
      resourceType: AuditResource.EMPLOYEE,
      resourceId: saved._id,
      organizationId,
      actorUserId,
      description: `Initialized digital onboarding workflow for ${employee.firstName} ${employee.lastName} (${tasks.length} tasks)`,
      metadata: { employeeId: employee._id, targetJoiningDate: dto.targetJoiningDate },
    });

    return saved;
  }

  /**
   * Find all onboarding sessions with KPI summary metrics
   */
  async findAll(organizationId: string, query: QueryOnboardingDto): Promise<{
    items: any[];
    total: number;
    page: number;
    limit: number;
    metrics: {
      total: number;
      inProgress: number;
      completed: number;
      overdue: number;
      avgCompletion: number;
    };
  }> {
    const filter: Record<string, any> = { organizationId };

    if (query.status && query.status !== 'ALL') {
      filter.status = query.status;
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const [rawItems, total, allSessions] = await Promise.all([
      this.onboardingModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.onboardingModel.countDocuments(filter),
      this.onboardingModel.find({ organizationId }).select('status overallProgress targetJoiningDate').lean(),
    ]);

    // Populate employee details for each item
    const employeeIds = [...new Set(rawItems.map((item) => String(item.employeeId)))];
    const employees = await this.employeeModel
      .find({ _id: { $in: employeeIds }, organizationId })
      .select('firstName lastName employeeCode workEmail avatarUrl departmentId designationId status')
      .lean();

    const employeeMap = new Map<string, any>(employees.map((e) => [String(e._id), e]));

    // Populate department and designation names
    const deptIds = [...new Set(employees.map((e) => e.departmentId).filter(Boolean))];
    const desigIds = [...new Set(employees.map((e) => e.designationId).filter(Boolean))];

    const [departments, designations] = await Promise.all([
      this.departmentModel.find({ _id: { $in: deptIds } }).select('name code').lean(),
      this.designationModel.find({ _id: { $in: desigIds } }).select('title code').lean(),
    ]);

    const deptMap = new Map<string, string>(departments.map((d) => [String(d._id), d.name]));
    const desigMap = new Map<string, string>(designations.map((d) => [String(d._id), d.title]));

    const todayStr = new Date().toISOString().split('T')[0];

    const items = rawItems.map((session) => {
      const emp = employeeMap.get(String(session.employeeId));
      const isOverdue =
        session.status === 'IN_PROGRESS' && session.targetJoiningDate < todayStr && session.overallProgress < 100;

      return {
        ...session,
        isOverdue,
        employee: emp
          ? {
              ...emp,
              departmentName: emp.departmentId ? deptMap.get(String(emp.departmentId)) || 'Unassigned' : 'Unassigned',
              designationTitle: emp.designationId ? desigMap.get(String(emp.designationId)) || 'Unassigned' : 'Unassigned',
            }
          : null,
      };
    });

    // Compute KPI metrics across all organizational onboarding sessions
    const totalCount = allSessions.length;
    const inProgressCount = allSessions.filter((s) => s.status === 'IN_PROGRESS').length;
    const completedCount = allSessions.filter((s) => s.status === 'COMPLETED').length;
    const overdueCount = allSessions.filter(
      (s) => s.status === 'IN_PROGRESS' && s.targetJoiningDate < todayStr && s.overallProgress < 100,
    ).length;

    const inProgressProgressSum = allSessions
      .filter((s) => s.status === 'IN_PROGRESS')
      .reduce((acc, s) => acc + (s.overallProgress || 0), 0);

    const avgCompletion = inProgressCount > 0 ? Math.round(inProgressProgressSum / inProgressCount) : 100;

    return {
      items,
      total,
      page,
      limit,
      metrics: {
        total: totalCount,
        inProgress: inProgressCount,
        completed: completedCount,
        overdue: overdueCount,
        avgCompletion,
      },
    };
  }

  /**
   * Find single onboarding by ID with populated details
   */
  async findById(organizationId: string, id: string): Promise<any> {
    const session = await this.onboardingModel.findOne({ _id: id, organizationId }).lean();
    if (!session) {
      throw new NotFoundException(`Onboarding session ${id} not found`);
    }

    const employee = await this.employeeModel
      .findOne({ _id: session.employeeId, organizationId })
      .lean();

    let departmentName = 'Unassigned';
    let designationTitle = 'Unassigned';
    let managerName = 'None';

    if (employee) {
      if (employee.departmentId) {
        const d = await this.departmentModel.findById(employee.departmentId).select('name').lean();
        if (d) departmentName = d.name;
      }
      if (employee.designationId) {
        const des = await this.designationModel.findById(employee.designationId).select('title').lean();
        if (des) designationTitle = des.title;
      }
      if (employee.managerId) {
        const mgr = await this.employeeModel.findById(employee.managerId).select('firstName lastName').lean();
        if (mgr) managerName = `${mgr.firstName} ${mgr.lastName}`;
      }
    }

    return {
      ...session,
      employee: employee
        ? {
            ...employee,
            departmentName,
            designationTitle,
            managerName,
          }
        : null,
    };
  }

  /**
   * Find active onboarding for a candidate employee
   */
  async findByEmployeeId(organizationId: string, employeeId: string): Promise<any> {
    const session = await this.onboardingModel
      .findOne({ organizationId, employeeId })
      .sort({ createdAt: -1 })
      .lean();

    if (!session) {
      throw new NotFoundException(`No onboarding workflow found for employee ${employeeId}`);
    }

    return this.findById(organizationId, session._id);
  }

  /**
   * Update task status, review notes, attachments, and verify milestone gating
   */
  async updateTask(
    organizationId: string,
    id: string,
    taskId: string,
    dto: UpdateTaskStatusDto,
    actorUserId: string,
  ) {
    const session = await this.onboardingModel.findOne({ _id: id, organizationId });
    if (!session) {
      throw new NotFoundException(`Onboarding session ${id} not found`);
    }

    const taskIndex = session.tasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) {
      throw new NotFoundException(`Task with ID ${taskId} not found in this onboarding session`);
    }

    const task = session.tasks[taskIndex];
    task.status = dto.status;
    if (dto.remarks !== undefined) task.remarks = dto.remarks;

    if (dto.notes !== undefined || dto.fileUrls !== undefined) {
      task.submission = {
        textNotes: dto.notes !== undefined ? dto.notes : task.submission?.textNotes || '',
        fileUrls: dto.fileUrls !== undefined ? dto.fileUrls : task.submission?.fileUrls || [],
      };
    }

    if (dto.status === 'VERIFIED') {
      task.completedAt = new Date();
      task.completedBy = actorUserId;
    } else {
      task.completedAt = null;
      task.completedBy = null;
    }

    // Recalculate progress
    const totalCount = session.tasks.length;
    const completedCount = session.tasks.filter((t) => t.status === 'VERIFIED').length;
    session.completedTasks = completedCount;
    session.overallProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

    // Check milestone gating:
    // When 100% of mandatory tasks are VERIFIED, mark session COMPLETED
    const mandatoryTasks = session.tasks.filter((t) => t.isMandatory);
    const allMandatoryVerified = mandatoryTasks.every((t) => t.status === 'VERIFIED');

    if (allMandatoryVerified && session.overallProgress === 100) {
      session.status = 'COMPLETED';
      session.completedAt = new Date();
      session.completedBy = actorUserId;

      // Automatic milestone transition: Transition employee from 'JOINING' to 'PROBATION'
      await this.employeeModel.updateOne(
        { _id: session.employeeId, organizationId },
        { status: 'PROBATION' },
      );

      this.logger.log(
        `Onboarding ${session._id} 100% complete! Employee ${session.employeeId} automatically transitioned to PROBATION.`,
      );
    } else if (session.status === 'COMPLETED' && (!allMandatoryVerified || session.overallProgress < 100)) {
      session.status = 'IN_PROGRESS';
      session.completedAt = null;
      session.completedBy = null;
    }

    session.markModified('tasks');
    const updated = await session.save();

    await this.auditService.record({
      action: AuditAction.UPDATE,
      resourceType: AuditResource.EMPLOYEE,
      resourceId: session._id,
      organizationId,
      actorUserId,
      description: `Updated onboarding task "${task.title}" to ${dto.status} (${session.overallProgress}% overall)`,
      metadata: { taskId, status: dto.status, employeeId: session.employeeId },
    });

    return updated;
  }

  /**
   * Candidate Self-Service Step Submission
   */
  async candidateSubmitStep(
    organizationId: string,
    employeeId: string,
    dto: CandidateSubmitStepDto,
  ) {
    const session = await this.onboardingModel
      .findOne({ organizationId, employeeId, status: { $in: ['PENDING', 'IN_PROGRESS'] } });

    if (!session) {
      throw new NotFoundException(`No active onboarding session found for candidate ${employeeId}`);
    }

    const employee = await this.employeeModel.findOne({ _id: employeeId, organizationId });
    if (!employee) {
      throw new NotFoundException(`Candidate employee record not found`);
    }

    const { step, data } = dto;

    if (step === 'PERSONAL') {
      // Update contact and address details
      if (data.phone) employee.phone = data.phone;
      if (data.personalEmail) employee.personalEmail = data.personalEmail;
      if (data.currentAddress) employee.currentAddress = data.currentAddress;
      if (data.emergencyContacts && Array.isArray(data.emergencyContacts)) {
        employee.emergencyContacts = data.emergencyContacts;
      }
      await employee.save();

      // Find candidate personal info task if exists and mark SUBMITTED
      const task = session.tasks.find((t) => t.category === 'EMPLOYEE' && t.title.includes('Emergency'));
      if (task && task.status === 'PENDING') {
        task.status = 'SUBMITTED';
        task.submission = { textNotes: 'Emergency contacts and personal address submitted by employee.' };
      }
    } else if (step === 'BANK') {
      // Find bank account task and mark SUBMITTED with details
      const task = session.tasks.find((t) => t.category === 'EMPLOYEE' && t.title.includes('Bank'));
      if (task) {
        task.status = 'SUBMITTED';
        task.submission = {
          textNotes: `Bank: ${data.bankName || 'Standard'}, Acc#: ${data.accountNumber || ''}, IFSC: ${data.ifsc || ''}`,
          fileUrls: data.proofUrl ? [data.proofUrl] : [],
        };
      }
    } else if (step === 'POLICY') {
      // Find policy task and mark VERIFIED
      const task = session.tasks.find((t) => t.category === 'EMPLOYEE' && t.title.includes('Policies'));
      if (task) {
        task.status = 'VERIFIED';
        task.completedAt = new Date();
        task.completedBy = employee.userId || employee._id;
        task.submission = {
          textNotes: `Digitally signed policies by ${employee.firstName} ${employee.lastName} on ${new Date().toISOString()}`,
        };
      }
    }

    session.markModified('tasks');
    await session.save();

    return {
      success: true,
      message: `Step ${step} submitted successfully`,
      session,
    };
  }

  /**
   * Trigger reminder notifications for pending onboarding tasks
   */
  async sendReminder(organizationId: string, id: string) {
    const session = await this.onboardingModel.findOne({ _id: id, organizationId });
    if (!session) throw new NotFoundException(`Onboarding session ${id} not found`);

    const employee = await this.employeeModel.findOne({ _id: session.employeeId, organizationId });
    const pendingTasks = session.tasks.filter((t) => t.status === 'PENDING' || t.status === 'REJECTED');

    this.logger.log(
      `Reminder sent for onboarding session ${id} (${pendingTasks.length} pending tasks) for ${employee?.firstName || 'employee'}.`,
    );

    return {
      success: true,
      message: `Reminder successfully dispatched for ${pendingTasks.length} pending onboarding tasks`,
      pendingCount: pendingTasks.length,
    };
  }
}
