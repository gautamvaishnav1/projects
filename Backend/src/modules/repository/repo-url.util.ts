import { ApiError } from "../../shared/utils/api-error";

export interface ParsedRepoUrl {
  owner: string;
  repo: string;
  branch?: string; // present when URL pointed at /tree/<branch>
}

const OWNER_REPO_RE = /^[A-Za-z0-9_.-]+$/;

/**
 * Accepts:
 *   https://github.com/owner/repo
 *   https://www.github.com/owner/repo.git
 *   http://github.com/owner/repo/tree/develop/sub/dir
 *   git@github.com:owner/repo.git
 */
export function parseGitHubUrl(input: string): ParsedRepoUrl {
  if (!input || typeof input !== "string") {
    throw ApiError.badRequest("Repository URL is required");
  }
  const trimmed = input.trim();

  // scp-like form: git@github.com:owner/repo(.git)
  const scp = trimmed.match(/^git@github\.com:([^/]+)\/([^/#?]+?)(?:\.git)?\/?$/i);
  if (scp) return { owner: scp[1], repo: scp[2] };

  let url: URL;
  try {
    url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    throw ApiError.badRequest(`Invalid GitHub URL: "${trimmed}"`);
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (!/(^|\.)github\.com$/.test(host)) {
    throw ApiError.badRequest("Only github.com repositories are supported in this MVP");
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) {
    throw ApiError.badRequest("GitHub URL must include owner and repository, e.g. https://github.com/owner/repo");
  }

  let owner = parts[0];
  let repo = parts[1].replace(/\.git$/i, "");
  owner = owner.replace(/\.git$/i, "");

  if (!OWNER_REPO_RE.test(owner) || !OWNER_REPO_RE.test(repo)) {
    throw ApiError.badRequest("Invalid owner or repository name");
  }

  let branch: string | undefined;
  if (parts.length >= 4 && parts[2] === "tree") {
    branch = parts.slice(3).join("/");
  }

  return { owner, repo, branch };
}
