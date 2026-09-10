import { Injectable } from '@nestjs/common';
import { LoggerHelper } from '../../../common/logger';
import { MailTransportService } from '../mail-transport.service';
import { renderOnboardingCredentialsTemplate } from '../templates';

export interface OnboardingCredentialsMailParams {
  toEmail: string;
  loginEmail?: string;
  employeeName: string;
  employeeCode: string;
  workEmail?: string;
  temporaryPassword: string;
  department?: string;
  designation?: string;
  joiningDate?: string;
  orgId?: string;
}

/** New-joiner welcome mail carrying first-time sign-in credentials. */
@Injectable()
export class OnboardingMailService {
  private readonly logger = LoggerHelper.Instance.child(OnboardingMailService.name);

  constructor(private readonly transport: MailTransportService) {}

  /**
   * @returns `false` on delivery failure rather than throwing — the employee
   * record and login already exist, and the provisioning flow records a FAILED
   * email status so HR can resend instead of re-creating the employee.
   */
  async sendCredentials(params: OnboardingCredentialsMailParams): Promise<boolean> {
    const { transporter, from } = await this.transport.getSenderClient(params.orgId);
    const html = renderOnboardingCredentialsTemplate({
      ...params,
      loginUrl: this.transport.portalLoginUrl(),
    });

    try {
      await transporter.sendMail({
        from,
        to: params.toEmail,
        subject: `[PeopleOS] Official Offer & Welcome Letter — Account Credentials for ${params.employeeName}`,
        html,
      });
      this.logger.info(null, 'Official offer & welcome email sent', {
        email: params.toEmail,
        employeeCode: params.employeeCode,
      });
      return true;
    } catch (err: any) {
      this.logger.warn(null, 'Offer & welcome email delivery failed', err);
      return false;
    }
  }
}
