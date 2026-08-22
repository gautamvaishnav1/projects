import nodemailer from "nodemailer";
import { env, smtpConfigured } from "../../config/env";
import { logger } from "../../shared/utils/logger";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!smtpConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: { user: env.smtpUser, pass: env.smtpPass }
    });
  }
  return transporter;
}

export interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Sends an email via SMTP when configured; otherwise logs it so the OTP demo
 * still works with zero email setup (hackathon mode). Returns devOtp in that case.
 */
export async function sendMail(options: MailOptions): Promise<{ delivered: boolean; devOtp?: string }> {
  const transporter = getTransporter();
  if (!transporter) {
    logger.warn(`[DEV MAIL] To:${options.to} | ${options.subject} | ${options.text}`);
    // surface the 6-digit code for local testing when SMTP is not configured
    const otpMatch = options.text.match(/\b(\d{6})\b/);
    return { delivered: false, devOtp: otpMatch?.[1] };
  }
  try {
    await transporter.sendMail({ from: env.mailFrom, ...options });
    return { delivered: true };
  } catch (err) {
    logger.error("Mail send failed", {
      error: err instanceof Error ? err.message : String(err)
    });
    throw err;
  }
}

export function otpEmailTemplate(code: string, purpose: "register" | "password_reset"): MailOptionsLike {
  const subject =
    purpose === "register" ? "Verify your Software World account" : "Reset your Software World password";
  const text =
    `Your Software World verification code is: ${code}\n\n` +
    `It expires in 10 minutes. If you did not request this, ignore this email.`;
  return {
    subject,
    text,
    html:
      `<div style="font-family:sans-serif;max-width:420px;margin:auto;padding:24px;border:1px solid #eee;border-radius:12px">` +
      `<h2 style="margin:0 0 8px">${subject}</h2>` +
      `<p>Your verification code is:</p>` +
      `<p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:16px 0">${code}</p>` +
      `<p style="color:#888">Expires in 10 minutes.</p></div>`
  };
}

interface MailOptionsLike {
  subject: string;
  text: string;
  html?: string;
}
