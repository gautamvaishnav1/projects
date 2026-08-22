import { ApiError } from "../../shared/utils/api-error";
import { env } from "../../config/env";

export interface OAuthProfile {
  email: string;
  name: string;
  avatarUrl?: string;
  providerId: string;
}

/* ------------------------------ Google ------------------------------ */

interface GoogleTokenInfo {
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
}

/**
 * Verifies a Google Identity Services ID token produced by the frontend
 * ("Sign in with Google" button) and returns the profile.
 */
export async function verifyGoogleIdToken(credential: string): Promise<OAuthProfile> {
  if (!env.googleClientId) {
    throw ApiError.internal("Google login is not configured. Set GOOGLE_CLIENT_ID in .env");
  }
  let res: Response;
  try {
    res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`, {
      signal: AbortSignal.timeout(10_000)
    });
  } catch (err) {
    throw ApiError.badGateway("Could not reach Google", err instanceof Error ? err.message : undefined);
  }
  if (!res.ok) throw ApiError.unauthorized("Invalid Google credential");

  const info = (await res.json()) as GoogleTokenInfo;
  if (info.aud !== env.googleClientId) {
    throw ApiError.unauthorized("Google credential was issued to another app");
  }
  if (!info.email || !info.sub) throw ApiError.unauthorized("Google credential has no email");
  if (info.email_verified === false || info.email_verified === "false") {
    throw ApiError.unauthorized("Google email is not verified");
  }

  return {
    email: info.email.toLowerCase(),
    name: info.name ?? "",
    avatarUrl: info.picture,
    providerId: info.sub
  };
}

/* ------------------------------ GitHub ------------------------------ */

export function githubAuthorizeUrl(state: string): string {
  if (!env.githubClientId) {
    throw ApiError.internal("GitHub login is not configured. Set GITHUB_CLIENT_ID/SECRET in .env");
  }
  const params = new URLSearchParams({
    client_id: env.githubClientId,
    redirect_uri: `${baseUrl()}/api/v1/auth/github/callback`,
    scope: "read:user user:email",
    state,
    allow_signup: "true"
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

function baseUrl(): string {
  // this backend's public URL
  return process.env.PUBLIC_BASE_URL ?? `http://localhost:${env.port}`;
}

export function googleAuthorizeUrl(state: string): string {
  if (!env.googleClientId) {
    throw ApiError.internal("Google login is not configured. Set GOOGLE_CLIENT_ID in .env");
  }
  const params = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: `${baseUrl()}/api/v1/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account"
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/** Exchanges an OAuth authorization code for a user profile. */
export async function exchangeCodeForProfile(
  provider: "google" | "github",
  code: string
): Promise<OAuthProfile> {
  if (provider === "google") return googleCodeProfile(code);
  return githubCodeProfile(code);
}

async function googleCodeProfile(code: string): Promise<OAuthProfile> {
  let tokenRes: Response;
  try {
    tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.googleClientId,
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        redirect_uri: `${baseUrl()}/api/v1/auth/google/callback`,
        grant_type: "authorization_code"
      }),
      signal: AbortSignal.timeout(15_000)
    });
  } catch (err) {
    throw ApiError.badGateway("Could not reach Google", err instanceof Error ? err.message : undefined);
  }
  if (!tokenRes.ok) throw ApiError.badGateway("Google token exchange failed");

  const tokens = (await tokenRes.json()) as { id_token?: string; access_token?: string };
  if (!tokens.id_token) throw ApiError.badGateway("Google did not return an id_token");

  // id_token came directly from the token endpoint over TLS — decode payload only.
  const payloadPart = tokens.id_token.split(".")[1];
  if (!payloadPart) throw ApiError.badGateway("Malformed id_token");
  const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8")) as {
    sub: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };
  if (!payload.email) throw ApiError.badGateway("Google account has no email");

  return {
    email: payload.email.toLowerCase(),
    name: payload.name ?? "",
    avatarUrl: payload.picture,
    providerId: payload.sub
  };
}

async function githubCodeProfile(code: string): Promise<OAuthProfile> {
  if (!env.githubClientId || !env.githubClientSecret) {
    throw ApiError.internal("GitHub login is not configured. Set GITHUB_CLIENT_ID/SECRET in .env");
  }
  let tokenRes: Response;
  try {
    tokenRes = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          client_id: env.githubClientId,
          client_secret: env.githubClientSecret,
          code
        }),
        signal: AbortSignal.timeout(15_000)
      }
    );
  } catch (err) {
    throw ApiError.badGateway("Could not reach GitHub", err instanceof Error ? err.message : undefined);
  }
  if (!tokenRes.ok) throw ApiError.badGateway("GitHub token exchange failed");
  const tokenData = (await tokenRes.json()) as { access_token?: string };
  const accessToken = tokenData.access_token;
  if (!accessToken) throw ApiError.unauthorized("Invalid GitHub code");

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "software-world-mvp"
  };

  const [userRes, emailsRes] = await Promise.all([
    fetch("https://api.github.com/user", { headers, signal: AbortSignal.timeout(15_000) }),
    fetch("https://api.github.com/user/emails", { headers, signal: AbortSignal.timeout(15_000) })
  ]);
  if (!userRes.ok) throw ApiError.badGateway("Could not load GitHub profile");
  const ghUser = (await userRes.json()) as { id: number; login: string; name?: string; avatar_url?: string };
  let email: string | undefined = ghUser.login ? undefined : undefined;
  if (emailsRes.ok) {
    const emails = (await emailsRes.json()) as Array<{ email: string; primary: boolean; verified: boolean }>;
    email = (emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified))?.email;
  }
  if (!email) throw ApiError.badGateway("GitHub account has no verified email");

  return {
    email: email.toLowerCase(),
    name: ghUser.name || ghUser.login,
    avatarUrl: ghUser.avatar_url,
    providerId: String(ghUser.id)
  };
}
