import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Holiday, HolidayDocument } from './schemas/holiday.schema';
import { HolidayCalendar, HolidayCalendarDocument } from './schemas/holiday-calendar.schema';
import { LeaveType, LeaveTypeDocument } from './schemas/leave-type.schema';
import { LeaveBalance, LeaveBalanceDocument } from './schemas/leave-balance.schema';
import {
  RestrictedHolidayOpt,
  RestrictedHolidayOptDocument,
} from './schemas/restricted-holiday-opt.schema';
import { Employee, EmployeeDocument } from '../employees/schemas/employee.schema';
import { Organization, OrganizationDocument } from '../organization/schemas/organization.schema';
import { AuditService } from '../../common/audit/audit.service';
import { AuditAction, AuditResource } from '../../common/audit/audit.constants';
import { LoggerHelper } from '../../common/logger';
import {
  CreateHolidayDto,
  UpdateHolidayDto,
  UpdateHolidayCalendarDto,
  CreateLeaveTypeDto,
  UpdateLeaveTypeDto,
  AssignBalanceDto,
} from './dto/leave.dto';
import {
  DEFAULT_LEAVE_TYPES,
  SEED_HOLIDAYS_2026,
  SEED_CALENDAR_NOTE,
  SEED_RESTRICTED_LIMIT,
} from './constants/leave-seeds';

export interface RequestUser {
  userId: string;
  email?: string;
}

@Injectable()
export class LeaveService implements OnModuleInit {
  private readonly logger = LoggerHelper.Instance.child(LeaveService.name);

  constructor(
    @InjectModel(Holiday.name) private readonly holidayModel: Model<HolidayDocument>,
    @InjectModel(HolidayCalendar.name) private readonly calendarModel: Model<HolidayCalendarDocument>,
    @InjectModel(LeaveType.name) private readonly leaveTypeModel: Model<LeaveTypeDocument>,
    @InjectModel(LeaveBalance.name) private readonly balanceModel: Model<LeaveBalanceDocument>,
    @InjectModel(RestrictedHolidayOpt.name)
    private readonly optModel: Model<RestrictedHolidayOptDocument>,
    @InjectModel(Employee.name) private readonly empModel: Model<EmployeeDocument>,
    @InjectModel(Organization.name) private readonly orgModel: Model<OrganizationDocument>,
    private readonly auditService: AuditService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedDefaults();
  }

  // ------------------------------------------------------------------ helpers

  private async audit(
    orgId: string,
    userId: string,
    action: AuditAction,
    resourceType: AuditResource,
    entityId: string,
    description: string,
    before: any = null,
    after: any = null,
  ) {
    await this.auditService.record({
      action,
      resourceType,
      resourceId: entityId,
      organizationId: orgId,
      actorUserId: userId,
      description,
      before,
      after,
    });
  }

  /** Resolves the employee linked to the authenticated principal. */
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
    return null;
  }

  private async requireEmployee(orgId: string, user: RequestUser) {
    const employee = await this.resolveEmployee(orgId, user);
    if (!employee) {
      throw new NotFoundException('No employee record is linked to this login.');
    }
    return employee;
  }

  static availableOf(balance: { allocated: number; carriedForward: number; used: number; pending: number }) {
    return Math.max(
      0,
      (balance.allocated || 0) + (balance.carriedForward || 0) - (balance.used || 0) - (balance.pending || 0),
    );
  }

  // -------------------------------------------------------------------- seed

  private async seedDefaults(): Promise<void> {
    try {
      const orgs = await this.orgModel.find({ isDeleted: false }, '_id').lean();
      for (const org of orgs) {
        const orgId = String(org._id);
        await this.ensureLeaveTypes(orgId);
        await this.ensureSeedHolidays(orgId);
      }
    } catch (err: any) {
      this.logger.error(null, 'Leave defaults seeding failed', err);
    }
  }

  private async ensureLeaveTypes(orgId: string): Promise<void> {
    for (const def of DEFAULT_LEAVE_TYPES) {
      const exists = await this.leaveTypeModel
        .findOne({ organizationId: orgId, code: def.code, isDeleted: false })
        .lean();
      if (!exists) {
        await this.leaveTypeModel.create({ ...def, organizationId: orgId, status: 'ACTIVE' });
      }
    }
  }

  private async ensureSeedHolidays(orgId: string): Promise<void> {
    const year = new Date().getFullYear();
    if (year !== 2026) return;
    const count = await this.holidayModel.countDocuments({ organizationId: orgId, year, isDeleted: false });
    if (count > 0) return;

    await this.calendarModel.updateOne(
      { organizationId: orgId, year },
      {
        $setOnInsert: {
          organizationId: orgId,
          year,
          restrictedLimit: SEED_RESTRICTED_LIMIT,
          note: SEED_CALENDAR_NOTE,
        },
      },
      { upsert: true },
    );

    await this.holidayModel.insertMany(
      SEED_HOLIDAYS_2026.map((h) => ({ ...h, organizationId: orgId, year: h.date.slice(0, 4) === '2026' ? 2026 : year, status: 'ACTIVE' })),
    );
    this.logger.info(null, 'Seeded 2026 holiday calendar', { orgId });
  }

  // ----------------------------------------------------------------- holidays

  async listHolidays(
    orgId: string,
    query: { year?: number; type?: string; search?: string; status?: string },
  ) {
    const filter: any = { organizationId: orgId, isDeleted: false };
    if (query.year) filter.year = Number(query.year);
    if (query.type && query.type !== 'ALL') filter.type = query.type;
    if (query.status && query.status !== 'ALL') filter.status = query.status;
    if (query.search && query.search.trim()) {
      filter.name = new RegExp(query.search.trim(), 'i');
    }
    return this.holidayModel.find(filter).sort({ date: 1 }).lean();
  }

  async createHoliday(dto: CreateHolidayDto, orgId: string, userId: string) {
    const year = Number(dto.date.slice(0, 4));
    const duplicate = await this.holidayModel.findOne({
      organizationId: orgId,
      date: dto.date,
      name: dto.name.trim(),
      isDeleted: false,
    });
    if (duplicate) {
      throw new ConflictException(`"${dto.name.trim()}" already exists on ${dto.date}.`);
    }
    const created = await this.holidayModel.create({
      organizationId: orgId,
      name: dto.name.trim(),
      date: dto.date,
      year,
      type: dto.type || 'FIXED',
      description: dto.description?.trim() || '',
      status: 'ACTIVE',
    });
    await this.audit(orgId, userId, AuditAction.CREATE, AuditResource.HOLIDAY, created._id, `Added ${created.type === 'FIXED' ? 'fixed' : 'restricted'} holiday "${created.name}" (${created.date})`, null, created);
    return created;
  }

  async updateHoliday(id: string, dto: UpdateHolidayDto, orgId: string, userId: string) {
    const existing = await this.holidayModel.findOne({ _id: id, organizationId: orgId, isDeleted: false });
    if (!existing) throw new NotFoundException('Holiday not found');

    const payload: any = {};
    if (dto.name !== undefined) payload.name = dto.name.trim();
    if (dto.date !== undefined) {
      payload.date = dto.date;
      payload.year = Number(dto.date.slice(0, 4));
    }
    if (dto.type !== undefined) payload.type = dto.type;
    if (dto.description !== undefined) payload.description = dto.description.trim();

    if (payload.name || payload.date) {
      const clash = await this.holidayModel.findOne({
        _id: { $ne: id },
        organizationId: orgId,
        date: payload.date || existing.date,
        name: payload.name || existing.name,
        isDeleted: false,
      });
      if (clash) throw new ConflictException('Another holiday with this name already exists on that date.');
    }

    const updated = await this.holidayModel.findByIdAndUpdate(id, payload, { new: true });
    await this.audit(orgId, userId, AuditAction.UPDATE, AuditResource.HOLIDAY, id, `Updated holiday "${existing.name}"`, existing, updated);
    return updated;
  }

  async toggleHolidayStatus(id: string, orgId: string, userId: string) {
    const existing = await this.holidayModel.findOne({ _id: id, organizationId: orgId, isDeleted: false });
    if (!existing) throw new NotFoundException('Holiday not found');
    const updated = await this.holidayModel.findByIdAndUpdate(
      id,
      { status: existing.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' },
      { new: true },
    );
    await this.audit(orgId, userId, AuditAction.UPDATE, AuditResource.HOLIDAY, id, `${updated!.status === 'ACTIVE' ? 'Activated' : 'Deactivated'} holiday "${existing.name}"`, existing, updated);
    return updated;
  }

  async deleteHoliday(id: string, orgId: string, userId: string) {
    const existing = await this.holidayModel.findOne({ _id: id, organizationId: orgId, isDeleted: false });
    if (!existing) throw new NotFoundException('Holiday not found');
    await this.holidayModel.findByIdAndUpdate(id, { isDeleted: true });
    await this.optModel.deleteMany({ holidayId: id });
    await this.audit(orgId, userId, AuditAction.DELETE, AuditResource.HOLIDAY, id, `Removed holiday "${existing.name}" (${existing.date})`, existing, null);
    return { success: true, message: `Holiday "${existing.name}" removed.` };
  }

  // ----------------------------------------------------------------- calendar

  async getCalendar(orgId: string, year: number) {
    let calendar = await this.calendarModel.findOne({ organizationId: orgId, year, isDeleted: false }).lean();
    if (!calendar) {
      calendar = await this.calendarModel.create({
        organizationId: orgId,
        year,
        restrictedLimit: 2,
        note: `Holiday Calendar ${year}`,
      });
    }
    const [fixed, restricted] = await Promise.all([
      this.holidayModel.countDocuments({ organizationId: orgId, year, type: 'FIXED', status: 'ACTIVE', isDeleted: false }),
      this.holidayModel.countDocuments({ organizationId: orgId, year, type: 'RESTRICTED', status: 'ACTIVE', isDeleted: false }),
    ]);
    return { ...(calendar as any), fixedCount: fixed, restrictedCount: restricted };
  }

  async updateCalendar(year: number, dto: UpdateHolidayCalendarDto, orgId: string, userId: string) {
    const before = await this.calendarModel.findOne({ organizationId: orgId, year, isDeleted: false }).lean();
    const updated = await this.calendarModel.findOneAndUpdate(
      { organizationId: orgId, year },
      {
        $set: {
          ...(dto.restrictedLimit !== undefined ? { restrictedLimit: dto.restrictedLimit } : {}),
          ...(dto.note !== undefined ? { note: dto.note.trim() } : {}),
        },
        $setOnInsert: { organizationId: orgId, year },
      },
      { new: true, upsert: true },
    );
    await this.audit(orgId, userId, AuditAction.UPDATE, AuditResource.HOLIDAY, String(updated!._id), `Updated holiday calendar ${year} (restricted limit ${updated!.restrictedLimit})`, before, updated);
    return updated;
  }

  // --------------------------------------------------------------- leave types

  async listLeaveTypes(orgId: string, status?: string) {
    const filter: any = { organizationId: orgId, isDeleted: false };
    if (status && status !== 'ALL') filter.status = status;
    return this.leaveTypeModel.find(filter).sort({ code: 1 }).lean();
  }

  async createLeaveType(dto: CreateLeaveTypeDto, orgId: string, userId: string) {
    const code = dto.code.trim().toUpperCase();
    const duplicate = await this.leaveTypeModel.findOne({ organizationId: orgId, code, isDeleted: false });
    if (duplicate) throw new ConflictException(`Leave type "${code}" already exists.`);
    const created = await this.leaveTypeModel.create({
      organizationId: orgId,
      code,
      name: dto.name.trim(),
      description: dto.description?.trim() || '',
      defaultAllocation: dto.defaultAllocation ?? 0,
      carryForwardAllowed: dto.carryForwardAllowed ?? true,
      maxCarryForward: dto.maxCarryForward ?? 0,
      status: 'ACTIVE',
    });
    await this.audit(orgId, userId, AuditAction.CREATE, AuditResource.LEAVE_TYPE, created._id, `Created leave type "${created.name}" (${created.code})`, null, created);
    return created;
  }

  async updateLeaveType(id: string, dto: UpdateLeaveTypeDto, orgId: string, userId: string) {
    const existing = await this.leaveTypeModel.findOne({ _id: id, organizationId: orgId, isDeleted: false });
    if (!existing) throw new NotFoundException('Leave type not found');
    const payload: any = {};
    if (dto.code && dto.code.trim().toUpperCase() !== existing.code) {
      const clash = await this.leaveTypeModel.findOne({
        _id: { $ne: id },
        organizationId: orgId,
        code: dto.code.trim().toUpperCase(),
        isDeleted: false,
      });
      if (clash) throw new ConflictException(`Leave type "${dto.code.trim().toUpperCase()}" already exists.`);
      payload.code = dto.code.trim().toUpperCase();
    }
    if (dto.name !== undefined) payload.name = dto.name.trim();
    if (dto.description !== undefined) payload.description = dto.description.trim();
    if (dto.defaultAllocation !== undefined) payload.defaultAllocation = dto.defaultAllocation;
    if (dto.carryForwardAllowed !== undefined) payload.carryForwardAllowed = dto.carryForwardAllowed;
    if (dto.maxCarryForward !== undefined) payload.maxCarryForward = dto.maxCarryForward;
    const updated = await this.leaveTypeModel.findByIdAndUpdate(id, payload, { new: true });
    await this.audit(orgId, userId, AuditAction.UPDATE, AuditResource.LEAVE_TYPE, id, `Updated leave type "${existing.name}"`, existing, updated);
    return updated;
  }

  async toggleLeaveTypeStatus(id: string, orgId: string, userId: string) {
    const existing = await this.leaveTypeModel.findOne({ _id: id, organizationId: orgId, isDeleted: false });
    if (!existing) throw new NotFoundException('Leave type not found');
    const updated = await this.leaveTypeModel.findByIdAndUpdate(
      id,
      { status: existing.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' },
      { new: true },
    );
    await this.audit(orgId, userId, AuditAction.UPDATE, AuditResource.LEAVE_TYPE, id, `${updated!.status === 'ACTIVE' ? 'Activated' : 'Deactivated'} leave type "${existing.name}"`, existing, updated);
    return updated;
  }

  // ----------------------------------------------------------------- balances

  private enrichBalances(balances: any[], employees: any[], leaveTypes: any[]) {
    const empMap = new Map(employees.map((e: any) => [String(e._id), e]));
    const typeMap = new Map(leaveTypes.map((t: any) => [String(t._id), t]));
    return balances.map((b: any) => {
      const emp = empMap.get(String(b.employeeId));
      const type = typeMap.get(String(b.leaveTypeId));
      return {
        ...b,
        available: LeaveService.availableOf(b),
        employee: emp
          ? {
              _id: emp._id,
              employeeCode: emp.employeeCode,
              displayName: emp.displayName || `${emp.firstName} ${emp.lastName}`.trim(),
              workEmail: emp.workEmail,
              avatarUrl: emp.avatarUrl || null,
            }
          : null,
        leaveType: type
          ? { _id: type._id, code: type.code, name: type.name, carryForwardAllowed: type.carryForwardAllowed, maxCarryForward: type.maxCarryForward }
          : null,
      };
    });
  }

  private async loadRefs(orgId: string, employeeIds: string[], leaveTypeIds: string[]) {
    const [employees, leaveTypes] = await Promise.all([
      this.empModel
        .find({ _id: { $in: employeeIds }, organizationId: orgId }, '_id employeeCode firstName lastName displayName workEmail avatarUrl')
        .lean(),
      this.leaveTypeModel.find({ _id: { $in: leaveTypeIds }, organizationId: orgId }).lean(),
    ]);
    return { employees, leaveTypes };
  }

  async getMyBalances(orgId: string, user: RequestUser, year: number) {
    const employee: any = await this.requireEmployee(orgId, user);
    const [balances, calendar, opts] = await Promise.all([
      this.balanceModel.find({ organizationId: orgId, employeeId: String(employee._id), year, isDeleted: false }).lean(),
      this.getCalendar(orgId, year),
      this.optModel.find({ organizationId: orgId, employeeId: String(employee._id), year }).lean(),
    ]);
    const { employees, leaveTypes } = await this.loadRefs(
      orgId,
      [String(employee._id)],
      balances.map((b: any) => String(b.leaveTypeId)),
    );
    const enriched = this.enrichBalances(balances, employees, leaveTypes);
    enriched.sort((a: any, b: any) => String(a.leaveType?.code || '').localeCompare(String(b.leaveType?.code || '')));

    const availedIds = new Set(opts.map((o: any) => String(o.holidayId)));
    return {
      employee: {
        _id: employee._id,
        employeeCode: employee.employeeCode,
        displayName: employee.displayName || `${employee.firstName} ${employee.lastName}`.trim(),
      },
      year,
      balances: enriched,
      restricted: {
        limit: (calendar as any).restrictedLimit ?? 2,
        availed: opts.length,
        remaining: Math.max(0, ((calendar as any).restrictedLimit ?? 2) - opts.length),
        availedHolidayIds: Array.from(availedIds),
      },
    };
  }

  async listBalances(orgId: string, query: { employeeId?: string; year?: number; leaveTypeId?: string }) {
    const filter: any = { organizationId: orgId, isDeleted: false };
    if (query.employeeId) filter.employeeId = query.employeeId;
    if (query.year) filter.year = Number(query.year);
    if (query.leaveTypeId) filter.leaveTypeId = query.leaveTypeId;
    const balances = await this.balanceModel.find(filter).sort({ year: -1 }).lean();
    const { employees, leaveTypes } = await this.loadRefs(
      orgId,
      [...new Set(balances.map((b: any) => String(b.employeeId)))],
      [...new Set(balances.map((b: any) => String(b.leaveTypeId)))],
    );
    return this.enrichBalances(balances, employees, leaveTypes);
  }

  async assignBalance(dto: AssignBalanceDto, orgId: string, userId: string) {
    const employee: any = await this.empModel.findOne({ _id: dto.employeeId, organizationId: orgId, isDeleted: false }).lean();
    if (!employee) throw new NotFoundException('Employee not found in this organisation.');
    const leaveType = await this.leaveTypeModel.findOne({ _id: dto.leaveTypeId, organizationId: orgId, isDeleted: false }).lean();
    if (!leaveType) throw new NotFoundException('Leave type not found.');

    const before = await this.balanceModel
      .findOne({ organizationId: orgId, employeeId: dto.employeeId, leaveTypeId: dto.leaveTypeId, year: dto.year, isDeleted: false })
      .lean();

    const payload: any = {
      allocated: dto.allocated,
      ...(dto.carriedForward !== undefined ? { carriedForward: dto.carriedForward } : {}),
      ...(dto.used !== undefined ? { used: dto.used } : {}),
      ...(dto.note !== undefined ? { note: dto.note.trim() } : {}),
    };

    const balance = await this.balanceModel.findOneAndUpdate(
      { organizationId: orgId, employeeId: dto.employeeId, leaveTypeId: dto.leaveTypeId, year: dto.year },
      { $set: payload, $setOnInsert: { organizationId: orgId, employeeId: dto.employeeId, leaveTypeId: dto.leaveTypeId, year: dto.year } },
      { new: true, upsert: true },
    );

    const label = `${employee.displayName || `${employee.firstName} ${employee.lastName}`.trim()} (${employee.employeeCode})`;
    await this.audit(
      orgId,
      userId,
      before ? AuditAction.UPDATE : AuditAction.CREATE,
      AuditResource.LEAVE_BALANCE,
      String(balance!._id),
      `${before ? 'Updated' : 'Assigned'} ${leaveType.name} balance for ${label} — ${dto.year} (allocated ${dto.allocated}, carried ${payload.carriedForward ?? balance!.carriedForward})`,
      before,
      balance,
    );
    return balance;
  }

  /** Creates missing wallets for every active employee × active leave type. */
  async seedYearBalances(year: number, orgId: string, userId: string) {
    return this.applyDefaultsToAll(year, orgId, userId, false);
  }

  /**
   * One-place global balances: every active employee gets every active leave
   * type at its default allocation (plus capped carry-forward from last year).
   * Missing wallets are created; with `overwrite`, existing wallets also get
   * their `allocated` reset to the type default (carried/used are preserved).
   */
  async applyDefaultsToAll(year: number, orgId: string, userId: string, overwrite = false) {
    const [employees, leaveTypes] = await Promise.all([
      this.empModel.find({ organizationId: orgId, isDeleted: false, status: { $nin: ['TERMINATED', 'RESIGNED'] } }, '_id').lean(),
      this.leaveTypeModel.find({ organizationId: orgId, status: 'ACTIVE', isDeleted: false }).lean(),
    ]);

    let created = 0;
    let updated = 0;
    let carriedTotal = 0;
    for (const emp of employees) {
      for (const type of leaveTypes) {
        const exists: any = await this.balanceModel
          .findOne({ organizationId: orgId, employeeId: String(emp._id), leaveTypeId: String(type._id), year, isDeleted: false })
          .lean();
        if (exists) {
          if (overwrite && exists.allocated !== (type.defaultAllocation || 0)) {
            await this.balanceModel.updateOne(
              { _id: exists._id },
              { $set: { allocated: type.defaultAllocation || 0 } },
            );
            updated++;
          }
          continue;
        }

        const carry = await this.computeCarry(orgId, String(emp._id), type, year);
        await this.balanceModel.create({
          organizationId: orgId,
          employeeId: String(emp._id),
          leaveTypeId: String(type._id),
          year,
          allocated: type.defaultAllocation || 0,
          carriedForward: carry,
          used: 0,
          pending: 0,
        });
        created++;
        carriedTotal += carry;
      }
    }

    await this.audit(orgId, userId, AuditAction.BULK_UPDATE, AuditResource.LEAVE_BALANCE, `${orgId}:${year}`, `Applied default leave balances to all employees for ${year} (${created} created, ${updated} reset, ${carriedTotal} days carried forward)`, null, { created, updated, carriedTotal, year, overwrite });

    return { created, updated, carriedTotal, employees: employees.length, leaveTypes: leaveTypes.length, year };
  }

  /** Capped leftover from last year's wallet for the same employee + type. */
  private async computeCarry(orgId: string, employeeId: string, type: any, year: number): Promise<number> {
    if (!type.carryForwardAllowed) return 0;
    const prev: any = await this.balanceModel
      .findOne({ organizationId: orgId, employeeId, leaveTypeId: String(type._id), year: year - 1, isDeleted: false })
      .lean();
    if (!prev) return 0;
    const leftover = (prev.allocated || 0) + (prev.carriedForward || 0) - (prev.used || 0) - (prev.pending || 0);
    return Math.max(0, Math.min(leftover, type.maxCarryForward || 0));
  }

  // ------------------------------------------------------- restricted holidays

  async listHolidaysWithOpts(orgId: string, user: RequestUser, year: number) {
    const [holidays, calendar] = await Promise.all([
      this.holidayModel.find({ organizationId: orgId, year, status: 'ACTIVE', isDeleted: false }).sort({ date: 1 }).lean(),
      this.getCalendar(orgId, year),
    ]);
    let availedIds = new Set<string>();
    let availed = 0;
    try {
      const employee: any = await this.resolveEmployee(orgId, user);
      if (employee) {
        const opts = await this.optModel
          .find({ organizationId: orgId, employeeId: String(employee._id), year })
          .lean();
        availedIds = new Set(opts.map((o: any) => String(o.holidayId)));
        availed = opts.length;
      }
    } catch {
      // Employees without a linked file still see the calendar.
    }
    const limit = (calendar as any).restrictedLimit ?? 2;
    return {
      year,
      calendar,
      restricted: { limit, availed, remaining: Math.max(0, limit - availed) },
      holidays: holidays.map((h: any) => ({ ...h, availed: availedIds.has(String(h._id)) })),
    };
  }

  async availRestrictedHoliday(holidayId: string, orgId: string, user: RequestUser) {
    const employee: any = await this.requireEmployee(orgId, user);
    const holiday: any = await this.holidayModel
      .findOne({ _id: holidayId, organizationId: orgId, status: 'ACTIVE', isDeleted: false })
      .lean();
    if (!holiday) throw new NotFoundException('Holiday not found.');
    if (holiday.type !== 'RESTRICTED') {
      throw new BadRequestException('Only restricted holidays can be availed. Fixed holidays apply automatically.');
    }

    const calendar: any = await this.getCalendar(orgId, holiday.year);
    const existing = await this.optModel.findOne({ employeeId: String(employee._id), holidayId }).lean();
    if (existing) throw new ConflictException(`"${holiday.name}" is already availed.`);

    const count = await this.optModel.countDocuments({ organizationId: orgId, employeeId: String(employee._id), year: holiday.year });
    if (count >= (calendar.restrictedLimit ?? 2)) {
      throw new BadRequestException(`Restricted holiday limit reached (${calendar.restrictedLimit} for ${holiday.year}). Cancel one to pick another.`);
    }

    const created = await this.optModel.create({
      organizationId: orgId,
      employeeId: String(employee._id),
      holidayId,
      year: holiday.year,
    });
    await this.audit(orgId, String(user.userId), AuditAction.CREATE, AuditResource.HOLIDAY, String(created._id), `${employee.displayName || `${employee.firstName} ${employee.lastName}`.trim()} availed restricted holiday "${holiday.name}" (${holiday.date})`, null, created);
    return created;
  }

  async cancelRestrictedHoliday(optId: string, orgId: string, user: RequestUser, isHr: boolean) {
    const opt: any = await this.optModel.findOne({ _id: optId, organizationId: orgId }).lean();
    if (!opt) throw new NotFoundException('Availed restricted holiday not found.');

    if (!isHr) {
      const employee: any = await this.requireEmployee(orgId, user);
      if (String(opt.employeeId) !== String(employee._id)) {
        throw new ForbiddenException('You can only cancel your own restricted holidays.');
      }
    }

    await this.optModel.deleteOne({ _id: optId });
    const holiday: any = await this.holidayModel.findById(opt.holidayId).lean();
    await this.audit(orgId, String(user.userId), AuditAction.DELETE, AuditResource.HOLIDAY, optId, `Cancelled restricted holiday "${holiday?.name || opt.holidayId}"`, opt, null);
    return { success: true, message: 'Restricted holiday cancelled.' };
  }
}
