import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AttendanceRecord, AttendanceRecordDocument } from './schemas/attendance-record.schema';
import { Employee, EmployeeDocument } from '../employees/schemas/employee.schema';
import { AuditService } from '../../common/audit/audit.service';
import { AuditAction, AuditResource } from '../../common/audit/audit.constants';
import { PunchDto } from './dto/attendance.dto';

export interface RequestUser {
  userId: string;
  email?: string;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(AttendanceRecord.name) private readonly recordModel: Model<AttendanceRecordDocument>,
    @InjectModel(Employee.name) private readonly empModel: Model<EmployeeDocument>,
    private readonly auditService: AuditService,
  ) {}

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

  private describe(record: any): string {
    return `${record.date} ${record.checkIn || '—'} → ${record.checkOut || 'open'}`;
  }

  async checkIn(dto: PunchDto, orgId: string, user: RequestUser) {
    const employee: any = await this.resolveEmployee(orgId, user);
    const date = dto.date || todayStr();
    if (date > todayStr()) throw new BadRequestException('Cannot check in for a future date.');
    const time = dto.time || nowTime();

    const existing = await this.recordModel
      .findOne({ organizationId: orgId, employeeId: String(employee._id), date, isDeleted: false })
      .lean();
    if (existing?.checkIn) {
      throw new ConflictException(`Already checked in on ${date} at ${existing.checkIn}.`);
    }

    const record = existing
      ? await this.recordModel.findByIdAndUpdate(
          existing._id,
          { $set: { checkIn: time, source: dto.date || dto.time ? 'MANUAL' : 'WEB', note: dto.note?.trim() || '' } },
          { new: true },
        )
      : await this.recordModel.create({
          organizationId: orgId,
          employeeId: String(employee._id),
          date,
          checkIn: time,
          source: dto.date || dto.time ? 'MANUAL' : 'WEB',
          status: 'OPEN',
          note: dto.note?.trim() || '',
        });

    await this.auditService.record({
      action: AuditAction.CREATE,
      resourceType: AuditResource.ATTENDANCE,
      resourceId: String(record!._id),
      organizationId: orgId,
      actorUserId: user.userId,
      actorEmployeeId: String(employee._id),
      description: `${employee.displayName || `${employee.firstName} ${employee.lastName}`.trim()} checked in (${this.describe(record)})`,
    });
    return record;
  }

  async checkOut(dto: PunchDto, orgId: string, user: RequestUser) {
    const employee: any = await this.resolveEmployee(orgId, user);
    const date = dto.date || todayStr();
    const time = dto.time || nowTime();

    const record: any = await this.recordModel.findOne({
      organizationId: orgId,
      employeeId: String(employee._id),
      date,
      isDeleted: false,
    });
    if (!record?.checkIn) {
      throw new BadRequestException(`No check-in found for ${date}. Check in first.`);
    }
    if (record.checkOut) {
      throw new ConflictException(`Already checked out on ${date} at ${record.checkOut}.`);
    }
    if (toMinutes(time) <= toMinutes(record.checkIn)) {
      throw new BadRequestException('Check-out time must be after check-in time.');
    }

    const updated = await this.recordModel.findByIdAndUpdate(
      record._id,
      {
        $set: {
          checkOut: time,
          status: 'PRESENT',
          workMinutes: toMinutes(time) - toMinutes(record.checkIn),
          ...(dto.note?.trim() ? { note: dto.note.trim() } : {}),
        },
      },
      { new: true },
    );

    await this.auditService.record({
      action: AuditAction.UPDATE,
      resourceType: AuditResource.ATTENDANCE,
      resourceId: String(record._id),
      organizationId: orgId,
      actorUserId: user.userId,
      actorEmployeeId: String(employee._id),
      description: `${employee.displayName || `${employee.firstName} ${employee.lastName}`.trim()} checked out (${this.describe(updated)})`,
      before: { checkOut: '', status: 'OPEN' },
      after: { checkOut: time, status: 'PRESENT' },
    });
    return updated;
  }

  /** Today's punch state powering the dashboard widget. */
  async todayStatus(orgId: string, user: RequestUser) {
    const employee: any = await this.resolveEmployee(orgId, user);
    const record = await this.recordModel
      .findOne({ organizationId: orgId, employeeId: String(employee._id), date: todayStr(), isDeleted: false })
      .lean();
    return { date: todayStr(), record };
  }

  async myRecords(orgId: string, user: RequestUser, month: string) {
    const employee: any = await this.resolveEmployee(orgId, user);
    if (!/^\d{4}-\d{2}$/.test(month)) throw new BadRequestException('month must be YYYY-MM');
    const records = await this.recordModel
      .find({
        organizationId: orgId,
        employeeId: String(employee._id),
        date: { $gte: `${month}-01`, $lte: `${month}-31` },
        isDeleted: false,
      })
      .sort({ date: -1 })
      .lean();
    const present = records.filter((r: any) => r.status === 'PRESENT').length;
    const minutes = records.reduce((a: number, r: any) => a + (r.workMinutes || 0), 0);
    return { records, summary: { days: records.length, present, totalHours: Math.round((minutes / 60) * 10) / 10 } };
  }

  async teamRecords(orgId: string, query: { employeeId?: string; from?: string; to?: string }) {
    const filter: any = { organizationId: orgId, isDeleted: false };
    if (query.employeeId) filter.employeeId = query.employeeId;
    if (query.from) filter.date = { ...(filter.date || {}), $gte: query.from };
    if (query.to) filter.date = { ...(filter.date || {}), $lte: query.to };
    const records = await this.recordModel.find(filter).sort({ date: -1 }).limit(200).lean();
    const employees = await this.empModel
      .find(
        { _id: { $in: [...new Set(records.map((r: any) => r.employeeId))] } },
        '_id employeeCode firstName lastName displayName avatarUrl',
      )
      .lean();
    const map = new Map(employees.map((e: any) => [String(e._id), e]));
    return records.map((r: any) => {
      const e: any = map.get(String(r.employeeId));
      return {
        ...r,
        employee: e
          ? { _id: e._id, employeeCode: e.employeeCode, displayName: e.displayName || `${e.firstName} ${e.lastName}`.trim(), avatarUrl: e.avatarUrl || null }
          : null,
      };
    });
  }
}
