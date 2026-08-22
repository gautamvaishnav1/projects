import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function list(value: string | undefined, fallback: string[]): string[] {
  if (!value || !value.trim()) return fallback;
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: num(process.env.PORT, 5000),
  mongoUri: process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017/software-world",
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  corsOrigins: list(process.env.CORS_ORIGINS, ["*"]),
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  githubToken: process.env.GITHUB_TOKEN ?? "",
  llmBaseUrl: (process.env.LLM_BASE_URL ?? "https://api.openai.com/v1").replace(/\/+$/, ""),
  llmApiKey: process.env.LLM_API_KEY ?? "",
  llmModel: process.env.LLM_MODEL ?? "gpt-5.6",
  llmTimeoutMs: num(process.env.LLM_TIMEOUT_MS, 60_000),
  maxRepoFiles: num(process.env.MAX_REPO_FILES, 1500),
  maxFileSizeKb: num(process.env.MAX_FILE_SIZE_KB, 256),
  // ---- OAuth ----
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  githubClientId: process.env.GITHUB_CLIENT_ID ?? "",
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
  // ---- SMTP for OTP emails (falls back to console logging when unset) ----
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: num(process.env.SMTP_PORT, 587),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  mailFrom: process.env.MAIL_FROM ?? "Software World <no-reply@software-world.local>"
} as const;

export const isProd = env.nodeEnv === "production";
export const isTest = env.nodeEnv === "test";
export const smtpConfigured = (): boolean => Boolean(env.smtpHost && env.smtpUser && env.smtpPass);
