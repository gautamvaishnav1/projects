import mongoose from "mongoose";

export const OTP_PURPOSES = ["register", "password_reset"] as const;
export type OtpPurpose = (typeof OTP_PURPOSES)[number];

export interface OtpDocument extends mongoose.Document {
  email: string;
  codeHash: string; // sha256(email + purpose + code)
  purpose: OtpPurpose;
  expiresAt: Date;
  attempts: number;
  lastSentAt: Date;
  createdAt: Date;
}

const otpSchema = new mongoose.Schema<OtpDocument>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    codeHash: { type: String, required: true },
    purpose: { type: String, enum: OTP_PURPOSES, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    lastSentAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// one active OTP per (email, purpose); TTL cleanup for expired docs
otpSchema.index({ email: 1, purpose: 1 }, { unique: true });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const OtpModel = mongoose.model<OtpDocument>("Otp", otpSchema);
