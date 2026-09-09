export interface AccountLockedTemplateParams {
  recipientName?: string;
}

export function renderAccountLockedTemplate(params: AccountLockedTemplateParams): string {
  const recipientName = params.recipientName || 'User';
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Account Locked - Security Alert</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="480" border="0" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden;">
          <tr>
            <td style="padding: 32px 32px 16px 32px; border-bottom: 1px solid #f1f5f9;">
              <div style="font-size: 20px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px;">
                People<span style="color: #4f46e5;">OS</span>
              </div>
              <div style="font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px;">
                Security Alert
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #b91c1c;">
                Your account has been locked
              </h2>
              <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.6; color: #475569;">
                Hello <strong>${recipientName}</strong>, we detected multiple consecutive failed sign-in attempts on your PeopleOS account and have temporarily locked it as a security precaution.
              </p>
              <p style="margin: 0 0 16px 0; font-size: 12px; line-height: 1.5; color: #64748b;">
                If this wasn't you, we recommend resetting your password once your account is unlocked. If you believe this is an error, contact your organization's IT Security Officer or HR Administrator to unlock your account immediately.
              </p>
            </td>
          </tr>
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
