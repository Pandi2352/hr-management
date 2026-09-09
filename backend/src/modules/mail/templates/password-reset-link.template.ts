export interface PasswordResetLinkTemplateParams {
  resetUrl: string;
  recipientName?: string;
}

export function renderPasswordResetLinkTemplate(params: PasswordResetLinkTemplateParams): string {
  const recipientName = params.recipientName || 'User';
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="480" border="0" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 16px 32px; border-bottom: 1px solid #f1f5f9;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">
                      People<span style="color: #4f46e5;">OS</span>
                    </div>
                    <div style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px;">
                      Security & Identity Protection
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #0f172a;">
                Reset Your Password
              </h2>
              <p style="margin: 0 0 20px 0; font-size: 13px; line-height: 1.6; color: #475569;">
                Hello <strong>${recipientName}</strong>, we received a request to reset your PeopleOS workplace account password. Click the secure link below to create a new password:
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 28px 0;">
                <a href="${params.resetUrl}" style="display: inline-block; background-color: #4f46e5; color: #ffffff; font-weight: 600; font-size: 13px; padding: 12px 28px; border-radius: 6px; text-decoration: none;">
                  Reset My Password
                </a>
              </div>

              <p style="margin: 0 0 12px 0; font-size: 12px; line-height: 1.5; color: #64748b;">
                Or copy and paste this secure link into your browser:
              </p>
              <div style="background-color: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px; padding: 10px; font-size: 11px; font-family: monospace; word-break: break-all; color: #475569; margin-bottom: 20px;">
                ${params.resetUrl}
              </div>

              <div style="font-size: 11px; color: #94a3b8; line-height: 1.5;">
                This link will expire in 15 minutes and can only be used once. If you did not request this change, you can safely ignore this email.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; text-align: center;">
              © 2026 PeopleOS Inc. • Enterprise Workforce Operating System<br/>
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
