import crypto from "node:crypto";
import { OtpModel, type OtpPurpose } from "./otp.model";
import { ApiError } from "../../shared/utils/api-error";
import { sendMail, otpEmailTemplate } from "../../infrastructure/mailer/mailer.service";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute between sends

function hashCode(email: string, purpose: OtpPurpose, code: string): string {
  return crypto.createHash("sha256").update(`${email}:${purpose}:${code}`).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export interface SendOtpResult {
  delivered: boolean; // false => SMTP not configured, code returned for dev testing
  devCode?: string;
}

/** Creates a fresh OTP (invalidating any previous one) and emails it. */
export async function issueOtp(email: string, purpose: OtpPurpose): Promise<SendOtpResult> {
  const existing = await OtpModel.findOne({ email, purpose });
  if (existing && Date.now() - existing.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
    throw ApiError.tooManyRequests(
      `Please wait ${Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - existing.lastSentAt.getTime())) / 1000)}s before requesting another code`
    );
  }

  const code = crypto.randomInt(100000, 1000000).toString(); // 6 digits
  await OtpModel.findOneAndUpdate(
    { email, purpose },
    {
      email,
      purpose,
      codeHash: hashCode(email, purpose, code),
      attempts: 0,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      lastSentAt: new Date()
    },
    { upsert: true, new: true }
  );

  const template = otpEmailTemplate(code, purpose);
  try {
    const mail = await sendMail({ to: email, ...template });
    return mail.delivered ? { delivered: true } : { delivered: false, devCode: mail.devOtp };
  } catch {
    // SMTP configured but broken — still let the user retry later
    throw ApiError.internal("Could not send the verification email. Try again shortly.");
  }
}

/**
 * Validates an OTP. Throws 400/410/429 on wrong/expired/exhausted codes.
 * Consumes the OTP on success.
 */
export async function consumeOtp(email: string, purpose: OtpPurpose, code: string): Promise<void> {
  const record = await OtpModel.findOne({ email, purpose });
  if (!record) {
    throw ApiError.badRequest("No active code found. Request a new one.");
  }
  if (record.expiresAt.getTime() < Date.now()) {
    await OtpModel.deleteOne({ _id: record._id });
    throw ApiError.badRequest("This code has expired. Request a new one.");
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    await OtpModel.deleteOne({ _id: record._id });
    throw ApiError.badRequest("Too many wrong attempts. Request a new code.");
  }

  if (!safeEqualHex(hashCode(email, purpose, code), record.codeHash)) {
    record.attempts += 1;
    await record.save();
    const left = MAX_ATTEMPTS - record.attempts;
    throw ApiError.badRequest(
      left > 0 ? `Wrong code. ${left} attempt${left === 1 ? "" : "s"} left.` : "Wrong code."
    );
  }

  await OtpModel.deleteOne({ _id: record._id });
}

export async function clearOtp(email: string, purpose: OtpPurpose): Promise<void> {
  await OtpModel.deleteMany({ email, purpose });
}
