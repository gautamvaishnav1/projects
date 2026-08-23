/* ── live log feed: frontend actions + backend HTTP lines via SSE ──
   Own module so HUD.tsx stays component-only (fast-refresh friendly). */
export interface LogLine { t: number; src: "fe" | "be"; level: string; msg: string }
export const LOG_BUFFER: LogLine[] = [];

export function pushLog(src: "fe" | "be", msg: string, level: "info" | "warn" | "error" | "ok" = "info") {
  LOG_BUFFER.push({ t: Date.now(), src, level, msg });
  if (LOG_BUFFER.length > 200) LOG_BUFFER.shift();
  window.dispatchEvent(new CustomEvent("cc-log"));
}
