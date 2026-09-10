import { Inject, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { LoggerHelper } from '../../common/logger';
import { SettingsService } from '../settings/settings.service';

export interface SenderClient {
  transporter: nodemailer.Transporter;
  from: string;
}

/**
 * Resolves *how* mail is sent, separately from *what* is sent.
 *
 * Every mail service depends on this rather than building its own transporter,
 * so SMTP resolution — database settings first, `.env` as fallback — has one
 * definition. Splitting the send methods into their own files without this
 * would have duplicated the credential logic five times.
 */
@Injectable()
export class MailTransportService {
  private readonly logger = LoggerHelper.Instance.child(MailTransportService.name);
  private transporter?: nodemailer.Transporter;

  constructor(
    private readonly configService: ConfigService,
    @Optional() @Inject(SettingsService) private readonly settingsService?: SettingsService,
  ) {
    const host = this.configService.get<string>('SMTP_HOST', '');
    const port = Number(this.configService.get<number>('SMTP_PORT', 587));
    const user = this.configService.get<string>('SMTP_USER', '');
    const pass = this.configService.get<string>('SMTP_PASS', '');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    }
  }

  /**
   * Active transporter and sender identity.
   *
   * Business Settings win over `.env` so an administrator can change the
   * sending account without a redeploy; the environment stays as the fallback
   * for a fresh install with no settings row yet.
   */
  async getSenderClient(orgId?: string): Promise<SenderClient> {
    try {
      if (this.settingsService) {
        const config = await this.settingsService.getActiveSmtpConfig(orgId);
        if (config && config.isConfigured && config.user && config.pass) {
          const dynamicTransporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: { user: config.user, pass: config.pass },
          });
          const from = config.fromName
            ? `"${config.fromName}" <${config.fromEmail || config.user}>`
            : config.fromEmail || config.user;
          return { transporter: dynamicTransporter, from };
        }
      }
    } catch (err: any) {
      this.logger.warn(null, 'Failed to resolve dynamic SMTP settings from database', err);
    }

    if (this.transporter) {
      return {
        transporter: this.transporter,
        from: this.configService.get<string>('MAIL_FROM', ''),
      };
    }

    throw new Error(
      'SMTP credentials are not configured. Please configure your SMTP settings in Business Settings UI.',
    );
  }

  /** Frontend base URL, for links embedded in email bodies. */
  frontendUrl(): string {
    return this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
  }

  /** Employee portal sign-in URL. */
  portalLoginUrl(): string {
    return this.configService.get<string>('PORTAL_LOGIN_URL', 'http://localhost:5173/login');
  }
}
