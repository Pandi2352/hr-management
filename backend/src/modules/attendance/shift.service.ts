import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Shift, ShiftDocument } from './schemas/shift.schema';
import { Employee, EmployeeDocument } from '../employees/schemas/employee.schema';
import { Organization, OrganizationDocument } from '../organization/schemas/organization.schema';
import { AuditService } from '../../common/audit/audit.service';
import { AuditAction, AuditResource } from '../../common/audit/audit.constants';
import { LoggerHelper } from '../../common/logger';
import { CreateShiftDto, UpdateShiftDto } from './dto/shift.dto';
import { LEGACY_SHIFT_TIMINGS, type ShiftRule } from './shift-time.util';

const DEFAULT_SHIFTS = [
  { name: 'General Day Shift', code: 'GENERAL', startTime: '09:00', endTime: '18:00', graceMinutes: 15, breakMinutes: 60 },
  { name: 'Morning Shift', code: 'MORNING', startTime: '06:00', endTime: '14:00', graceMinutes: 15, breakMinutes: 30 },
  { name: 'Evening Shift', code: 'EVENING', startTime: '14:00', endTime: '22:00', graceMinutes: 15, breakMinutes: 30 },
  { name: 'Night Shift', code: 'NIGHT', startTime: '22:00', endTime: '06:00', graceMinutes: 15, breakMinutes: 30 },
  { name: 'Flexible Hours', code: 'FLEXIBLE', startTime: '09:00', endTime: '18:00', graceMinutes: 120, breakMinutes: 60 },
];

@Injectable()
export class ShiftService implements OnModuleInit {
  private readonly logger = LoggerHelper.Instance.child(ShiftService.name);

  constructor(
    @InjectModel(Shift.name) private readonly shiftModel: Model<ShiftDocument>,
    @InjectModel(Employee.name) private readonly empModel: Model<EmployeeDocument>,
    @InjectModel(Organization.name) private readonly orgModel: Model<OrganizationDocument>,
    private readonly auditService: AuditService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      const orgs = await this.orgModel.find({ isDeleted: false }, '_id').lean();
      for (const org of orgs) {
        const orgId = String(org._id);
        for (const def of DEFAULT_SHIFTS) {
          await this.shiftModel.updateOne(
            { organizationId: orgId, code: def.code },
            { $setOnInsert: { ...def, organizationId: orgId, status: 'ACTIVE' } },
            { upsert: true },
          );
        }
        // One-time bridge: legacy `shift` enum → master shiftId.
        const masters: any[] = await this.shiftModel.find({ organizationId: orgId, isDeleted: false }).lean();
        const byCode = new Map(masters.map((m) => [m.code, String(m._id)]));
        const legacy = await this.empModel
          .find({ organizationId: orgId, isDeleted: false, $or: [{ shiftId: null }, { shiftId: { $exists: false } }] }, '_id shift')
          .lean();
        for (const emp of legacy) {
          const target = byCode.get((emp as any).shift);
          if (target) {
            await this.empModel.updateOne({ _id: emp._id }, { $set: { shiftId: target } });
          }
        }
      }
    } catch (err: unknown) {
      this.logger.error(null, 'Shift seeding failed', err as Error);
    }
  }

  /** Effective rule for an employee: master shift first, legacy code fallback. */
  async ruleFor(employee: { shiftId?: string | null; shift?: string; organizationId: string }): Promise<(ShiftRule & { _id?: string; name?: string }) | null> {
    if (employee.shiftId) {
      const master: any = await this.shiftModel
        .findOne({ _id: employee.shiftId, organizationId: employee.organizationId, isDeleted: false })
        .lean();
      if (master && master.status === 'ACTIVE') {
        return { _id: String(master._id), name: master.name, startTime: master.startTime, endTime: master.endTime, graceMinutes: master.graceMinutes };
      }
    }
    return LEGACY_SHIFT_TIMINGS[employee.shift || ''] || null;
  }

  async listShifts(orgId: string, status?: string) {
    const filter: Record<string, unknown> = { organizationId: orgId, isDeleted: false };
    if (status && status !== 'ALL') filter.status = status;
    const shifts = await this.shiftModel.find(filter).sort({ startTime: 1 }).lean();
    const counts = await this.empModel.aggregate([
      { $match: { organizationId: orgId, isDeleted: false, shiftId: { $ne: null } } },
      { $group: { _id: '$shiftId', count: { $sum: 1 } } },
    ]);
    const map = new Map(counts.map((c) => [String(c._id), c.count]));
    return shifts.map((s: any) => ({ ...s, assignedCount: map.get(String(s._id)) || 0 }));
  }

  async createShift(dto: CreateShiftDto, orgId: string, userId: string) {
    const code = dto.code.trim().toUpperCase();
    const clash = await this.shiftModel.findOne({ organizationId: orgId, code, isDeleted: false });
    if (clash) throw new ConflictException(`Shift code "${code}" already exists.`);
    const created = await this.shiftModel.create({
      organizationId: orgId,
      name: dto.name.trim(),
      code,
      startTime: dto.startTime,
      endTime: dto.endTime,
      graceMinutes: dto.graceMinutes ?? 15,
      breakMinutes: dto.breakMinutes ?? 60,
      status: 'ACTIVE',
    });
    await this.auditService.record({
      action: AuditAction.CREATE,
      resourceType: AuditResource.ATTENDANCE,
      resourceId: String(created._id),
      organizationId: orgId,
      actorUserId: userId,
      description: `Created shift "${created.name}" (${created.startTime}–${created.endTime})`,
      after: created,
    });
    return created;
  }

  async updateShift(id: string, dto: UpdateShiftDto, orgId: string, userId: string) {
    const existing = await this.shiftModel.findOne({ _id: id, organizationId: orgId, isDeleted: false });
    if (!existing) throw new NotFoundException('Shift not found.');
    if (dto.code && dto.code.trim().toUpperCase() !== existing.code) {
      const clash = await this.shiftModel.findOne({
        _id: { $ne: id },
        organizationId: orgId,
        code: dto.code.trim().toUpperCase(),
        isDeleted: false,
      });
      if (clash) throw new ConflictException(`Shift code "${dto.code.trim().toUpperCase()}" already exists.`);
    }
    const payload: Record<string, unknown> = {};
    if (dto.name !== undefined) payload.name = dto.name.trim();
    if (dto.code !== undefined) payload.code = dto.code.trim().toUpperCase();
    if (dto.startTime !== undefined) payload.startTime = dto.startTime;
    if (dto.endTime !== undefined) payload.endTime = dto.endTime;
    if (dto.graceMinutes !== undefined) payload.graceMinutes = dto.graceMinutes;
    if (dto.breakMinutes !== undefined) payload.breakMinutes = dto.breakMinutes;
    const updated = await this.shiftModel.findByIdAndUpdate(id, payload, { new: true });
    await this.auditService.record({
      action: AuditAction.UPDATE,
      resourceType: AuditResource.ATTENDANCE,
      resourceId: id,
      organizationId: orgId,
      actorUserId: userId,
      description: `Updated shift "${existing.name}"`,
      before: existing,
      after: updated,
    });
    return updated;
  }

  async toggleShiftStatus(id: string, orgId: string, userId: string) {
    const existing = await this.shiftModel.findOne({ _id: id, organizationId: orgId, isDeleted: false });
    if (!existing) throw new NotFoundException('Shift not found.');
    const next = existing.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (next === 'INACTIVE') {
      const assigned = await this.empModel.countDocuments({ shiftId: id, organizationId: orgId, isDeleted: false });
      if (assigned > 0) {
        throw new BadRequestException(`Cannot deactivate — ${assigned} employee(s) still on this shift. Reassign them first.`);
      }
    }
    const updated = await this.shiftModel.findByIdAndUpdate(id, { status: next }, { new: true });
    await this.auditService.record({
      action: AuditAction.UPDATE,
      resourceType: AuditResource.ATTENDANCE,
      resourceId: id,
      organizationId: orgId,
      actorUserId: userId,
      description: `${next === 'ACTIVE' ? 'Activated' : 'Deactivated'} shift "${existing.name}"`,
      before: existing,
      after: updated,
    });
    return updated;
  }

  async deleteShift(id: string, orgId: string, userId: string) {
    const existing = await this.shiftModel.findOne({ _id: id, organizationId: orgId, isDeleted: false });
    if (!existing) throw new NotFoundException('Shift not found.');
    const assigned = await this.empModel.countDocuments({ shiftId: id, organizationId: orgId, isDeleted: false });
    if (assigned > 0) {
      throw new BadRequestException(`Cannot delete — ${assigned} employee(s) still on this shift.`);
    }
    await this.shiftModel.findByIdAndUpdate(id, { isDeleted: true });
    await this.auditService.record({
      action: AuditAction.DELETE,
      resourceType: AuditResource.ATTENDANCE,
      resourceId: id,
      organizationId: orgId,
      actorUserId: userId,
      description: `Deleted shift "${existing.name}"`,
      before: existing,
    });
    return { success: true, message: `Shift "${existing.name}" deleted.` };
  }
}
