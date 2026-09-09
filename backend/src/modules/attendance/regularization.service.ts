import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Regularization, RegularizationDocument } from './schemas/regularization.schema';
import { AttendanceRecord, AttendanceRecordDocument } from './schemas/attendance-record.schema';
import { Employee, EmployeeDocument } from '../employees/schemas/employee.schema';
import { AuditService } from '../../common/audit/audit.service';
import { AuditAction, AuditResource } from '../../common/audit/audit.constants';
import { PERMISSIONS } from '../../common/constants';
import { RaiseRegularizationDto } from './dto/shift.dto';
import { ShiftService } from './shift.service';
import { evaluateDay, toMinutes } from './shift-time.util';

export interface RequestUser {
  userId: string;
  email?: string;
  roles?: string[];
  permissions?: string[];
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

@Injectable()
export class RegularizationService {
  constructor(
    @InjectModel(Regularization.name) private readonly regModel: Model<RegularizationDocument>,
    @InjectModel(AttendanceRecord.name) private readonly recordModel: Model<AttendanceRecordDocument>,
    @InjectModel(Employee.name) private readonly empModel: Model<EmployeeDocument>,
    private readonly shiftService: ShiftService,
    private readonly auditService: AuditService,
  ) {}

  private isHr(user: RequestUser): boolean {
    const roles = (user.roles || []).map((r) => String(r).toUpperCase());
    if (roles.includes('SUPER_ADMIN')) return true;
    const perms = user.permissions || [];
    return perms.includes('*') || perms.includes(PERMISSIONS.ATTENDANCE_MANAGE);
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

  private async enrich(rows: any[]) {
    const ids = [...new Set(rows.map((r: any) => String(r.employeeId)))];
    const employees = await this.empModel
      .find({ _id: { $in: ids } }, '_id employeeCode firstName lastName displayName avatarUrl managerId')
      .lean();
    const map = new Map(employees.map((e: any) => [String(e._id), e]));
    return rows.map((r: any) => {
      const e: any = map.get(String(r.employeeId));
      return {
        ...r,
        employee: e
          ? { _id: e._id, employeeCode: e.employeeCode, displayName: e.displayName || `${e.firstName} ${e.lastName}`.trim(), avatarUrl: e.avatarUrl || null, managerId: e.managerId || null }
          : null,
      };
    });
  }

  // --------------------------------------------------------------------- raise

  async raise(dto: RaiseRegularizationDto, orgId: string, user: RequestUser) {
    const employee: any = await this.resolveEmployee(orgId, user);
    if (dto.date > todayStr()) throw new BadRequestException('Cannot regularize a future date.');
    if (dto.requestedCheckOut && toMinutes(dto.requestedCheckOut) <= toMinutes(dto.requestedCheckIn)) {
      throw new BadRequestException('Check-out must be after check-in.');
    }
    const pending = await this.regModel.findOne({
      organizationId: orgId,
      employeeId: String(employee._id),
      date: dto.date,
      status: 'PENDING',
      isDeleted: false,
    });
    if (pending) throw new ConflictException(`A pending request already exists for ${dto.date}.`);

    const created = await this.regModel.create({
      organizationId: orgId,
      employeeId: String(employee._id),
      date: dto.date,
      requestedCheckIn: dto.requestedCheckIn,
      requestedCheckOut: dto.requestedCheckOut || '',
      reason: dto.reason.trim(),
      status: 'PENDING',
    });
    await this.auditService.record({
      action: AuditAction.CREATE,
      resourceType: AuditResource.ATTENDANCE,
      resourceId: String(created._id),
      organizationId: orgId,
      actorUserId: user.userId,
      actorEmployeeId: String(employee._id),
      description: `${employee.displayName || employee.firstName} requested regularization for ${dto.date} (${dto.requestedCheckIn}${dto.requestedCheckOut ? ` → ${dto.requestedCheckOut}` : ''})`,
      after: created,
    });
    return created;
  }

  async myRequests(orgId: string, user: RequestUser, status?: string) {
    const employee: any = await this.resolveEmployee(orgId, user);
    const filter: Record<string, unknown> = { organizationId: orgId, employeeId: String(employee._id), isDeleted: false };
    if (status && status !== 'ALL') filter.status = status;
    const rows = await this.regModel.find(filter).sort({ date: -1 }).lean();
    return this.enrich(rows);
  }

  /** Pending items for my direct reports (manager) or everyone (HR). */
  async inbox(orgId: string, user: RequestUser) {
    const hr = this.isHr(user);
    const me: any = await this.resolveEmployee(orgId, user).catch(() => null);
    const filter: Record<string, unknown> = { organizationId: orgId, status: 'PENDING', isDeleted: false };
    const rows = await this.regModel.find(filter).sort({ date: -1 }).lean();
    const enriched = await this.enrich(rows);
    if (hr || !me) return hr ? enriched : [];
    return enriched.filter((r: any) => r.employee?.managerId === String(me._id));
  }

  // -------------------------------------------------------------------- decide

  async decide(id: string, approve: boolean, note: string, orgId: string, user: RequestUser) {
    const request: any = await this.regModel.findOne({ _id: id, organizationId: orgId, isDeleted: false });
    if (!request) throw new NotFoundException('Regularization request not found.');
    if (request.status !== 'PENDING') throw new BadRequestException(`Request is already ${request.status.toLowerCase()}.`);

    const me: any = await this.resolveEmployee(orgId, user).catch(() => null);
    const requester: any = await this.empModel.findById(request.employeeId).lean();
    const isManager = me && requester && String(requester.managerId) === String(me._id);
    if (!isManager && !this.isHr(user)) {
      throw new ForbiddenException('Only the reporting manager or HR can decide this request.');
    }

    const before = { ...request.toObject() };
    request.status = approve ? 'APPROVED' : 'REJECTED';
    request.decidedBy = user.userId;
    request.decisionNote = note || '';
    request.decidedAt = new Date();
    await request.save();

    let applied: unknown = null;
    if (approve) {
      applied = await this.applyToRecord(request, orgId);
    }

    await this.auditService.record({
      action: AuditAction.UPDATE,
      resourceType: AuditResource.ATTENDANCE,
      resourceId: id,
      organizationId: orgId,
      actorUserId: user.userId,
      description: `Regularization for ${request.date} ${approve ? 'approved and applied' : 'rejected'}`,
      before,
      after: request.toObject(),
    });
    return { request, applied };
  }

  /** Writes the approved times onto the day record and recomputes flags. */
  private async applyToRecord(request: any, orgId: string) {
    const employee: any = await this.empModel.findById(request.employeeId).lean();
    const rule = employee ? await this.shiftService.ruleFor(employee) : null;
    const flags = evaluateDay(request.requestedCheckIn, request.requestedCheckOut || '', rule);
    const hasCheckout = Boolean(request.requestedCheckOut);

    return this.recordModel.findOneAndUpdate(
      { organizationId: orgId, employeeId: request.employeeId, date: request.date },
      {
        $set: {
          checkIn: request.requestedCheckIn,
          ...(hasCheckout ? { checkOut: request.requestedCheckOut } : {}),
          source: 'MANUAL',
          status: hasCheckout ? 'PRESENT' : 'OPEN',
          workMinutes: flags.workMinutes,
          isLate: flags.isLate,
          lateMinutes: flags.lateMinutes,
          isEarlyExit: flags.isEarlyExit,
          earlyExitMinutes: flags.earlyExitMinutes,
          overtimeMinutes: flags.overtimeMinutes,
          regularized: true,
        },
        $setOnInsert: { organizationId: orgId, employeeId: request.employeeId, date: request.date },
      },
      { new: true, upsert: true },
    );
  }

  async cancel(id: string, orgId: string, user: RequestUser) {
    const request = await this.regModel.findOne({ _id: id, organizationId: orgId, isDeleted: false });
    if (!request) throw new NotFoundException('Regularization request not found.');
    const me: any = await this.resolveEmployee(orgId, user);
    if (String(request.employeeId) !== String(me._id)) {
      throw new ForbiddenException('You can only cancel your own requests.');
    }
    if (request.status !== 'PENDING') throw new BadRequestException('Only pending requests can be cancelled.');
    request.status = 'CANCELLED';
    await request.save();
    return request;
  }
}
