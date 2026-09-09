import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LeaveRequest, LeaveRequestDocument } from './schemas/leave-request.schema';
import { LeaveType, LeaveTypeDocument } from './schemas/leave-type.schema';
import { LeaveBalance, LeaveBalanceDocument } from './schemas/leave-balance.schema';
import { Employee, EmployeeDocument } from '../employees/schemas/employee.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { AuditService } from '../../common/audit/audit.service';
import { AuditAction, AuditResource } from '../../common/audit/audit.constants';
import { PERMISSIONS } from '../../common/constants';
import { CreateLeaveRequestDto } from './dto/leave-request.dto';

export interface RequestUser {
  userId: string;
  email?: string;
  roles?: string[];
  permissions?: string[];
}

function daysBetween(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.round(ms / 86400000) + 1;
}

@Injectable()
export class LeaveRequestService {
  constructor(
    @InjectModel(LeaveRequest.name) private readonly requestModel: Model<LeaveRequestDocument>,
    @InjectModel(LeaveType.name) private readonly leaveTypeModel: Model<LeaveTypeDocument>,
    @InjectModel(LeaveBalance.name) private readonly balanceModel: Model<LeaveBalanceDocument>,
    @InjectModel(Employee.name) private readonly empModel: Model<EmployeeDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly auditService: AuditService,
  ) {}

  private hasPerm(user: RequestUser, perm: string): boolean {
    const roles = (user.roles || []).map((r) => String(r).toUpperCase());
    if (roles.includes('SUPER_ADMIN')) return true;
    return (user.permissions || []).includes('*') || (user.permissions || []).includes(perm);
  }

  private async resolveEmployee(orgId: string, user: RequestUser) {
    if (user?.userId) {
      const byUser = await this.empModel
        .findOne({ organizationId: orgId, userId: user.userId, isDeleted: false })
        .lean();
      if (byUser) return byUser;
    }
    const cleanEmail = (user?.email || '').toLowerCase().trim();
    if (cleanEmail) {
      const byEmail = await this.empModel
        .findOne({
          organizationId: orgId,
          isDeleted: false,
          $or: [{ workEmail: cleanEmail }, { personalEmail: cleanEmail }],
        })
        .lean();
      if (byEmail) return byEmail;
    }
    throw new NotFoundException('No employee record is linked to this login.');
  }

  private async audit(orgId: string, userId: string, action: AuditAction, entityId: string, description: string, before: any = null, after: any = null) {
    await this.auditService.record({
      action,
      resourceType: AuditResource.LEAVE_REQUEST,
      resourceId: entityId,
      organizationId: orgId,
      actorUserId: userId,
      description,
      before,
      after,
    });
  }

  private async enrich(requests: any[], orgId: string) {
    const empIds = [...new Set(requests.map((r: any) => String(r.employeeId)))];
    const typeIds = [...new Set(requests.map((r: any) => String(r.leaveTypeId)))];
    const [employees, types] = await Promise.all([
      this.empModel.find({ _id: { $in: empIds } }, '_id employeeCode firstName lastName displayName avatarUrl managerId departmentId').lean(),
      this.leaveTypeModel.find({ _id: { $in: typeIds } }).lean(),
    ]);
    const empMap = new Map(employees.map((e: any) => [String(e._id), e]));
    const typeMap = new Map(types.map((t: any) => [String(t._id), t]));
    return requests.map((r: any) => {
      const e: any = empMap.get(String(r.employeeId));
      const t: any = typeMap.get(String(r.leaveTypeId));
      return {
        ...r,
        employee: e
          ? { _id: e._id, employeeCode: e.employeeCode, displayName: e.displayName || `${e.firstName} ${e.lastName}`.trim(), avatarUrl: e.avatarUrl || null, managerId: e.managerId || null }
          : null,
        leaveType: t ? { _id: t._id, code: t.code, name: t.name } : null,
      };
    });
  }

  // ------------------------------------------------------------------- apply

  async apply(dto: CreateLeaveRequestDto, orgId: string, user: RequestUser) {
    const employee: any = await this.resolveEmployee(orgId, user);
    if (dto.endDate < dto.startDate) throw new BadRequestException('End date cannot be before start date.');

    const leaveType: any = await this.leaveTypeModel
      .findOne({ _id: dto.leaveTypeId, organizationId: orgId, status: 'ACTIVE', isDeleted: false })
      .lean();
    if (!leaveType) throw new NotFoundException('Leave type not found or inactive.');

    let totalDays = daysBetween(dto.startDate, dto.endDate);
    if (dto.isHalfDay) {
      if (dto.startDate !== dto.endDate) throw new BadRequestException('Half-day leave must be a single day.');
      totalDays = 0.5;
    }

    // Balance hold (skipped for unpaid leave).
    let balance: any = null;
    if (leaveType.code !== 'LOP') {
      balance = await this.balanceModel.findOne({
        organizationId: orgId,
        employeeId: String(employee._id),
        leaveTypeId: String(leaveType._id),
        year: Number(dto.startDate.slice(0, 4)),
        isDeleted: false,
      });
      const available = balance
        ? (balance.allocated || 0) + (balance.carriedForward || 0) - (balance.used || 0) - (balance.pending || 0)
        : 0;
      if (available < totalDays) {
        throw new BadRequestException(
          `Insufficient ${leaveType.name} balance — available ${available}, requested ${totalDays}.`,
        );
      }
      if (balance) {
        await this.balanceModel.updateOne({ _id: balance._id }, { $inc: { pending: totalDays } });
      }
    }

    // Manager stage: skipped when the employee has no reporting manager.
    const managerDoc: any = employee.managerId
      ? await this.empModel.findOne({ _id: employee.managerId, isDeleted: false }, '_id firstName lastName displayName').lean()
      : null;

    const steps: any[] = [
      {
        stage: 'SUBMITTED',
        approverId: String(employee._id),
        approverName: employee.displayName || `${employee.firstName} ${employee.lastName}`.trim(),
        action: 'APPROVED',
        comments: dto.reason?.trim() || '',
        actedAt: new Date(),
      },
      managerDoc
        ? { stage: 'MANAGER', approverId: String(managerDoc._id), approverName: managerDoc.displayName || `${managerDoc.firstName} ${managerDoc.lastName}`.trim(), action: 'PENDING', comments: '', actedAt: null }
        : { stage: 'MANAGER', approverId: null, approverName: '', action: 'SKIPPED', comments: 'No reporting manager — routed to HR.', actedAt: new Date() },
      { stage: 'HR', approverId: null, approverName: '', action: 'PENDING', comments: '', actedAt: null },
    ];

    const created = await this.requestModel.create({
      organizationId: orgId,
      employeeId: String(employee._id),
      leaveTypeId: String(leaveType._id),
      startDate: dto.startDate,
      endDate: dto.endDate,
      totalDays,
      isHalfDay: !!dto.isHalfDay,
      reason: dto.reason?.trim() || '',
      status: managerDoc ? 'PENDING_MANAGER' : 'PENDING_HR',
      steps,
    });

    await this.audit(orgId, user.userId, AuditAction.CREATE, String(created._id), `${employee.displayName || employee.firstName} applied ${totalDays} day(s) of ${leaveType.name} (${dto.startDate} → ${dto.endDate})`, null, created);
    return created;
  }

  // -------------------------------------------------------------------- lists

  async myRequests(orgId: string, user: RequestUser, status?: string) {
    const employee: any = await this.resolveEmployee(orgId, user);
    const filter: any = { organizationId: orgId, employeeId: String(employee._id), isDeleted: false };
    if (status && status !== 'ALL') filter.status = status;
    const rows = await this.requestModel.find(filter).sort({ createdAt: -1 }).lean();
    return this.enrich(rows, orgId);
  }

  /**
   * Approval inbox: items waiting on ME — reporting-manager stage for my
   * direct reports, HR stage for leave managers.
   */
  async inbox(orgId: string, user: RequestUser, status?: string) {
    const me: any = await this.empModel
      .findOne({
        organizationId: orgId,
        isDeleted: false,
        $or: [
          ...(user.userId ? [{ userId: user.userId }] : []),
          ...((user.email || '').trim() ? [{ workEmail: user.email!.toLowerCase().trim() }, { personalEmail: user.email!.toLowerCase().trim() }] : []),
        ],
      })
      .lean()
      .catch(() => null);

    const iManageLeave = this.hasPerm(user, PERMISSIONS.LEAVE_MANAGE);
    const or: any[] = [];
    if (me) or.push({ status: 'PENDING_MANAGER', employeeId: { $ne: String(me._id) } });
    if (iManageLeave) or.push({ status: 'PENDING_HR' });
    if (or.length === 0) return [];

    const filter: any = { organizationId: orgId, isDeleted: false, $or: or };
    if (status && status !== 'ALL') filter.status = status;
    const rows = await this.requestModel.find(filter).sort({ createdAt: -1 }).lean();
    let enriched = await this.enrich(rows, orgId);

    // Manager stage is only actionable by the requester's reporting manager
    // (HR acts at the HR stage). Filter out other managers' reports.
    if (me && !iManageLeave) {
      enriched = enriched.filter((r: any) => r.employee?.managerId === String(me._id));
    } else if (me) {
      enriched = enriched.filter(
        (r: any) =>
          r.status === 'PENDING_HR' || r.employee?.managerId === String(me._id),
      );
    }
    return enriched;
  }

  async allRequests(orgId: string, query: { status?: string; employeeId?: string }) {
    const filter: any = { organizationId: orgId, isDeleted: false };
    if (query.status && query.status !== 'ALL') filter.status = query.status;
    if (query.employeeId) filter.employeeId = query.employeeId;
    const rows = await this.requestModel.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    return this.enrich(rows, orgId);
  }

  // ------------------------------------------------------------------ decide

  private async loadForDecision(id: string, orgId: string) {
    const request: any = await this.requestModel.findOne({ _id: id, organizationId: orgId, isDeleted: false });
    if (!request) throw new NotFoundException('Leave request not found.');
    if (!['PENDING_MANAGER', 'PENDING_HR'].includes(request.status)) {
      throw new BadRequestException(`Request is already ${request.status.toLowerCase().replace('_', ' ')}.`);
    }
    return request;
  }

  private actorName(user: RequestUser): string {
    return (user as any).name || user.email || 'Reviewer';
  }

  /** Releases the pending hold back to the wallet (rejections & cancels). */
  private async releaseHold(request: any) {
    const leaveType: any = await this.leaveTypeModel.findById(request.leaveTypeId).lean();
    if (!leaveType || leaveType.code === 'LOP') return;
    await this.balanceModel.updateOne(
      {
        organizationId: request.organizationId,
        employeeId: request.employeeId,
        leaveTypeId: request.leaveTypeId,
        year: Number(String(request.startDate).slice(0, 4)),
        isDeleted: false,
      },
      { $inc: { pending: -request.totalDays } },
    );
  }

  /** Moves the pending hold into used days on final HR approval. */
  private async consumeHold(request: any) {
    const leaveType: any = await this.leaveTypeModel.findById(request.leaveTypeId).lean();
    if (!leaveType || leaveType.code === 'LOP') return;
    await this.balanceModel.updateOne(
      {
        organizationId: request.organizationId,
        employeeId: request.employeeId,
        leaveTypeId: request.leaveTypeId,
        year: Number(String(request.startDate).slice(0, 4)),
        isDeleted: false,
      },
      { $inc: { pending: -request.totalDays, used: request.totalDays } },
    );
  }

  async managerDecide(id: string, approve: boolean, comments: string, orgId: string, user: RequestUser) {
    const request = await this.loadForDecision(id, orgId);
    if (request.status !== 'PENDING_MANAGER') throw new BadRequestException('Request is not waiting on the manager.');

    const me: any = await this.resolveEmployee(orgId, user).catch(() => null);
    const requester: any = await this.empModel.findById(request.employeeId).lean();
    const isManager = me && requester && String(requester.managerId) === String(me._id);
    if (!isManager) throw new ForbiddenException('Only the reporting manager can decide at this stage.');

    const before = request.toObject();
    const step = request.steps.find((s: any) => s.stage === 'MANAGER' && s.action === 'PENDING');
    if (step) {
      step.action = approve ? 'APPROVED' : 'REJECTED';
      step.comments = comments || '';
      step.actedAt = new Date();
    }
    request.status = approve ? 'PENDING_HR' : 'REJECTED';
    if (!approve) await this.releaseHold(request);
    await request.save();

    await this.audit(orgId, user.userId, AuditAction.UPDATE, String(request._id), `Manager ${approve ? 'approved' : 'rejected'} leave request (${request.totalDays} day(s), ${request.startDate} → ${request.endDate})`, before, request.toObject());
    return request;
  }

  async hrDecide(id: string, approve: boolean, comments: string, orgId: string, user: RequestUser) {
    const request = await this.loadForDecision(id, orgId);
    if (!this.hasPerm(user, PERMISSIONS.LEAVE_MANAGE)) {
      throw new ForbiddenException('Only HR can give the final approval.');
    }
    if (request.status !== 'PENDING_HR') throw new BadRequestException('Request is not waiting on HR.');

    const before = request.toObject();
    const step = request.steps.find((s: any) => s.stage === 'HR' && s.action === 'PENDING');
    if (step) {
      step.approverId = user.userId;
      step.approverName = this.actorName(user);
      step.action = approve ? 'APPROVED' : 'REJECTED';
      step.comments = comments || '';
      step.actedAt = new Date();
    }
    request.status = approve ? 'APPROVED' : 'REJECTED';
    if (approve) await this.consumeHold(request);
    else await this.releaseHold(request);
    await request.save();

    await this.audit(orgId, user.userId, AuditAction.UPDATE, String(request._id), `HR ${approve ? 'approved' : 'rejected'} leave request (${request.totalDays} day(s), ${request.startDate} → ${request.endDate})`, before, request.toObject());
    return request;
  }

  async cancel(id: string, orgId: string, user: RequestUser) {
    const request = await this.loadForDecision(id, orgId);
    const me: any = await this.resolveEmployee(orgId, user);
    if (String(request.employeeId) !== String(me._id)) {
      throw new ForbiddenException('You can only cancel your own requests.');
    }
    const before = request.toObject();
    request.status = 'CANCELLED';
    await this.releaseHold(request);
    await request.save();
    await this.audit(orgId, user.userId, AuditAction.UPDATE, String(request._id), `Leave request cancelled (${request.totalDays} day(s), ${request.startDate} → ${request.endDate})`, before, request.toObject());
    return request;
  }
}
