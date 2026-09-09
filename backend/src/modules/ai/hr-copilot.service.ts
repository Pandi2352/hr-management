import { Injectable, NotFoundException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Employee, EmployeeDocument } from '../employees/schemas/employee.schema';
import { LeaveBalance, LeaveBalanceDocument } from '../leave/schemas/leave-balance.schema';
import { LeaveType, LeaveTypeDocument } from '../leave/schemas/leave-type.schema';
import { LeaveRequest, LeaveRequestDocument } from '../leave/schemas/leave-request.schema';
import { Holiday, HolidayDocument } from '../leave/schemas/holiday.schema';
import { HolidayCalendar, HolidayCalendarDocument } from '../leave/schemas/holiday-calendar.schema';
import { RestrictedHolidayOpt, RestrictedHolidayOptDocument } from '../leave/schemas/restricted-holiday-opt.schema';
import { AttendanceRecord, AttendanceRecordDocument } from '../attendance/schemas/attendance-record.schema';
import { AiService } from './ai.service';
import { LoggerHelper } from '../../common/logger';

export interface CopilotRequestUser {
  userId: string;
  email?: string;
}

const SYSTEM_PROMPT = [
  'You are PeopleOS Assist, the in-app HR helper for one employee.',
  'Answer ONLY from the LIVE DATA block below using short, friendly sentences.',
  'If the question cannot be answered from that data, say what is missing and point to HR — never invent balances, dates or policies.',
  'Never mention other employees. Keep answers under 120 words unless a breakdown is asked for.',
].join(' ');

/**
 * AskHR Copilot: answers leave / holiday / attendance questions grounded in
 * the asker's own live records. Strictly self-scoped — only the caller's
 * employee file, wallets, requests, holidays and punches are loaded.
 */
@Injectable()
export class HrCopilotService {
  private readonly logger = LoggerHelper.Instance.child(HrCopilotService.name);

  constructor(
    @InjectModel(Employee.name) private readonly empModel: Model<EmployeeDocument>,
    @InjectModel(LeaveBalance.name) private readonly balanceModel: Model<LeaveBalanceDocument>,
    @InjectModel(LeaveType.name) private readonly leaveTypeModel: Model<LeaveTypeDocument>,
    @InjectModel(LeaveRequest.name) private readonly requestModel: Model<LeaveRequestDocument>,
    @InjectModel(Holiday.name) private readonly holidayModel: Model<HolidayDocument>,
    @InjectModel(HolidayCalendar.name) private readonly calendarModel: Model<HolidayCalendarDocument>,
    @InjectModel(RestrictedHolidayOpt.name) private readonly optModel: Model<RestrictedHolidayOptDocument>,
    @InjectModel(AttendanceRecord.name) private readonly attendanceModel: Model<AttendanceRecordDocument>,
    private readonly aiService: AiService,
  ) {}

  async ask(question: string, orgId: string, user: CopilotRequestUser): Promise<{ answer: string; provider: string; contextUsed: string[] }> {
    const q = (question || '').trim();
    if (q.length < 3) throw new BadRequestException('Ask a slightly longer question.');
    if (q.length > 500) throw new BadRequestException('Keep the question under 500 characters.');

    const employee: any = await this.resolveEmployee(orgId, user);
    if (!employee) throw new NotFoundException('No employee record is linked to this login.');

    const year = new Date().getFullYear();
    const month = new Date().toISOString().slice(0, 7);
    const today = new Date().toISOString().slice(0, 10);
    const empId = String(employee._id);
    const name = employee.displayName || `${employee.firstName} ${employee.lastName}`.trim();

    const [balances, leaveTypes, requests, calendar, opts, holidays, punches] = await Promise.all([
      this.balanceModel.find({ organizationId: orgId, employeeId: empId, year, isDeleted: false }).lean(),
      this.leaveTypeModel.find({ organizationId: orgId, status: 'ACTIVE', isDeleted: false }).lean(),
      this.requestModel.find({ organizationId: orgId, employeeId: empId, isDeleted: false }).sort({ createdAt: -1 }).limit(5).lean(),
      this.calendarModel.findOne({ organizationId: orgId, year, isDeleted: false }).lean(),
      this.optModel.find({ organizationId: orgId, employeeId: empId, year }).lean(),
      this.holidayModel.find({ organizationId: orgId, year, status: 'ACTIVE', isDeleted: false, date: { $gte: today } }).sort({ date: 1 }).limit(6).lean(),
      this.attendanceModel.find({ organizationId: orgId, employeeId: empId, date: { $gte: `${month}-01` }, isDeleted: false }).lean(),
    ]);

    const typeById = new Map((leaveTypes as any[]).map((t) => [String(t._id), t]));
    const walletLines = (balances as any[]).map((b) => {
      const t = typeById.get(String(b.leaveTypeId));
      const total = (b.allocated || 0) + (b.carriedForward || 0);
      const available = total - (b.used || 0) - (b.pending || 0);
      return `- ${t?.name || 'Leave'} (${t?.code || '?'}): ${available} left of ${total} (used ${b.used || 0}, pending ${b.pending || 0})`;
    });

    const requestLines = (requests as any[]).map((r: any) => {
      const t = typeById.get(String(r.leaveTypeId));
      return `- ${t?.name || 'Leave'} ${r.startDate} → ${r.endDate} (${r.totalDays}d): ${r.status}`;
    });

    const limit = (calendar as any)?.restrictedLimit ?? 2;
    const present = (punches as any[]).filter((p) => p.status === 'PRESENT').length;
    const lateDays = (punches as any[]).filter((p) => p.isLate).length;

    const context = [
      `Employee: ${name} (${employee.employeeCode}), status ${employee.status}. Year ${year}, today ${today}.`,
      `LEAVE WALLETS:\n${walletLines.join('\n') || '(no wallets assigned yet)'}`,
      `RECENT REQUESTS:\n${requestLines.join('\n') || '(none)'}`,
      `RESTRICTED HOLIDAYS: entitled ${limit}, availed ${(opts as any[]).length}, remaining ${Math.max(0, limit - (opts as any[]).length)}.`,
      `UPCOMING HOLIDAYS:\n${(holidays as any[]).map((h) => `- ${h.name} on ${h.date} (${h.type})`).join('\n') || '(none listed)'}`,
      `ATTENDANCE THIS MONTH (${month}): ${present} present day(s), late ${lateDays} day(s).`,
    ].join('\n\n');

    const provider = this.aiService.defaultProvider();
    let answer: string;
    try {
      answer = await provider.chat(SYSTEM_PROMPT, `LIVE DATA:\n${context}\n\nQUESTION: ${q}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'AI assistant failed.';
      throw new HttpException({ message }, HttpStatus.BAD_GATEWAY);
    }

    this.logger.info(null, 'Copilot answer served', { employeeId: empId, provider: provider.id });
    return {
      answer,
      provider: provider.id,
      contextUsed: ['leave wallets', 'requests', 'restricted entitlement', 'upcoming holidays', 'monthly attendance'],
    };
  }

  private async resolveEmployee(orgId: string, user: CopilotRequestUser) {
    if (user?.userId) {
      const byUser = await this.empModel
        .findOne({ organizationId: orgId, userId: user.userId, isDeleted: false })
        .lean();
      if (byUser) return byUser;
    }
    const cleanEmail = (user?.email || '').toLowerCase().trim();
    if (cleanEmail) {
      return this.empModel
        .findOne({
          organizationId: orgId,
          isDeleted: false,
          $or: [{ workEmail: cleanEmail }, { personalEmail: cleanEmail }],
        })
        .lean();
    }
    return null;
  }
}
