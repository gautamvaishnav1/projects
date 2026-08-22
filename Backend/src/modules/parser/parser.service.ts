import fs from "node:fs";
import { logger } from "../../shared/utils/logger";
import { scanRepository, looksLikeBinary, looksMinifiedOrGenerated, type ScanResult } from "../repository/file-scanner";
import { parseSource } from "./babel.parser";
import { analyzeAST } from "./ast-analyzer";
import { extractWithFallback } from "./fallback-extractor";
import { buildProjectMetadata, type RepoInfoLite } from "./metadata.builder";
import type { FileFacts, ProjectMetadata } from "./parser.types";

export interface ParseOutcome {
  metadata: ProjectMetadata;
  scan: ScanResult;
  failures: Array<{ file: string; error: string; strategy: "fallback" | "skipped" }>;
}

function readPackageJson(rootDir: string): {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
} {
  const empty = { dependencies: {}, devDependencies: {} };
  try {
    const raw = fs.readFileSync(`${rootDir}/package.json`, "utf8");
    const parsed = JSON.parse(raw);
    return {
      dependencies: typeof parsed.dependencies === "object" && parsed.dependencies ? parsed.dependencies : {},
      devDependencies:
        typeof parsed.devDependencies === "object" && parsed.devDependencies ? parsed.devDependencies : {}
    };
  } catch {
    return empty;
  }
}

/**
 * Fault-tolerant per-file pipeline:
 *   read -> Babel parse (source->AST only) -> AST analysis (AST->our JSON)
 * A failure at any step degrades to the regex fallback extractor for THAT
 * file only and never aborts the whole repository.
 */
export function parseRepository(
  rootDir: string,
  repo: RepoInfoLite,
  onProgress?: (current: number, total: number) => void
): ParseOutcome {
  const startedAt = Date.now();
  const scan = scanRepository(rootDir);
  const facts: FileFacts[] = [];
  const failures: ParseOutcome["failures"] = [];
  let lastProgressEmit = 0;

  for (let i = 0; i < scan.files.length; i++) {
    const candidate = scan.files[i];
    let code: string;
    try {
      const buffer = fs.readFileSync(candidate.absPath);
      if (looksLikeBinary(buffer)) {
        failures.push({ file: candidate.relPath, error: "binary file skipped", strategy: "skipped" });
        continue;
      }
      code = buffer.toString("utf8");
      if (looksMinifiedOrGenerated(code)) {
        scan.skippedGenerated++;
        failures.push({
          file: candidate.relPath,
          error: "minified/generated file skipped",
          strategy: "skipped"
        });
        continue;
      }
    } catch (err) {
      failures.push({
        file: candidate.relPath,
        error: err instanceof Error ? err.message : "read failed",
        strategy: "skipped"
      });
      continue;
    }

    try {
      // Step 1: Babel converts source -> AST (its ONLY job).
      const { ast } = parseSource(code, candidate.absPath);
      // Step 2: OUR analyzer traverses the AST -> compact JSON.
      const startedFile = Date.now();
      const fact = analyzeAST(ast, candidate.relPath, code);
      fact.parse.durationMs = Date.now() - startedFile;
      facts.push(fact);
    } catch (parseError) {
      // Step 3: lightweight fallback so one bad file never stops the run.
      const fact = extractWithFallback(
        candidate.relPath,
        code,
        parseError instanceof Error ? parseError.message : String(parseError)
      );
      facts.push(fact);
      if (!fact.parse.ok) {
        failures.push({
          file: candidate.relPath,
          error: fact.parse.error ?? "babel parse failed",
          strategy: "fallback"
        });
      }
    }

    if (onProgress && i - lastProgressEmit >= Math.max(1, Math.floor(scan.files.length / 20))) {
      lastProgressEmit = i;
      onProgress(i + 1, scan.files.length);
    }
  }

  const deps = readPackageJson(rootDir);
  const metadata = buildProjectMetadata(repo, facts, deps, Date.now() - startedAt);

  logger.info("Repository parsed", {
    repo: repo.repo,
    files: scan.files.length,
    babel: stats(metadata).filesParsedBabel,
    fallback: stats(metadata).filesFallback,
    routes: metadata.routes.length,
    models: metadata.models.length,
    truncated: scan.truncated
  });

  return { metadata, scan, failures };
}

// tiny helper to avoid recomputing filters twice in log line above
function stats(m: ProjectMetadata) {
  return {
    filesParsedBabel: m.stats.filesParsedBabel,
    filesFallback: m.stats.filesFallback
  };
}
