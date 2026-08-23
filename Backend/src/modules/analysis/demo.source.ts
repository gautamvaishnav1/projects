import path from "node:path";
import fs from "node:fs/promises";
import { ApiError } from "../../shared/utils/api-error";
import type { RepoInfo } from "../../infrastructure/github/github.service";

/**
 * Bundled demo project source.
 *
 * Projects created with `source: "demo"` skip the GitHub download entirely —
 * the pipeline scans the vendored `demo/` directory (Beach Resort, a full-stack
 * MERN hotel-booking system) straight from disk. Same scanner/parser/AI path,
 * zero network, works offline.
 */

const DEMO_DIR = process.env.DEMO_PROJECT_DIR
  ? path.resolve(process.env.DEMO_PROJECT_DIR)
  // Backend/src/modules/analysis -> four levels up = repo root -> demo/
  : path.resolve(__dirname, "..", "..", "..", "..", "demo");

export const DEMO_REPO_URL = "demo://beach-resort";

export async function loadDemoProject(): Promise<{
  dir: string;
  info: RepoInfo;
  cleanedUp: () => Promise<void>;
}> {
  try {
    await fs.access(DEMO_DIR);
  } catch {
    throw ApiError.notFound(
      "Demo project directory not found on the server (expected ./demo at the repo root)"
    );
  }
  return {
    dir: DEMO_DIR,
    info: {
      owner: "codecity",
      repo: "beach-resort-demo",
      fullName: "codecity/beach-resort-demo",
      description: "Beach Resort — full-stack MERN hotel booking system (bundled demo)",
      defaultBranch: "main",
      primaryLanguage: "JavaScript",
      stars: 0,
      isPrivate: false,
      htmlUrl: DEMO_REPO_URL
    },
    // never delete the bundled demo dir after analysis
    cleanedUp: async () => undefined
  };
}
