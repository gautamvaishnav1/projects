import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash, randomUUID, randomInt } from "node:crypto";
import path from "node:path";

const PORT = process.env.PORT || 8788;
const SECRET = process.env.JWT_SECRET || "codecity-dev-secret-change-me";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const DATA_DIR = path.resolve("data");
const DATA_FILE = path.join(DATA_DIR, "users.json");

const GOOGLE = { id: process.env.GOOGLE_CLIENT_ID, secret: process.env.GOOGLE_CLIENT_SECRET };
const GITHUB = { id: process.env.GITHUB_CLIENT_ID, secret: process.env.GITHUB_CLIENT_SECRET };
const SMTP = {
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASS,
  from: process.env.SMTP_FROM || "CodeCity AI <no-reply@codecity.dev>",
};

/* ── user store (file-backed) ─────────────────────────────────── */
async function loadUsers() {
  try {
    return JSON.parse(await readFile(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}
async function saveUsers(users) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(users, null, 2));
}

/* ── helpers ──────────────────────────────────────────────────── */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const sha = (s) => createHash("sha256").update(String(s) + SECRET).digest("hex");
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, provider: u.provider ?? "local" });
const issueToken = (u) => jwt.sign({ sub: u.id, email: u.email, name: u.name }, SECRET, { expiresIn: "7d" });
const genOtp = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

/** Create + persist a fresh OTP for the user. Emails it when SMTP is
 *  configured; otherwise returns a devCode so demos work offline. */
async function issueOtp(user) {
  const code = genOtp();
  user.otp = { hash: sha(code), expires: Date.now() + 10 * 60_000, issuedAt: Date.now() };
  const users = await loadUsers();
  const i = users.findIndex((u) => u.id === user.id);
  if (i >= 0) users[i] = user;
  await saveUsers(users);

  if (SMTP.host && SMTP.user && SMTP.pass) {
    try {
      const transport = nodemailer.createTransport({
        host: SMTP.host,
        port: SMTP.port,
        secure: SMTP.port === 465,
        auth: { user: SMTP.user, pass: SMTP.pass },
      });
      await transport.sendMail({
        from: SMTP.from,
        to: user.email,
        subject: "Your CodeCity verification code",
        text: `Your CodeCity verification code is ${code}. It expires in 10 minutes.`,
      });
      return { sent: true };
    } catch (e) {
      console.error("[otp] mail send failed:", e.message);
    }
  }
  return { sent: false, devCode: code };
}

async function findOrFetchProfile(profile) {
  const users = await loadUsers();
  let user = users.find((u) => u.email === profile.email);
  if (!user) {
    user = {
      id: randomUUID(),
      name: profile.name,
      email: profile.email,
      provider: profile.provider,
      passwordHash: await bcrypt.hash(randomUUID(), 10),
      verified: true,
      createdAt: Date.now(),
    };
    users.push(user);
    await saveUsers(users);
  }
  return user;
}

/* ── app ──────────────────────────────────────────────────────── */
const app = express();
app.use(cors());
app.use(express.json({ limit: "8kb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "codecity-auth" }));

/* ── local signup → OTP required ──────────────────────────────── */
app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body ?? {};
  if (!EMAIL_RE.test(String(email ?? ""))) return res.status(400).json({ error: "a valid email is required" });
  if (!password || String(password).length < 6) return res.status(400).json({ error: "password must be at least 6 characters" });

  const users = await loadUsers();
  const mail = String(email).toLowerCase();
  const existing = users.find((u) => u.email === mail);
  if (existing?.verified) return res.status(409).json({ error: "account already exists — sign in instead" });

  let user;
  if (existing) {
    existing.passwordHash = await bcrypt.hash(String(password), 10);
    existing.name = String(name ?? "").trim() || mail.split("@")[0];
    user = existing;
  } else {
    user = {
      id: randomUUID(),
      name: String(name ?? "").trim() || mail.split("@")[0],
      email: mail,
      provider: "local",
      passwordHash: await bcrypt.hash(String(password), 10),
      verified: false,
      createdAt: Date.now(),
    };
    users.push(user);
    await saveUsers(users);
  }

  const otp = await issueOtp(user);
  res.json({ otpRequired: true, email: user.email, ...(otp.sent ? {} : { devCode: otp.devCode }) });
});

/* ── login (unverified accounts get pushed to OTP) ────────────── */
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: "email and password are required" });
  const users = await loadUsers();
  const user = users.find((u) => u.email === String(email).toLowerCase());
  if (!user || !(await bcrypt.compare(String(password), user.passwordHash))) {
    return res.status(401).json({ error: "wrong email or password" });
  }
  if (!user.verified) {
    const otp = await issueOtp(user);
    return res.json({ otpRequired: true, email: user.email, ...(otp.sent ? {} : { devCode: otp.devCode }) });
  }
  res.json({ token: issueToken(user), user: publicUser(user) });
});

/* ── OTP verify / resend ──────────────────────────────────────── */
app.post("/api/auth/verify-otp", async (req, res) => {
  const { email, code } = req.body ?? {};
  const users = await loadUsers();
  const user = users.find((u) => u.email === String(email ?? "").toLowerCase());
  if (!user) return res.status(404).json({ error: "account not found" });
  if (user.verified) return res.json({ token: issueToken(user), user: publicUser(user) });
  if (!user.otp || user.otp.expires < Date.now()) return res.status(400).json({ error: "code expired — request a new one" });
  if (user.otp.hash !== sha(code)) return res.status(400).json({ error: "incorrect code" });

  user.verified = true;
  delete user.otp;
  await saveUsers(users);
  res.json({ token: issueToken(user), user: publicUser(user) });
});

app.post("/api/auth/resend-otp", async (req, res) => {
  const { email } = req.body ?? {};
  const users = await loadUsers();
  const user = users.find((u) => u.email === String(email ?? "").toLowerCase());
  if (!user || user.verified) return res.status(404).json({ error: "account not found or already verified" });
  if (user.otp && Date.now() - user.otp.issuedAt < 20_000) {
    return res.status(429).json({ error: "please wait a moment before requesting again" });
  }
  const otp = await issueOtp(user);
  res.json({ otpRequired: true, email: user.email, ...(otp.sent ? {} : { devCode: otp.devCode }) });
});

/* ── me ───────────────────────────────────────────────────────── */
app.get("/api/auth/me", async (req, res) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  try {
    const payload = jwt.verify(token, SECRET);
    const users = await loadUsers();
    const user = users.find((u) => u.id === payload.sub);
    if (!user) return res.status(404).json({ error: "user not found" });
    res.json({ user: publicUser(user) });
  } catch {
    res.status(401).json({ error: "invalid or expired token" });
  }
});

/* ── OAuth (Google + GitHub) ──────────────────────────────────── */
const oauthStates = new Map(); // state -> { exp }

function oauthConfig(provider) {
  if (provider === "google") return GOOGLE.id && GOOGLE.secret ? GOOGLE : null;
  if (provider === "github") return GITHUB.id && GITHUB.secret ? GITHUB : null;
  return null;
}

app.get("/api/auth/oauth/:provider/start", (req, res) => {
  const provider = req.params.provider;
  const cfg = oauthConfig(provider);
  if (!cfg) {
    return res.status(501).json({ error: `${provider} OAuth is not configured on this server — add its client id/secret to auth-server/.env` });
  }
  const state = randomUUID();
  oauthStates.set(state, { provider, exp: Date.now() + 10 * 60_000 });
  const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/oauth/${provider}/callback`;

  let url;
  if (provider === "google") {
    url =
      `https://accounts.google.com/o/oauth2/v2/auth?client_id=${cfg.id}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code` +
      `&scope=${encodeURIComponent("openid email profile")}&state=${state}&prompt=select_account`;
  } else {
    url =
      `https://github.com/login/oauth/authorize?client_id=${cfg.id}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent("read:user user:email")}&state=${state}`;
  }
  // modal preflight asks for JSON so it can show config errors inline
  if (req.query.json === "1") return res.json({ url });
  res.redirect(url);
});

async function finishOAuth(req, res, provider, code, state) {
  const entry = oauthStates.get(state);
  oauthStates.delete(state);
  if (!entry || entry.provider !== provider || entry.exp < Date.now()) {
    return res.redirect(`${FRONTEND_URL}/#auth-error=invalid-state`);
  }
  const cfg = oauthConfig(provider);
  if (!cfg) return res.status(501).json({ error: "not configured" });
  const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/oauth/${provider}/callback`;

  try {
    let accessToken;
    let profile;
    if (provider === "google") {
      const tokRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: cfg.id,
          client_secret: cfg.secret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      }).then((r) => r.json());
      accessToken = tokRes.access_token;
      const info = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((r) => r.json());
      if (!info.email) throw new Error("google returned no email");
      profile = { email: info.email.toLowerCase(), name: info.name || info.email.split("@")[0], provider };
    } else {
      const tokRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ code, client_id: cfg.id, client_secret: cfg.secret, redirect_uri: redirectUri }),
      }).then((r) => r.json());
      accessToken = tokRes.access_token;
      const ghUser = await fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" },
      }).then((r) => r.json());
      let email = ghUser.email;
      if (!email) {
        const emails = await fetch("https://api.github.com/user/emails", {
          headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" },
        }).then((r) => r.json());
        email = Array.isArray(emails) ? emails.find((e) => e.primary)?.email ?? emails[0]?.email : null;
      }
      if (!email) throw new Error("github account has no accessible email");
      profile = { email: String(email).toLowerCase(), name: ghUser.name || ghUser.login, provider };
    }

    const user = await findOrFetchProfile(profile);
    res.redirect(`${FRONTEND_URL}/#oauth=${issueToken(user)}`);
  } catch (e) {
    console.error(`[oauth:${provider}]`, e.message);
    res.redirect(`${FRONTEND_URL}/#auth-error=${encodeURIComponent("oauth sign-in failed")}`);
  }
}

app.get("/api/auth/oauth/google/callback", (req, res) =>
  finishOAuth(req, res, "google", req.query.code, req.query.state),
);
app.get("/api/auth/oauth/github/callback", (req, res) =>
  finishOAuth(req, res, "github", req.query.code, req.query.state),
);

app.listen(PORT, () => console.log(`🔐 codecity-auth listening on http://localhost:${PORT}`));
