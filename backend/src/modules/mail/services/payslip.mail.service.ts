import { Injectable } from '@nestjs/common';
import { LoggerHelper } from '../../../common/logger';
import { MailTransportService } from '../mail-transport.service';
import { renderPayslipTemplate } from '../templates';

export interface PayslipMailParams {
  toEmail: string;
  employeeName: string;
  employeeCode?: string;
  designation?: string;
  department?: string;
  periodLabel: string;
  currency: string;
  totalDays: number;
  workingDays: number;
  lopDays: number;
  earnedBasic: number;
  allowances: number;
  bonus: number;
  overtimeAmount: number;
  grossEarnings: number;
  taxDeduction: number;
  providentFund: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  organizationName?: string;
  orgId?: string;
}

/** Monthly payslip delivery. */
@Injectable()
export class PayslipMailService {
  private readonly logger = LoggerHelper.Instance.child(PayslipMailService.name);

  constructor(private readonly transport: MailTransportService) {}

  /**
   * @returns `false` on delivery failure rather than throwing — the payroll run
   * has already been processed and the record stores a FAILED email status, so
   * an SMTP outage cannot roll back a salary that was calculated and saved.
   */
  async sendPayslip(params: PayslipMailParams): Promise<boolean> {
    const { transporter, from } = await this.transport.getSenderClient(params.orgId);
    const html = renderPayslipTemplate({
      ...params,
      portalUrl: this.transport.portalLoginUrl(),
    });

    try {
      await transporter.sendMail({
        from,
        to: params.toEmail,
        subject: `[PeopleOS] Payslip for ${params.periodLabel} — ${params.employeeName}`,
        html,
      });
      this.logger.info(null, 'Payslip email sent', {
        email: params.toEmail,
        employeeCode: params.employeeCode,
        period: params.periodLabel,
      });
      return true;
    } catch (err: any) {
      this.logger.warn(null, 'Payslip email delivery failed', err);
      return false;
    }
  }
}
