import axios, { type AxiosResponse } from "axios";

/* ── Shared axios client ──────────────────────────────────────────
 * One instance for every REST call. Base URL comes from .env
 * (VITE_API_BASE_URL) so the backend location is configurable
 * without touching code. The Bearer token is attached automatically.
 */

export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

/** Origin root of the API host — e.g. http://localhost:5000 */
export const ROOT_BASE = API_BASE.replace(/\/api\/v1\/?$/, "");

export interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
  details?: Record<string, unknown>;
}

export const http = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  // 202 Accepted is used by POST /projects/:id/analyze — axios allows all 2xx
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("cc-token");
  // never clobber an explicitly passed Authorization header
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Extracts the backend's human-readable message from any failure. */
export function apiErrorMessage(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as ApiEnvelope<unknown> | undefined;
    return data?.message ?? e.message;
  }
  return e instanceof Error ? e.message : String(e);
}

/** Unwraps `{ success, data }` envelopes into the inner payload. */
export async function unwrap<T>(p: Promise<AxiosResponse<ApiEnvelope<T>>>): Promise<T> {
  const res = await p;
  return res.data.data as T;
}
