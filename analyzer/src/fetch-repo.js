import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { createWriteStream } from "node:fs";
import * as tar from "tar";

/**
 * Resolves the analyze target into a local directory.
 * Accepts:
 *   - https://github.com/owner/repo[/tree/branch]
 *   - owner/repo
 *   - { localPath } (absolute or relative to cwd) for offline demos
 */
export async function acquireRepo({ repoUrl, localPath }) {
  if (localPath) {
    const abs = path.resolve(localPath);
    return { dir: abs, cleanup: async () => {}, name: path.basename(abs), source: "local" };
  }
  const { owner, repo, branch } = parseGitHub(repoUrl);
  const dir = await mkdtemp(path.join(tmpdir(), "codecity-"));
  const url = `https://codeload.github.com/${owner}/${repo}/tar.gz/refs/heads/${branch}`;
  let res;
  try {
    res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(60_000) });
  } catch (e) {
    await rm(dir, { recursive: true, force: true });
    throw new Error(`network error fetching ${url}: ${e.message}`);
  }
  if (!res.ok) {
    await rm(dir, { recursive: true, force: true });
    throw new Error(`GitHub returned ${res.status} for ${owner}/${repo}@${branch}`);
  }
  const tgz = path.join(dir, "repo.tgz");
  await pipeline(Readable.fromWeb(res.body), createWriteStream(tgz));
  await tar.x({ cwd: dir, file: tgz, strip: 1, newer: false });
  await rm(tgz, { force: true });
  return { dir, cleanup: () => rm(dir, { recursive: true, force: true }), name: repo, source: `github:${owner}/${repo}@${branch}` };
}

export function parseGitHub(input) {
  let s = String(input || "").trim();
  if (!s) throw new Error("repoUrl is required");
  s = s.replace(/\.git$/, "").replace(/\/$/, "");
  // full URL forms
  const m = s.match(/github\.com[/:]([^/]+)\/([^/#?]+)(?:\/tree\/([^/#?]+))?/i);
  if (m) return { owner: m[1], repo: m[2], branch: m[3] || "main" };
  // owner/repo shorthand
  const short = s.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (short) return { owner: short[1], repo: short[2], branch: "main" };
  throw new Error(`could not parse GitHub reference: ${input}`);
}

/** branch fallback: try main then master */
export async function acquireRepoWithFallback(opts) {
  try {
    return await acquireRepo(opts);
  } catch (e) {
    if (/404/.test(e.message) && opts.repoUrl) {
      const { owner, repo } = parseGitHub(opts.repoUrl);
      return acquireRepo({ ...opts, repoUrl: `https://github.com/${owner}/${repo}/tree/master` });
    }
    throw e;
  }
}

export async function ensureDir(p) {
  await mkdir(p, { recursive: true });
}
