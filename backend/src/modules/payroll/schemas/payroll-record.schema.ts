import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { generateUuid } from '../../../common/utils/uuid.util';

export type PayrollRecordDocument = PayrollRecord & Document;

export const PAYROLL_STATUSES = ['PENDING', 'COMPLETED', 'REJECTED'] as const;
export type PayrollStatus = (typeof PAYROLL_STATUSES)[number];

export const PAYSLIP_EMAIL_STATUSES = ['NOT_SENT', 'SENT', 'FAILED'] as const;
export type PayslipEmailStatus = (typeof PAYSLIP_EMAIL_STATUSES)[number];

/**
 * One payroll run per employee per calendar month.
 *
 * Every monetary total on this document is **computed on the server** from the
 * component amounts — see `PayrollService.calculate()`. Nothing derived is ever
 * accepted from a client: a payroll row that takes `netPay` from the request
 * body is a wire-transfer instruction an attacker can author.
 *
 * The employee's name, code and department are denormalised at processing time
 * on purpose. A payslip is a financial record of what was true in that period;
 * it must not silently change because someone was later renamed or transferred.
 */
@Schema({ timestamps: true, collection: 'payroll-records' })
export class PayrollRecord {
  @Prop({ type: String, default: generateUuid })
  _id: string;

  @Prop({ type: String, required: true, index: true })
  organizationId: string;

  @Prop({ type: String, required: true, index: true })
  employeeId: string;

  // --- Denormalised snapshot of the employee at processing time -------------

  @Prop({ type: String, required: true })
  employeeName: string;

  @Prop({ type: String, default: '' })
  employeeCode: string;

  /** Where the payslip was sent. Kept so a later email change is auditable. */
  @Prop({ type: String, default: '' })
  employeeEmail: string;

  @Prop({ type: String, default: '' })
  departmentName: string;

  @Prop({ type: String, default: '' })
  designationTitle: string;

  // --- Period ---------------------------------------------------------------

  /** 1-12. Stored numerically so range queries and sorting work. */
  @Prop({ type: Number, required: true, min: 1, max: 12, index: true })
  month: number;

  @Prop({ type: Number, required: true, index: true })
  year: number;

  @Prop({ type: Number, required: true, min: 1, max: 31 })
  totalDays: number;

  @Prop({ type: Number, required: true, min: 0, max: 31 })
  workingDays: number;

  @Prop({ type: Number, default: 0, min: 0 })
  lopDays: number;

  // --- Earnings (inputs) ----------------------------------------------------

  @Prop({ type: Number, required: true, min: 0 })
  basicSalary: number;

  @Prop({ type: Number, default: 0, min: 0 })
  allowances: number;

  @Prop({ type: Number, default: 0, min: 0 })
  bonus: number;

  @Prop({ type: Number, default: 0, min: 0 })
  overtimeAmount: number;

  // --- Deductions (inputs) --------------------------------------------------

  @Prop({ type: Number, default: 0, min: 0 })
  taxDeduction: number;

  @Prop({ type: Number, default: 0, min: 0 })
  providentFund: number;

  @Prop({ type: Number, default: 0, min: 0 })
  otherDeductions: number;

  // --- Derived totals (server-computed, never client-supplied) --------------

  /** `basicSalary` prorated by attendance: basic × workingDays ÷ totalDays. */
  @Prop({ type: Number, default: 0, min: 0 })
  earnedBasic: number;

  @Prop({ type: Number, default: 0, min: 0 })
  grossEarnings: number;

  @Prop({ type: Number, default: 0, min: 0 })
  totalDeductions: number;

  @Prop({ type: Number, default: 0 })
  netPay: number;

  @Prop({ type: String, default: 'USD' })
  currency: string;

  // --- Lifecycle ------------------------------------------------------------

  @Prop({ type: String, enum: PAYROLL_STATUSES, default: 'PENDING', index: true })
  status: PayrollStatus;

  @Prop({ type: String, default: '' })
  remarks: string;

  @Prop({ type: String, enum: PAYSLIP_EMAIL_STATUSES, default: 'NOT_SENT' })
  payslipEmailStatus: PayslipEmailStatus;

  @Prop({ type: Date, default: null })
  payslipSentAt: Date | null;

  /** Incremented on every resend, so repeated dispatches are visible. */
  @Prop({ type: Number, default: 0 })
  payslipSendCount: number;

  @Prop({ type: String, default: '' })
  processedBy: string;

  @Prop({ type: Date, default: null })
  paidOn: Date | null;

  @Prop({ type: Boolean, default: false, index: true })
  isDeleted: boolean;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PayrollRecordSchema = SchemaFactory.createForClass(PayrollRecord);

/**
 * One payroll row per employee per period. Enforced in the database rather than
 * only in the service, because a double-submit races two service-level checks
 * and would otherwise pay someone twice.
 */
PayrollRecordSchema.index(
  { organizationId: 1, employeeId: 1, year: 1, month: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);

PayrollRecordSchema.index({ organizationId: 1, year: 1, month: 1 });
PayrollRecordSchema.index({ organizationId: 1, status: 1 });
