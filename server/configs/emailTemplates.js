export const EMAIL_VERIFY_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify Your GreenCart Account</title>
</head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:Arial,sans-serif;color:#1f2937;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:22px 24px;background:#22c55e;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:0.3px;">
              GreenCart
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px 12px 24px;font-size:24px;line-height:32px;font-weight:700;">
              Verify Your Email Address
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 14px 24px;font-size:15px;line-height:24px;color:#374151;">
              Hi {{name}},<br />
              Use the one-time password below to verify your GreenCart account for <strong>{{email}}</strong>.
            </td>
          </tr>
          <tr>
            <td style="padding:10px 24px 18px 24px;" align="center">
              <div style="display:inline-block;min-width:220px;padding:14px 20px;background:#ecfdf3;border:1px solid #86efac;border-radius:10px;font-size:34px;line-height:38px;font-weight:700;letter-spacing:8px;color:#15803d;text-align:center;">
                {{otp}}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 8px 24px;font-size:14px;line-height:22px;color:#4b5563;">
              This OTP will expire in 24 hours. For your security, do not share this code with anyone.
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 28px 24px;font-size:13px;line-height:20px;color:#6b7280;">
              If you did not create this account, you can safely ignore this email.
            </td>
          </tr>
          <tr>
            <td style="padding:14px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;line-height:18px;color:#6b7280;">
              GreenCart Security Team<br />
              This is an automated message. Please do not reply.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export const getEmailVerifyTemplate = ({ otp, email, name = "there" }) => {
  return EMAIL_VERIFY_TEMPLATE.replace("{{otp}}", otp)
    .replace("{{email}}", email)
    .replace("{{name}}", name);
};

export const PASSWORD_RESET_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Your GreenCart Password</title>
</head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:Arial,sans-serif;color:#1f2937;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="padding:22px 24px;background:#22c55e;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:0.3px;">
              GreenCart
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px 12px 24px;font-size:24px;line-height:32px;font-weight:700;">
              Reset Your Password
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 14px 24px;font-size:15px;line-height:24px;color:#374151;">
              Hi {{name}},<br />
              We received a password reset request for <strong>{{email}}</strong>. Use the OTP below to continue.
            </td>
          </tr>
          <tr>
            <td style="padding:10px 24px 18px 24px;" align="center">
              <div style="display:inline-block;min-width:220px;padding:14px 20px;background:#eff6ff;border:1px solid #93c5fd;border-radius:10px;font-size:34px;line-height:38px;font-weight:700;letter-spacing:8px;color:#1d4ed8;text-align:center;">
                {{otp}}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 24px 8px 24px;font-size:14px;line-height:22px;color:#4b5563;">
              This OTP will expire in 15 minutes. Do not share this code with anyone.
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 28px 24px;font-size:13px;line-height:20px;color:#6b7280;">
              If you did not request a password reset, you can ignore this email.
            </td>
          </tr>
          <tr>
            <td style="padding:14px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;line-height:18px;color:#6b7280;">
              GreenCart Security Team<br />
              This is an automated message. Please do not reply.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export const getPasswordResetTemplate = ({ otp, email, name = "there" }) => {
  return PASSWORD_RESET_TEMPLATE.replace("{{otp}}", otp)
    .replace("{{email}}", email)
    .replace("{{name}}", name);
};
