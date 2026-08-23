import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { ApiError } from "../../shared/utils/api-error";
import { logger } from "../../shared/utils/logger";
import { env } from "../../config/env";
import { parseGitHubUrl, type ParsedRepoUrl } from "../../modules/repository/repo-url.util";

const execFileAsync = promisify(execFile);

/**
 * Windows-proof recursive delete. Plain fs.rmSync throws EPERM when files are
 * read-only (git objects) or briefly locked by Defender/indexer — which used to
 * bubble up and mark whole analyses as "failed". Retries handle transient
 * locks; clearing the read-only bit handles git's object files.
 */
function rmRf(target: string): void {
  const options = { recursive: true, force: true, maxRetries: 10, retryDelay: 200 } as const;
  try {
    fs.rmSync(target, options);
  } catch (err) {
    try {
      clearReadOnlyBits(target);
      fs.rmSync(target, options);
    } catch (retryErr) {
      logger.warn("Temp cleanup failed (non-fatal)", {
        target,
        error: retryErr instanceof Error ? retryErr.message : String(retryErr),
        original: err instanceof Error ? err.message : String(err)
      });
    }
  }
}

/** Strips FILE_ATTRIBUTE_READONLY so Windows lets us delete (git objects are ro). */
function clearReadOnlyBits(dir: string): void {
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        try {
          fs.chmodSync(full, 0o666);
        } catch {
          /* ignore */
        }
      }
    }
  }
}

export interface RepoInfo {
  owner: string;
  repo: string;
  fullName: string;
  description?: string;
  defaultBranch: string;
  primaryLanguage?: string;
  stars: number;
  isPrivate: boolean;
  htmlUrl: string;
}

const GITHUB_API = "https://api.github.com";

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/**
 * Fetch with retries — flaky networks/proxies drop single requests, so every
 * GitHub HTTP call gets N attempts with linear backoff before giving up.
 */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  attempts = 3,
  timeoutMs = 60_000
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
      // retry transient upstream failures, surface the last response otherwise
      if (res.status >= 500 && attempt < attempts) {
        lastErr = new Error(`HTTP ${res.status} from ${new URL(url).host}`);
        await sleep(700 * attempt);
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt < attempts) await sleep(700 * attempt);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

function githubHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "software-world-mvp",
    ...extra
  };
  if (env.githubToken) headers.Authorization = `Bearer ${env.githubToken}`;
  return headers;
}

async function fetchJson<T>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetchWithRetry(url, { headers: githubHeaders() }, 3, 20_000);
  } catch (err) {
    throw ApiError.badGateway(
      "GitHub API unreachable",
      err instanceof Error ? err.message : undefined
    );
  }
  if (res.status === 404) {
    throw ApiError.notFound("GitHub repository not found (or private without a token)");
  }
  if (res.status === 403 || res.status === 429) {
    throw ApiError.tooManyRequests(
      "GitHub API rate limit exceeded. Set GITHUB_TOKEN in .env to raise limits."
    );
  }
  if (!res.ok) {
    throw ApiError.badGateway(`GitHub API error (${res.status})`);
  }
  return (await res.json()) as T;
}

interface GithubRepoApiResponse {
  name: string;
  full_name: string;
  description: string | null;
  default_branch: string;
  language: string | null;
  stargazers_count: number;
  private: boolean;
  html_url: string;
}

export function parseRepoUrl(url: string): ParsedRepoUrl {
  return parseGitHubUrl(url);
}

export async function getRepoInfo(repoUrl: string): Promise<RepoInfo> {
  const { owner, repo } = parseRepoUrl(repoUrl);
  try {
    const data = await fetchJson<GithubRepoApiResponse>(`${GITHUB_API}/repos/${owner}/${repo}`);
    return {
      owner,
      repo,
      fullName: data.full_name,
      description: data.description ?? undefined,
      defaultBranch: data.default_branch ?? "main",
      primaryLanguage: data.language ?? undefined,
      stars: data.stargazers_count ?? 0,
      isPrivate: Boolean(data.private),
      htmlUrl: data.html_url
    };
  } catch (err) {
    // Network-level failures (host unreachable/blocked) fall back to git —
    // codeload + git endpoints often stay reachable when api.github.com is not.
    // Hard answers (404 repo missing, rate limit) still bubble up.
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 429) throw err;
    logger.warn("GitHub API metadata unavailable; falling back to git ls-remote", {
      repo: `${owner}/${repo}`,
      error: err instanceof Error ? err.message : String(err)
    });
    const branch = await defaultBranchViaGit(owner, repo);
    return {
      owner,
      repo,
      fullName: `${owner}/${repo}`,
      defaultBranch: branch,
      stars: 0,
      isPrivate: false,
      htmlUrl: `https://github.com/${owner}/${repo}`
    };
  }
}

/** Resolves the default branch without the REST API (works on locked-down networks). */
async function defaultBranchViaGit(owner: string, repo: string): Promise<string> {
  try {
    const cloneUrl = env.githubToken
      ? `https://x-access-token:${env.githubToken}@github.com/${owner}/${repo}.git`
      : `https://github.com/${owner}/${repo}.git`;
    // git itself may honour system proxy config where undici cannot
    const { stdout } = await execFileAsync(
      "git",
      ["ls-remote", "--symref", cloneUrl, "HEAD"],
      { timeout: 45_000, windowsHide: true, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } }
    );
    const m = stdout.match(/ref:\s*refs\/heads\/([^\s]+)\s+HEAD/);
    if (m) return m[1];
  } catch (err) {
    logger.warn("git ls-remote failed; assuming 'main'", {
      repo: `${owner}/${repo}`,
      error: redact(err instanceof Error ? err.message : String(err))
    });
  }
  return "main";
}

/**
 * Downloads the repository tarball and extracts it into a fresh temp dir.
 * Returns the directory containing the repo ROOT files.
 */
export async function downloadAndExtractRepo(
  repoUrl: string,
  analysisId: string,
  branchHint?: string
): Promise<{ dir: string; info: RepoInfo; cleanedUp: () => Promise<void> }> {
  const info = await getRepoInfo(repoUrl);
  const branch = branchHint || info.defaultBranch;

  const workRoot = path.join(os.tmpdir(), `software-world-${analysisId}`);
  const extractDir = path.join(workRoot, "repo");
  const tarPath = path.join(workRoot, "repo.tar.gz");
  fs.mkdirSync(extractDir, { recursive: true });

  // Strategy order — different hosts fail independently on flaky networks:
  //   1. codeload tarball (fast, no API rate limit)
  //   2. api.github.com tarball (redirects to codeload, but the API host
  //      sometimes stays reachable when codeload DNS/CDN hiccups)
  //   3. shallow git clone over HTTPS (different protocol entirely)
  const archiveUrls = [
    `https://codeload.github.com/${info.owner}/${info.repo}/tar.gz/refs/heads/${branch}`,
    `${GITHUB_API}/repos/${info.owner}/${info.repo}/tarball/${branch}`
  ];

  let buffer: Buffer | null = null;
  for (const url of archiveUrls) {
    if (buffer) break;
    try {
      const res = await fetchWithRetry(url, { headers: githubHeaders() }, 3, 60_000);
      if (res.ok && res.body) {
        const candidate = Buffer.from(await res.arrayBuffer());
        if (candidate.length >= 200) {
          buffer = candidate;
          break;
        }
        logger.warn(`Repository archive from ${new URL(url).host} looks empty (${candidate.length}b); trying next source`);
      } else if (res.status === 404) {
        logger.warn(`Archive 404 at ${new URL(url).host} (branch "${branch}"?); trying next source`);
      } else {
        logger.warn(`GitHub archive error ${res.status} from ${new URL(url).host}; trying next source`);
      }
    } catch (err) {
      logger.warn(`Archive download failed from ${new URL(url).host}; trying next source`, {
        repo: info.fullName,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }

  if (buffer) {
    fs.writeFileSync(tarPath, buffer);
    // System bsdtar ships with Windows 10+/macOS/Linux — zero extra deps.
    try {
      await execFileAsync("tar", ["-xzf", tarPath, "-C", extractDir, "--strip-components=1"], {
        timeout: 60_000,
        windowsHide: true
      });
    } catch (err) {
      rmRf(workRoot);
      logger.error("tar extraction failed", { message: err instanceof Error ? err.message : err });
      throw ApiError.internal("Failed to extract repository archive");
    } finally {
      try {
        fs.unlinkSync(tarPath);
      } catch {
        /* ignore */
      }
    }
  } else {
    // Fallback: shallow git clone over HTTPS (different host/stack than codeload,
    // so it survives codeload outages and some corporate-network filters).
    await cloneViaGit(info, branch, extractDir, workRoot);
  }

  const cleanedUp = async (): Promise<void> => {
    rmRf(workRoot);
  };

  logger.info("Repository downloaded", { repo: info.fullName, branch, bytes: buffer?.length ?? 0 });
  return { dir: extractDir, info, cleanedUp };
}

/** Shallow single-branch clone; never leaks the token into thrown messages. */
async function cloneViaGit(info: RepoInfo, branch: string, extractDir: string, workRoot: string): Promise<void> {
  rmRf(extractDir); // git clone needs a fresh target
  const cloneUrl = env.githubToken
    ? `https://x-access-token:${env.githubToken}@github.com/${info.owner}/${info.repo}.git`
    : `https://github.com/${info.owner}/${info.repo}.git`;

  try {
    await execFileAsync(
      "git",
      ["clone", "--depth", "1", "--single-branch", "--branch", branch, cloneUrl, extractDir],
      { timeout: 60_000, windowsHide: true, env: { ...process.env, GIT_TERMINAL_PROMPT: "0" } }
    );
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    logger.error("git clone fallback failed", { repo: info.fullName, error: redact(raw) });
    rmRf(workRoot);
    if (/not found|Remote branch .* not found/i.test(raw)) {
      throw ApiError.notFound(`Branch "${branch}" not found on ${info.fullName}`);
    }
    throw ApiError.badGateway(
      `Failed to download repository archive for ${info.fullName}@${branch} (archive + git clone both failed)`
    );
  }
}

function redact(input: string): string {
  return env.githubToken ? input.split(env.githubToken).join("***") : input;
}
