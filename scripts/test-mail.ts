import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import nodemailer from "nodemailer";

async function testMail() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.MAIL_FROM || "Brightloop <no-reply@brightloop.test>";

  if (!host || !user || !pass) {
    console.error("❌ SMTP credentials missing in .env / .env.local!");
    console.log("Please populate the following in .env and .env.local:");
    console.log("  SMTP_HOST=sandbox.smtp.mailtrap.io");
    console.log("  SMTP_PORT=2525");
    console.log("  SMTP_USER=<your-mailtrap-user>");
    console.log("  SMTP_PASS=<your-mailtrap-pass>");
    process.exit(1);
  }

  console.log(`[Mailtrap] Connecting to ${host}:${port}...`);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  try {
    console.log("[Mailtrap] Verifying SMTP credentials...");
    await transporter.verify();
    console.log("✅ SMTP connection verified successfully!");

    console.log("[Mailtrap] Sending test message...");
    const info = await transporter.sendMail({
      from,
      to: "test@brightloop.test",
      subject: "Brightloop Mailtrap Integration Test",
      text: "If you are reading this email in Mailtrap, your SMTP integration is working perfectly!",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #4f46e5;">Brightloop SMS — Mailtrap Test</h2>
          <p style="color: #334155;">Congratulations! Your Mailtrap SMTP credentials are valid and operational.</p>
          <p style="color: #64748b; font-size: 12px;">Sent at: ${new Date().toISOString()}</p>
        </div>
      `,
    });

    console.log(`✅ Test email delivered to Mailtrap! Message ID: ${info.messageId}`);
    console.log("👉 Open your Mailtrap Inbox to view the email.");
  } catch (error) {
    console.error("❌ Failed to connect or send via Mailtrap:", error);
    process.exit(1);
  }
}

testMail();
