import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PayrollRecord,
  PayrollRecordDocument,
} from './schemas/payroll-record.schema';
import { Employee, EmployeeDocument } from '../employees/schemas/employee.schema';
import { Department, DepartmentDocument } from '../organization/schemas/department.schema';
import { Designation, DesignationDocument } from '../organization/schemas/designation.schema';
import { CreatePayrollDto, PayrollQueryDto, UpdatePayrollDto } from './dto/payroll.dto';
import { MailService } from '../mail/mail.service';
import { AuditService } from '../../common/audit/audit.service';
import { AuditAction, AuditResource } from '../../common/audit/audit.constants';
import { LoggerHelper } from '../../common/logger';
import { DateHelper } from '../../common/date';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Money is rounded to cents at every step so totals never drift by a float epsilon. */
function money(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export interface PayrollTotals {
  earnedBasic: number;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  lopDays: number;
}

@Injectable()
export class PayrollService {
  private readonly logger = LoggerHelper.Instance.child(PayrollService.name);
  private readonly dates = DateHelper.Instance;

  constructor(
    @InjectModel(PayrollRecord.name)
    private readonly payrollModel: Model<PayrollRecordDocument>,
    @InjectModel(Employee.name)
    private readonly empModel: Model<EmployeeDocument>,
    @InjectModel(Department.name)
    private readonly deptModel: Model<DepartmentDocument>,
    @InjectModel(Designation.name)
    private readonly desigModel: Model<DesignationDocument>,
    private readonly mailService: MailService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * The single place payroll money is decided.
   *
   * Basic pay is prorated by attendance — a month with 26 of 30 days worked
   * earns 26/30 of basic. Allowances, bonus and overtime are paid in full
   * because they are already period amounts, not daily rates.
   *
   * Net pay is floored at zero: deductions exceeding earnings would otherwise
   * produce a negative payslip, which is a data-entry error rather than a
   * legitimate instruction to claw money back.
   */
  calculate(input: {
    totalDays: number;
    workingDays: number;
    basicSalary: number;
    allowances?: number;
    bonus?: number;
    overtimeAmount?: number;
    taxDeduction?: number;
    providentFund?: number;
    otherDeductions?: number;
  }): PayrollTotals {
    const totalDays = Number(input.totalDays) || 0;
    const workingDays = Number(input.workingDays) || 0;

    if (workingDays > totalDays) {
      throw new BadRequestException(
        `Working days (${workingDays}) cannot exceed the ${totalDays} days in the cycle.`,
      );
    }

    const earnedBasic = totalDays > 0 ? money((input.basicSalary * workingDays) / totalDays) : 0;

    const grossEarnings = money(
      earnedBasic +
        (input.allowances || 0) +
        (input.bonus || 0) +
        (input.overtimeAmount || 0),
    );

    const totalDeductions = money(
      (input.taxDeduction || 0) + (input.providentFund || 0) + (input.otherDeductions || 0),
    );

    return {
      earnedBasic,
      grossEarnings,
      totalDeductions,
      netPay: money(Math.max(0, grossEarnings - totalDeductions)),
      lopDays: Math.max(0, totalDays - workingDays),
    };
  }

  /** Employees with no payroll row yet for the period — the dropdown's source. */
  async getEligibleEmployees(orgId: string, month: number, year: number) {
    const [employees, existing] = await Promise.all([
      this.empModel
        .find(
          { organizationId: orgId, isDeleted: false, status: { $nin: ['TERMINATED', 'RESIGNED'] } },
          'firstName lastName displayName employeeCode workEmail departmentId designationId avatarUrl status',
        )
        .sort({ firstName: 1 })
        .lean(),
      this.payrollModel
        .find({ organizationId: orgId, month, year, isDeleted: false }, 'employeeId')
        .lean(),
    ]);

    const alreadyPaid = new Set(existing.map((r) => String(r.employeeId)));
    const [departments, designations] = await Promise.all([
      this.deptModel.find({ organizationId: orgId, isDeleted: false }, '_id name').lean(),
      this.desigModel.find({ organizationId: orgId, isDeleted: false }, '_id title').lean(),
    ]);
    const deptMap = new Map(departments.map((d) => [String(d._id), d.name]));
    const desigMap = new Map(designations.map((d) => [String(d._id), d.title]));

    return employees.map((e) => ({
      _id: e._id,
      name: e.displayName || `${e.firstName} ${e.lastName}`.trim(),
      employeeCode: e.employeeCode,
      workEmail: e.workEmail,
      avatarUrl: e.avatarUrl,
      departmentName: e.departmentId ? deptMap.get(String(e.departmentId)) || '' : '',
      designationTitle: e.designationId ? desigMap.get(String(e.designationId)) || '' : '',
      // The UI disables rather than hides these, so it is obvious why someone
      // is missing instead of leaving HR hunting for a name that never appears.
      alreadyProcessed: alreadyPaid.has(String(e._id)),
    }));
  }

  async create(dto: CreatePayrollDto, orgId: string, actorId: string) {
    const employee = await this.empModel
      .findOne({ _id: dto.employeeId, organizationId: orgId, isDeleted: false })
      .lean();
    if (!employee) throw new NotFoundException('Employee not found');

    const duplicate = await this.payrollModel
      .findOne({
        organizationId: orgId,
        employeeId: dto.employeeId,
        month: dto.month,
        year: dto.year,
        isDeleted: false,
      })
      .lean();
    if (duplicate) {
      throw new ConflictException(
        `Payroll for this employee already exists for ${MONTH_NAMES[dto.month - 1]} ${dto.year}.`,
      );
    }

    const totals = this.calculate(dto);
    const [department, designation] = await Promise.all([
      employee.departmentId
        ? this.deptModel.findOne({ _id: employee.departmentId }, 'name').lean()
        : null,
      employee.designationId
        ? this.desigModel.findOne({ _id: employee.designationId }, 'title').lean()
        : null,
    ]);

    let record: PayrollRecordDocument;
    try {
      record = await this.payrollModel.create({
        organizationId: orgId,
        employeeId: dto.employeeId,
        employeeName: employee.displayName || `${employee.firstName} ${employee.lastName}`.trim(),
        employeeCode: employee.employeeCode,
        employeeEmail: employee.workEmail || '',
        departmentName: department?.name || '',
        designationTitle: designation?.title || '',
        month: dto.month,
        year: dto.year,
        totalDays: dto.totalDays,
        workingDays: dto.workingDays,
        basicSalary: money(dto.basicSalary),
        allowances: money(dto.allowances || 0),
        bonus: money(dto.bonus || 0),
        overtimeAmount: money(dto.overtimeAmount || 0),
        taxDeduction: money(dto.taxDeduction || 0),
        providentFund: money(dto.providentFund || 0),
        otherDeductions: money(dto.otherDeductions || 0),
        ...totals,
        status: dto.status || 'PENDING',
        remarks: dto.remarks || '',
        processedBy: actorId,
      });
    } catch (err: any) {
      // The unique index is the real guard; two concurrent submits both pass
      // the findOne check above and only one reaches the database.
      if (err?.code === 11000) {
        throw new ConflictException(
          `Payroll for this employee already exists for ${MONTH_NAMES[dto.month - 1]} ${dto.year}.`,
        );
      }
      throw err;
    }

    await this.audit(orgId, actorId, AuditAction.PAYROLL_PROCESSED, record, null, {
      netPay: record.netPay,
      status: record.status,
      period: this.periodLabel(record.month, record.year),
    });

    if (dto.sendPayslip) {
      await this.sendPayslip(record._id, orgId, actorId);
      return this.findById(record._id, orgId);
    }

    return record.toObject();
  }

  async findAll(orgId: string, query: PayrollQueryDto) {
    const filter: any = { organizationId: orgId, isDeleted: false };

    if (query.status && query.status !== 'ALL') filter.status = query.status;
    if (query.month) filter.month = Number(query.month);
    if (query.year) filter.year = Number(query.year);

    if (query.search?.trim()) {
      const regex = new RegExp(query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        { employeeName: regex },
        { employeeCode: regex },
        { departmentName: regex },
        { designationTitle: regex },
      ];
    }

    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(query.pageSize) || 10));

    const [data, totalItems] = await Promise.all([
      this.payrollModel
        .find(filter)
        .sort({ year: -1, month: -1, createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      this.payrollModel.countDocuments(filter),
    ]);

    return {
      data,
      meta: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
      },
    };
  }

  async findById(id: string, orgId: string) {
    const record = await this.payrollModel
      .findOne({ _id: id, organizationId: orgId, isDeleted: false })
      .lean();
    if (!record) throw new NotFoundException('Payroll record not found');
    return record;
  }

  async update(id: string, dto: UpdatePayrollDto, orgId: string, actorId: string) {
    const record = await this.payrollModel.findOne({
      _id: id,
      organizationId: orgId,
      isDeleted: false,
    });
    if (!record) throw new NotFoundException('Payroll record not found');

    const before = {
      netPay: record.netPay,
      grossEarnings: record.grossEarnings,
      status: record.status,
    };

    // Recomputed from the merged inputs, so an edit can never leave the stored
    // totals inconsistent with the components they came from.
    const merged = {
      totalDays: dto.totalDays ?? record.totalDays,
      workingDays: dto.workingDays ?? record.workingDays,
      basicSalary: dto.basicSalary ?? record.basicSalary,
      allowances: dto.allowances ?? record.allowances,
      bonus: dto.bonus ?? record.bonus,
      overtimeAmount: dto.overtimeAmount ?? record.overtimeAmount,
      taxDeduction: dto.taxDeduction ?? record.taxDeduction,
      providentFund: dto.providentFund ?? record.providentFund,
      otherDeductions: dto.otherDeductions ?? record.otherDeductions,
    };

    Object.assign(record, merged, this.calculate(merged));
    if (dto.status) record.status = dto.status;
    if (dto.remarks !== undefined) record.remarks = dto.remarks;
    if (record.status === 'COMPLETED' && !record.paidOn) record.paidOn = new Date();

    await record.save();

    await this.audit(orgId, actorId, AuditAction.UPDATE, record, before, {
      netPay: record.netPay,
      grossEarnings: record.grossEarnings,
      status: record.status,
    });

    return record.toObject();
  }

  async remove(id: string, orgId: string, actorId: string) {
    const record = await this.payrollModel.findOne({
      _id: id,
      organizationId: orgId,
      isDeleted: false,
    });
    if (!record) throw new NotFoundException('Payroll record not found');

    // Soft delete: a payslip that was emailed is a financial record someone
    // already received, so the row has to remain auditable.
    record.isDeleted = true;
    record.deletedAt = new Date();
    await record.save();

    await this.audit(orgId, actorId, AuditAction.DELETE, record, {
      netPay: record.netPay,
      period: this.periodLabel(record.month, record.year),
    }, null);

    return { message: `Payroll record for ${record.employeeName} was removed.` };
  }

  /**
   * Emails the payslip.
   *
   * Delivery failure is recorded on the record and surfaced to the caller
   * rather than thrown: the payroll run itself succeeded, and an SMTP outage
   * must not roll back a processed salary.
   */
  async sendPayslip(id: string, orgId: string, actorId: string, overrideEmail?: string) {
    const record = await this.payrollModel.findOne({
      _id: id,
      organizationId: orgId,
      isDeleted: false,
    });
    if (!record) throw new NotFoundException('Payroll record not found');

    const toEmail = (overrideEmail || record.employeeEmail || '').trim();
    if (!toEmail) {
      throw new BadRequestException(
        `${record.employeeName} has no work email address, so the payslip cannot be sent.`,
      );
    }

    const periodLabel = this.periodLabel(record.month, record.year);
    const sent = await this.mailService.sendPayslipEmail({
      toEmail,
      employeeName: record.employeeName,
      employeeCode: record.employeeCode,
      designation: record.designationTitle,
      department: record.departmentName,
      periodLabel,
      currency: record.currency,
      totalDays: record.totalDays,
      workingDays: record.workingDays,
      lopDays: record.lopDays,
      earnedBasic: record.earnedBasic,
      allowances: record.allowances,
      bonus: record.bonus,
      overtimeAmount: record.overtimeAmount,
      grossEarnings: record.grossEarnings,
      taxDeduction: record.taxDeduction,
      providentFund: record.providentFund,
      otherDeductions: record.otherDeductions,
      totalDeductions: record.totalDeductions,
      netPay: record.netPay,
      orgId,
    });

    record.payslipEmailStatus = sent ? 'SENT' : 'FAILED';
    if (sent) {
      record.payslipSentAt = new Date();
      record.payslipSendCount += 1;
    }
    await record.save();

    await this.audit(
      orgId,
      actorId,
      AuditAction.PAYSLIP_SENT,
      record,
      null,
      { email: toEmail, period: periodLabel, delivered: sent },
    );

    return {
      sent,
      email: toEmail,
      message: sent
        ? `Payslip for ${periodLabel} sent to ${toEmail}.`
        : `Payroll saved, but the payslip could not be delivered to ${toEmail}. Check the mail settings and resend.`,
    };
  }

  /** Bulk dispatch for a period. Failures are reported, never thrown. */
  async sendPayslipsForPeriod(orgId: string, month: number, year: number, actorId: string) {
    const records = await this.payrollModel
      .find({ organizationId: orgId, month, year, isDeleted: false, status: { $ne: 'REJECTED' } })
      .lean();

    let sent = 0;
    const failures: { employeeName: string; reason: string }[] = [];

    for (const record of records) {
      try {
        const result = await this.sendPayslip(record._id, orgId, actorId);
        if (result.sent) sent++;
        else failures.push({ employeeName: record.employeeName, reason: 'Delivery failed' });
      } catch (err: any) {
        failures.push({ employeeName: record.employeeName, reason: err?.message || 'Unknown error' });
      }
    }

    return { total: records.length, sent, failed: failures.length, failures };
  }

  /**
   * Dashboard figures: twelve months of totals plus the current-period
   * component split, in one pass per collection rather than one query per month.
   */
  async getSummary(orgId: string, year: number) {
    const rows = await this.payrollModel.aggregate([
      { $match: { organizationId: orgId, year: Number(year), isDeleted: false } },
      {
        $group: {
          _id: '$month',
          grossSalary: { $sum: '$grossEarnings' },
          netSalary: { $sum: '$netPay' },
          taxDeduction: { $sum: '$taxDeduction' },
        },
      },
    ]);

    const byMonth = new Map(rows.map((r: any) => [r._id, r]));
    const monthly = MONTH_NAMES.map((name, i) => {
      const r: any = byMonth.get(i + 1);
      return {
        month: name.slice(0, 3),
        grossSalary: money(r?.grossSalary || 0),
        netSalary: money(r?.netSalary || 0),
        taxDeduction: money(r?.taxDeduction || 0),
      };
    });

    const [totals] = await this.payrollModel.aggregate([
      { $match: { organizationId: orgId, year: Number(year), isDeleted: false } },
      {
        $group: {
          _id: null,
          basic: { $sum: '$earnedBasic' },
          bonus: { $sum: '$bonus' },
          overtime: { $sum: '$overtimeAmount' },
          allowances: { $sum: '$allowances' },
          tax: { $sum: '$taxDeduction' },
          providentFund: { $sum: '$providentFund' },
          other: { $sum: '$otherDeductions' },
          gross: { $sum: '$grossEarnings' },
          net: { $sum: '$netPay' },
          headcount: { $sum: 1 },
        },
      },
    ]);

    const t = totals || {};
    const components = [
      { name: 'Basic', amount: money(t.basic || 0) },
      { name: 'Allowances', amount: money(t.allowances || 0) },
      { name: 'Bonus', amount: money(t.bonus || 0) },
      { name: 'Overtime', amount: money(t.overtime || 0) },
      { name: 'Tax', amount: money(t.tax || 0) },
      { name: 'Provident Fund', amount: money(t.providentFund || 0) },
    ];
    const componentTotal = components.reduce((sum, c) => sum + c.amount, 0);

    const statusRows = await this.payrollModel.aggregate([
      { $match: { organizationId: orgId, year: Number(year), isDeleted: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    return {
      year: Number(year),
      monthly,
      breakdown: components.map((c) => ({
        ...c,
        // Guarded: with no payroll yet every share would be NaN.
        percentage: componentTotal > 0 ? Math.round((c.amount / componentTotal) * 100) : 0,
      })),
      totals: {
        grossPayout: money(t.gross || 0),
        netPayout: money(t.net || 0),
        totalDeductions: money((t.tax || 0) + (t.providentFund || 0) + (t.other || 0)),
        recordCount: t.headcount || 0,
      },
      byStatus: statusRows.reduce(
        (acc: Record<string, number>, r: any) => ({ ...acc, [r._id]: r.count }),
        {},
      ),
    };
  }

  /** CSV of a period, for finance handover. */
  async exportCsv(orgId: string, query: PayrollQueryDto): Promise<string> {
    const { data } = await this.findAll(orgId, { ...query, page: 1, pageSize: 200 });

    const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = [
      'Employee Code', 'Employee', 'Department', 'Designation', 'Period',
      'Total Days', 'Working Days', 'LOP Days', 'Basic', 'Earned Basic',
      'Allowances', 'Bonus', 'Overtime', 'Gross', 'Tax', 'Provident Fund',
      'Other Deductions', 'Total Deductions', 'Net Pay', 'Currency', 'Status', 'Payslip Sent',
    ].join(',');

    const body = data
      .map((r: any) =>
        [
          r.employeeCode, r.employeeName, r.departmentName, r.designationTitle,
          this.periodLabel(r.month, r.year), r.totalDays, r.workingDays, r.lopDays,
          r.basicSalary, r.earnedBasic, r.allowances, r.bonus, r.overtimeAmount,
          r.grossEarnings, r.taxDeduction, r.providentFund, r.otherDeductions,
          r.totalDeductions, r.netPay, r.currency, r.status,
          r.payslipSentAt ? this.dates.formatDate(new Date(r.payslipSentAt)) : '',
        ]
          .map(escape)
          .join(','),
      )
      .join('\n');

    return `${header}\n${body}`;
  }

  private periodLabel(month: number, year: number): string {
    return `${MONTH_NAMES[month - 1] ?? month} ${year}`;
  }

  private async audit(
    orgId: string,
    actorId: string,
    action: AuditAction,
    record: any,
    before: any,
    after: any,
  ) {
    await this.auditService.record({
      action,
      resourceType: AuditResource.PAYROLL,
      resourceId: record._id,
      organizationId: orgId,
      actorUserId: actorId,
      actorEmployeeId: record.employeeId,
      description: `${action === AuditAction.PAYSLIP_SENT ? 'Payslip dispatched for' : 'Payroll record for'} ${record.employeeName} — ${this.periodLabel(record.month, record.year)}`,
      before,
      after,
    });
  }
}
