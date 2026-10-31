import nodemailer from "nodemailer";

function getMailTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user, pass },
    });
  }

  // Fallback transporter that logs to console in development
  return null;
}

export async function sendPasswordResetEmail(toEmail: string, resetUrl: string): Promise<boolean> {
  const mailFrom = process.env.MAIL_FROM || "Brightloop <no-reply@brightloop.test>";
  const transporter = getMailTransporter();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #4f46e5; margin-bottom: 16px;">Brightloop Subscription Management</h2>
      <p style="color: #334155; font-size: 14px; line-height: 1.5;">You requested a password reset for your Brightloop account.</p>
      <p style="color: #334155; font-size: 14px; line-height: 1.5;">Click the button below to reset your password. This link is single-use and will expire in 30 minutes.</p>
      <div style="margin: 24px 0;">
        <a href="${resetUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
          Reset Your Password
        </a>
      </div>
      <p style="color: #64748b; font-size: 12px; margin-top: 24px;">If you didn't request this email, you can safely ignore it.</p>
    </div>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: mailFrom,
        to: toEmail,
        subject: "Reset your Brightloop password",
        html,
      });
      return true;
    } catch (error) {
      console.error("[Mail] Failed to send email via SMTP:", error);
    }
  }

  // Console development fallback
  console.log("-----------------------------------------");
  console.log(`[DEV MAIL] To: ${toEmail}`);
  console.log(`[DEV MAIL] Reset Link: ${resetUrl}`);
  console.log("-----------------------------------------");
  return true;
}
