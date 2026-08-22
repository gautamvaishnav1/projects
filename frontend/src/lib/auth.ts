import { create } from "zustand";

const AUTH_URL = "http://localhost:8788/api/auth";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  provider?: string;
}

export type BeginResult =
  | { status: "signed-in"; token: string; user: AuthUser }
  | { status: "otp-required"; email: string; devCode?: string };

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${AUTH_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json as T;
}

export async function beginSignIn(email: string, password: string): Promise<BeginResult> {
  const r = await post<{ token?: string; user?: AuthUser; otpRequired?: boolean; devCode?: string }>(
    "/login",
    { email, password },
  );
  if (r.otpRequired) return { status: "otp-required", email, devCode: r.devCode };
  return { status: "signed-in", token: r.token!, user: r.user! };
}

export async function beginSignUp(name: string, email: string, password: string): Promise<BeginResult> {
  const r = await post<{ token?: string; user?: AuthUser; otpRequired?: boolean; devCode?: string }>(
    "/register",
    { name, email, password },
  );
  if (r.otpRequired || !r.token) return { status: "otp-required", email, devCode: r.devCode };
  return { status: "signed-in", token: r.token, user: r.user! };
}

export async function verifyOtp(email: string, code: string) {
  return post<{ token: string; user: AuthUser }>("/verify-otp", { email, code });
}

export async function resendOtp(email: string): Promise<{ devCode?: string }> {
  const r = await post<{ devCode?: string }>("/resend-otp", { email });
  return { devCode: r.devCode };
}

/** Complete an OAuth redirect: reads #oauth=<token> from the URL,
 *  resolves the session via /me, persists it and cleans the URL. */
export async function completeOauthFromUrl(): Promise<{ token: string; user: AuthUser } | null> {
  const m = location.hash.match(/#oauth=([^&]+)/);
  if (!m) return null;
  const token = decodeURIComponent(m[1]);
  try {
    const res = await fetch(`${AUTH_URL}/me`, { headers: { Authorization: `Bearer ${token}` } });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    history.replaceState(null, "", location.pathname + location.search);
    applySession(token, json.user);
    return { token, user: json.user };
  } catch {
    return null;
  }
}

function persist(token: string, user: AuthUser) {
  localStorage.setItem("cc-token", token);
  localStorage.setItem("cc-user", JSON.stringify(user));
}

function applySession(token: string, user: AuthUser) {
  persist(token, user);
  useAuth.setState({ token, user });
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  signOut: () => void;
}

export const useAuth = create<AuthState>()((set) => ({
  token: localStorage.getItem("cc-token"),
  user: (() => {
    try {
      return JSON.parse(localStorage.getItem("cc-user") ?? "null") as AuthUser | null;
    } catch {
      return null;
    }
  })(),
  signOut: () => {
    localStorage.removeItem("cc-token");
    localStorage.removeItem("cc-user");
    set({ token: null, user: null });
  },
}));

export function oauthStartUrl(provider: "google" | "github") {
  return `${AUTH_URL}/oauth/${provider}/start`;
}
