import { env, isProd } from "../../config/env";

type Level = "debug" | "info" | "warn" | "error";

const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const minLevel: Level = isProd ? "info" : "debug";

function serialize(meta?: unknown): string {
  if (meta === undefined) return "";
  try {
    return " " + JSON.stringify(meta);
  } catch {
    return "";
  }
}

type LogListener = (line: string) => void;
const listeners = new Set<LogListener>();

function write(level: Level, message: string, meta?: unknown): void {
  if (order[level] < order[minLevel]) return;
  const line = `${new Date().toISOString()} [${level.toUpperCase()}] ${message}${serialize(meta)}`;
  for (const fn of listeners) {
    try { fn(line); } catch { /* a dead subscriber must never break logging */ }
  }
  // eslint-disable-next-line no-console
  if (level === "error") console.error(line);
  // eslint-disable-next-line no-console
  else if (level === "warn") console.warn(line);
  // eslint-disable-next-line no-console
  else console.log(line);
}

export const logger = {
  /** subscribe to every formatted log line (SSE tail); returns unsubscribe */
  subscribe(fn: LogListener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  debug: (msg: string, meta?: unknown) => write("debug", msg, meta),
  info: (msg: string, meta?: unknown) => write("info", msg, meta),
  warn: (msg: string, meta?: unknown) => write("warn", msg, meta),
  error: (msg: string, meta?: unknown) => write("error", msg, meta),
  secretWarning: () => {
    if (isProd && env.jwtSecret === "dev-only-secret-change-me") {
      logger.warn("JWT_SECRET is the default dev value. Set a strong JWT_SECRET in production.");
    }
    if (!env.githubToken) {
      logger.debug("GITHUB_TOKEN not set: using unauthenticated GitHub API (low rate limits).");
    }
    if (!env.llmApiKey) {
      logger.warn(
        "LLM_API_KEY not set: AI architect/chat will run in deterministic heuristic mode."
      );
    }
  }
};
