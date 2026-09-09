export interface InvitationTemplateParams {
  toEmail: string;
  inviterName: string;
  roleLabel: string;
  orgName: string;
  acceptUrl: string;
  expiresInHours: number;
}

export function renderInvitationTemplate(params: InvitationTemplateParams): string {
  const expiryLabel =
    params.expiresInHours % 24 === 0
      ? `${params.expiresInHours / 24} day(s)`
      : `${params.expiresInHours} hour(s)`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've been invited to PeopleOS</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; border-bottom: 1px solid #f1f5f9; background-color: #524b6e;">
              <div style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                People<span style="color: #c084fc;">OS</span>
              </div>
              <div style="font-size: 11px; font-weight: 600; color: #e2e8f0; text-transform: uppercase; letter-spacing: 1.2px; margin-top: 4px;">
                Administrative Console Invitation
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #0f172a;">
                You've been invited to manage ${params.orgName} on PeopleOS
              </h2>
              <p style="margin: 0 0 20px 0; font-size: 13px; line-height: 1.6; color: #475569;">
                <strong>${params.inviterName}</strong> has invited you to join the PeopleOS administrative console with the role of <strong>${params.roleLabel}</strong>. Accept the invitation below to set up your account password and get started.
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 28px 0;">
                <a href="${params.acceptUrl}" style="display: inline-block; background-color: #524b6e; color: #ffffff; font-weight: 600; font-size: 13px; padding: 12px 32px; border-radius: 6px; text-decoration: none;">
                  Accept Invitation &amp; Set Password
                </a>
              </div>

              <p style="margin: 0 0 12px 0; font-size: 12px; line-height: 1.5; color: #64748b;">
                Or copy and paste this secure link into your browser:
              </p>
              <div style="background-color: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px; font-size: 11px; font-family: monospace; word-break: break-all; color: #475569; margin-bottom: 20px;">
                ${params.acceptUrl}
              </div>

              <div style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; padding: 12px;">
                <p style="margin: 0; font-size: 12px; color: #b45309; line-height: 1.5;">
                  <strong>Security notice:</strong> This invitation link expires in ${expiryLabel} and can only be used once. If you were not expecting this invitation, you can safely ignore this email.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 18px 32px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; text-align: center;">
              © 2026 PeopleOS Inc. • Secure Enterprise Workforce System<br/>
              Automated system notification, please do not reply.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
