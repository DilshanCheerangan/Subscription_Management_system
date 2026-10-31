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

export interface SendInvoiceEmailParams {
  toEmail: string;
  customerName: string;
  invoiceNumber: string;
  totalFormatted: string;
  dueDateFormatted: string;
  viewUrl: string;
}

export async function sendInvoiceSummaryEmail(params: SendInvoiceEmailParams): Promise<boolean> {
  const { toEmail, customerName, invoiceNumber, totalFormatted, dueDateFormatted, viewUrl } = params;
  const mailFrom = process.env.MAIL_FROM || "Brightloop Billing <billing@brightloop.test>";
  const transporter = getMailTransporter();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 20px;">
        <h2 style="color: #4f46e5; margin: 0;">Brightloop Software</h2>
        <span style="color: #64748b; font-size: 14px; font-weight: bold;">Invoice ${invoiceNumber}</span>
      </div>
      <p style="color: #334155; font-size: 14px; line-height: 1.5;">Dear <strong>${customerName}</strong>,</p>
      <p style="color: #334155; font-size: 14px; line-height: 1.5;">
        Your recurring subscription invoice <strong>${invoiceNumber}</strong> has been generated for the amount of 
        <strong style="color: #4f46e5; font-size: 16px;">${totalFormatted}</strong>.
      </p>
      <p style="color: #64748b; font-size: 13px;">Payment Due Date: <strong>${dueDateFormatted}</strong></p>
      <div style="margin: 28px 0;">
        <a href="${viewUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">
          View Invoice & Details
        </a>
      </div>
      <p style="color: #94a3b8; font-size: 12px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
        Thank you for choosing Brightloop Software. If you have questions, please contact billing@brightloop.test.
      </p>
    </div>
  `;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: mailFrom,
        to: toEmail,
        subject: `Invoice ${invoiceNumber} from Brightloop Software (${totalFormatted})`,
        html,
      });
      return true;
    } catch (error) {
      console.error("[Mail] Failed to send invoice email via SMTP:", error);
    }
  }

  console.log("-----------------------------------------");
  console.log(`[DEV MAIL INVOICE] To: ${toEmail}`);
  console.log(`[DEV MAIL INVOICE] Invoice: ${invoiceNumber} | Total: ${totalFormatted}`);
  console.log(`[DEV MAIL INVOICE] View: ${viewUrl}`);
  console.log("-----------------------------------------");
  return true;
}

