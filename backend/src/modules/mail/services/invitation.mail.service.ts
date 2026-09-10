import { Injectable } from '@nestjs/common';
import { LoggerHelper } from '../../../common/logger';
import { MailTransportService } from '../mail-transport.service';
import { renderInvitationTemplate } from '../templates';

export interface InvitationMailParams {
  toEmail: string;
  inviterName: string;
  roleLabel: string;
  orgName: string;
  acceptUrl: string;
  expiresInHours: number;
  orgId?: string;
}

/** Administrative user invitations. */
@Injectable()
export class InvitationMailService {
  private readonly logger = LoggerHelper.Instance.child(InvitationMailService.name);

  constructor(private readonly transport: MailTransportService) {}

  /**
   * @returns `false` on delivery failure rather than throwing — the invitation
   * row is already persisted and can be resent, so a mail outage must not roll
   * back the invite itself.
   */
  async sendInvitation(params: InvitationMailParams): Promise<boolean> {
    const { transporter, from } = await this.transport.getSenderClient(params.orgId);
    const html = renderInvitationTemplate(params);

    try {
      await transporter.sendMail({
        from,
        to: params.toEmail,
        subject: `[PeopleOS] ${params.inviterName} invited you to manage ${params.orgName}`,
        html,
      });
      this.logger.info(null, 'Invitation email sent', { email: params.toEmail });
      return true;
    } catch (err: any) {
      this.logger.warn(null, 'Invitation email delivery failed', err);
      return false;
    }
  }
}
