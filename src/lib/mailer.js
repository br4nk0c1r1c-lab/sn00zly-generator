import nodemailer from "nodemailer";
import { PRODUCT_NAME } from "@/lib/site";

// Login links go out over SMTP (Google Workspace, hello@sn00zly.com) rather
// than a Klaviyo flow: they must arrive within seconds, and they must reach
// members who have unsubscribed from marketing email.

let transporter = null;

function getTransporter() {
  if (!transporter) {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!user || !pass) throw new Error("SMTP_USER / SMTP_PASS are not set");
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT || 465),
      secure: Number(process.env.SMTP_PORT || 465) === 465,
      auth: { user, pass },
    });
  }
  return transporter;
}

export async function sendLoginEmail({ to, url }) {
  const from = process.env.SMTP_FROM || `Sn00zly <${process.env.SMTP_USER}>`;
  const text = [
    `Here is your sign-in link for the ${PRODUCT_NAME}:`,
    "",
    url,
    "",
    "The link works for 30 minutes. If you did not ask for it, you can ignore this email.",
    "",
    "— Sn00zly",
  ].join("\n");

  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;color:#33405A;max-width:460px;margin:0 auto;padding:24px;">
  <p style="font-size:13px;letter-spacing:3px;color:#8A94A8;margin:0 0 18px;">SN00ZLY</p>
  <h1 style="font-size:20px;color:#22395C;margin:0 0 12px;">Your sign-in link</h1>
  <p style="font-size:15px;line-height:1.5;margin:0 0 22px;">Tap the button to open your ${PRODUCT_NAME}.</p>
  <p style="margin:0 0 22px;"><a href="${url}" style="display:inline-block;background:#2F4F7F;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:100px;font-weight:bold;font-size:15px;">Open my planner</a></p>
  <p style="font-size:13px;line-height:1.5;color:#5C6A85;margin:0;">The link works for 30 minutes. If you did not ask for it, you can ignore this email.</p>
</div>`;

  await getTransporter().sendMail({
    from,
    to,
    subject: `Your ${PRODUCT_NAME} sign-in link`,
    text,
    html,
  });
}
