import { Injectable } from '@nestjs/common';
import { LoggerHelper } from '../../../common/logger';
import { MailTransportService } from '../mail-transport.service';
import { renderAccountLockedTemplate } from '../templates';

/** Security notifications sent to an account holder. */
@Injectable()
export class AccountSecurityMailService {
  private readonly logger = LoggerHelper.Instance.child(AccountSecurityMailService.name);

  constructor(private readonly transport: MailTransportService) {}

  /**
   * @returns `false` on delivery failure rather than throwing — the lockout has
   * already been applied, and failing to notify must not undo a security
   * control or turn the failed sign-in into a 500.
   */
  async sendAccountLocked(email: string, recipientName = 'User'): Promise<boolean> {
    const { transporter, from } = await this.transport.getSenderClient();
    const html = renderAccountLockedTemplate({ recipientName });

    try {
      await transporter.sendMail({
        from,
        to: email,
        subject: `[PeopleOS] Security Alert: Your account has been locked`,
        html,
      });
      this.logger.info(null, 'Account locked notification sent', { email });
      return true;
    } catch (err: any) {
      this.logger.warn(null, 'Account locked notification delivery failed', err);
      return false;
    }
  }
}
