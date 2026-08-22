import { useEffect, useState, type FormEvent } from "react";
import { motion } from "motion/react";
import {
  AtSign,
  KeyRound,
  Loader2,
  MailCheck,
  User as UserIcon,
  X,
} from "lucide-react";
import {
  beginSignIn,
  beginSignUp,
  resendOtp,
  verifyOtp,
} from "../lib/auth";

type Mode = "signin" | "signup";

export function AuthModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  if (!open) return null;
  return <AuthInner onClose={onClose} onSuccess={onSuccess} />;
}

function AuthInner({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [mode, setMode] = useState<Mode>("signup");
  const [step, setStep] = useState<"form" | "otp">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [oauthBusy, setOauthBusy] = useState<"google" | "github" | null>(null);

  async function oauthClick(provider: "google" | "github") {
    if (oauthBusy) return;
    setOauthBusy(provider);
    setError(null);
    try {
      const res = await fetch(`http://localhost:8788/api/auth/oauth/${provider}/start?json=1`);
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error ?? `HTTP ${res.status}`);
      window.location.href = json.url as string;
    } catch {
      setError(
        "Can't reach the auth server on :8788. Start it with `npm start` inside projects/auth-server — or run everything at once with `npm run dev` in the projects root.",
      );
      setOauthBusy(null);
    }
  }

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const result =
        mode === "signin"
          ? await beginSignIn(email.trim(), password)
          : await beginSignUp(name, email.trim(), password);
      if (result.status === "signed-in") {
        onSuccess();
      } else {
        setStep("otp");
        setDevCode(result.devCode ?? null);
        setCooldown(30);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitOtp(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      await verifyOtp(email.trim(), otp.replace(/\s/g, ""));
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (cooldown > 0) return;
    setError(null);
    try {
      const r = await resendOtp(email.trim());
      setDevCode(r.devCode ?? null);
      setCooldown(30);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  /* ── OTP step ── */
  if (step === "otp") {
    return (
      <ModalFrame onClose={onClose}>
        <div className="flex items-start justify-between">
          <div>
            <div className="font-display text-xl font-bold tracking-wide text-white">Verify your email</div>
            <p className="mt-1 text-xs text-slate-400">
              We sent a 6-digit code to <span className="font-mono text-cyan-300">{email}</span>
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-white" aria-label="close">
            <X size={16} />
          </button>
        </div>

        {devCode && (
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 font-mono text-xs text-amber-200">
            dev mode — your code is <b className="tracking-[0.3em]">{devCode}</b> (connect SMTP to send real emails)
          </div>
        )}

        <form onSubmit={submitOtp} className="mt-5 space-y-4">
          <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 focus-within:border-cyan-400 focus-within:ring-4 focus-within:ring-cyan-400/15">
            <MailCheck size={14} className="text-slate-500" />
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
              placeholder="••••••"
              inputMode="numeric"
              autoFocus
              className="w-full bg-transparent text-center font-mono text-lg tracking-[0.55em] text-slate-100 outline-none placeholder:text-slate-700"
            />
          </label>

          {error && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 font-mono text-xs text-rose-300">{error}</div>
          )}

          <button
            type="submit"
            disabled={busy || otp.length !== 6}
            className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
              busy || otp.length !== 6
                ? "bg-slate-800 text-slate-500"
                : "bg-gradient-to-r from-[#f8fafc] via-[#cbd5e1] to-[#94a3b8] text-[#0b1222] ring-1 ring-white/60 shadow-[0_0_24px_rgba(226,232,240,.5),inset_0_1px_0_rgba(255,255,255,.9)] hover:brightness-110 active:scale-[.98]"
            }`}
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            Verify & launch
          </button>

          <button
            type="button"
            onClick={resend}
            disabled={cooldown > 0}
            className="w-full text-center font-mono text-xs text-slate-500 transition-colors hover:text-cyan-300 disabled:cursor-not-allowed disabled:hover:text-slate-500"
          >
            {cooldown > 0 ? `resend available in ${cooldown}s` : "didn't get it? resend code"}
          </button>
        </form>
      </ModalFrame>
    );
  }

  /* ── sign in / sign up step ── */
  return (
    <ModalFrame onClose={onClose}>
      <div className="flex items-start justify-between">
        <div>
          <div className="font-display text-xl font-bold tracking-wide text-white">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            {mode === "signin" ? "Sign in to enter your city." : "Free forever for public repos."}
          </p>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-white" aria-label="close">
          <X size={16} />
        </button>
      </div>

      {/* oauth buttons */}
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button onClick={() => oauthClick("google")} disabled={!!oauthBusy} className="oauth-btn">
          {oauthBusy === "google" ? <Loader2 size={14} className="animate-spin" /> : <GoogleGlyph />} Google
        </button>
        <button onClick={() => oauthClick("github")} disabled={!!oauthBusy} className="oauth-btn">
          {oauthBusy === "github" ? <Loader2 size={14} className="animate-spin" /> : <GitHubGlyph />} GitHub
        </button>
      </div>

      <div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-slate-600">
        <span className="h-px flex-1 bg-white/10" /> or with email <span className="h-px flex-1 bg-white/10" />
      </div>

      {/* mode tabs */}
      <div className="flex rounded-xl border border-white/10 bg-black/30 p-1">
        {(
          [
            ["signup", "Create account"],
            ["signin", "Sign in"],
          ] as Array<[Mode, string]>
        ).map(([m, label]) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              mode === m ? "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-400/40" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-4 space-y-3">
        {mode === "signup" && (
          <Field icon={<UserIcon size={14} />} placeholder="Your name" value={name} onChange={setName} autoComplete="name" />
        )}
        <Field icon={<AtSign size={14} />} placeholder="you@dev.com" value={email} onChange={setEmail} type="email" required autoComplete="email" />
        <Field
          icon={<KeyRound size={14} />}
          placeholder={mode === "signup" ? "Password (6+ characters)" : "Password"}
          value={password}
          onChange={setPassword}
          type="password"
          required
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
        />

        {error && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 font-mono text-xs text-rose-300">{error}</div>
        )}

        <button
          type="submit"
          disabled={busy}
          className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-all ${
            busy
              ? "bg-slate-800 text-slate-500"
              : "bg-gradient-to-r from-[#f8fafc] via-[#cbd5e1] to-[#94a3b8] text-[#0b1222] ring-1 ring-white/60 shadow-[0_0_24px_rgba(226,232,240,.5),inset_0_1px_0_rgba(255,255,255,.9)] hover:brightness-110 active:scale-[.98]"
          }`}
        >
          {busy && <Loader2 size={14} className="animate-spin" />}
          {mode === "signin" ? "Sign in & continue" : "Send verification code"}
        </button>
      </form>

      <p className="mt-4 text-center font-mono text-[10px] leading-relaxed text-slate-600">
        passwords are bcrypt-hashed · email verified by OTP · nothing tracked
      </p>
    </ModalFrame>
  );
}

/* ── shared frame + fields + brand glyphs ───────────────────────── */
function ModalFrame({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: -10 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className="cc-glass w-full max-w-md rounded-2xl p-6 shadow-2xl"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function Field({
  icon,
  placeholder,
  value,
  onChange,
  type = "text",
  required,
  autoComplete,
}: {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 focus-within:border-cyan-400 focus-within:ring-4 focus-within:ring-cyan-400/15">
      <span className="text-slate-500">{icon}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={type}
        required={required}
        autoComplete={autoComplete}
        className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-600"
      />
    </label>
  );
}

function GoogleGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C41.4 35.4 44 30.2 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}

function GitHubGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
