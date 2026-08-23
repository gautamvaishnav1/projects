import { create } from "zustand";
import { isAxiosError } from "axios";
import { http, API_BASE, apiErrorMessage, type ApiEnvelope } from "./http";

/** Sole backend dependency — everything goes through the Express API. */
export { API_BASE };
const AUTH_URL = "/auth";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  provider?: string;
}

export type BeginResult =
  | { status: "signed-in"; token: string; user: AuthUser }
  | { status: "otp-required"; email: string; devCode?: string };

type ApiErrorWithDetails = Error & {
  status?: number;
  details?: { needsVerification?: boolean; email?: string; devCode?: string };
};

async function request<T>(path: string, body?: unknown): Promise<ApiEnvelope<T> & Record<string, unknown>> {
  try {
    const res = await http.post<ApiEnvelope<T> & Record<string, unknown>>(`${AUTH_URL}${path}`, body);
    return res.data;
  } catch (e) {
    if (isAxiosError(e)) {
      const data = e.response?.data as ApiEnvelope<T> | undefined;
      const err = new Error(data?.message ?? e.message) as ApiErrorWithDetails;
      err.status = e.response?.status;
      err.details = data?.details as ApiErrorWithDetails["details"];
      throw err;
    }
    throw new Error(apiErrorMessage(e));
  }
}

export async function beginSignIn(email: string, password: string): Promise<BeginResult> {
  try {
    const r = await request<{ user: AuthUser; token: string }>("/login", { email, password });
    applySession(r.data!.token, r.data!.user);
    return { status: "signed-in", token: r.data!.token, user: r.data!.user };
  } catch (e) {
    // unverified local accounts → backend replies 403 { details: { needsVerification, email, devCode? } }
    const err = e as ApiErrorWithDetails;
    if (err.status === 403 && err.details?.needsVerification) {
      return { status: "otp-required", email: err.details.email ?? email, devCode: err.details.devCode };
    }
    throw e;
  }
}

/** Register always starts the OTP flow — the token arrives after /verify-otp. */
export async function beginSignUp(name: string, email: string, password: string): Promise<BeginResult> {
  await request("/register", { name, email, password });
  return { status: "otp-required", email };
}

export async function verifyOtp(email: string, code: string) {
  const r = await request<{ user: AuthUser; token: string }>("/verify-otp", { email, code });
  applySession(r.data!.token, r.data!.user);
  return r.data!;
}

export async function resendOtp(email: string): Promise<{ devCode?: string }> {
  // devCode rides at the envelope top level (dev mode only), not inside data
  const r = await request<{ message: string }>("/resend-otp", { email });
  return { devCode: typeof r.devCode === "string" ? r.devCode : undefined };
}

/** Complete an OAuth redirect: accepts the legacy `#oauth=<token>` hash or the
 *  backend's `/auth/success?token=&name=&email=` query redirect, resolves the
 *  session via /me, persists it and cleans the URL. */
export async function completeOauthFromUrl(): Promise<{ token: string; user: AuthUser } | null> {
  let token: string | null = null;
  const m = location.hash.match(/#oauth=([^&]+)/);
  if (m) {
    token = decodeURIComponent(m[1]);
  } else if (location.pathname.endsWith("/auth/success")) {
    const params = new URLSearchParams(location.search);
    token = params.get("token");
  }
  if (!token) return null;
  try {
    const res = await http.get<ApiEnvelope<{ user: AuthUser }>>(`${AUTH_URL}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.data.data?.user) throw new Error(res.data.message ?? "no user in response");
    history.replaceState(null, "", location.origin + "/");
    applySession(token, res.data.data.user);
    return { token, user: res.data.data.user };
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
    void import("./socket").then((m) => m.disconnectSocket());
  },
}));

/** Backend performs the full redirect dance itself — just navigate there. */
export function oauthStartUrl(provider: "google" | "github") {
  return `${API_BASE}${AUTH_URL}/${provider}`;
}
