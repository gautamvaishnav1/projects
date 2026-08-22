import fs from "node:fs";
import path from "node:path";
import { env } from "../../config/env";

export interface ScannedFile {
  absPath: string;
  relPath: string; // posix-style, repo-root relative
  size: number;
}

export interface ScanResult {
  files: ScannedFile[];
  ignoredDirsHit: string[];
  skippedGenerated: number;
  truncated: boolean;
}

const ALLOWED_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  "coverage",
  "cache",
  ".cache",
  ".next",
  ".nuxt",
  ".turbo",
  ".parcel-cache",
  "vendor",
  "tmp",
  "temp",
  "__pycache__",
  ".idea",
  ".vscode",
  ".gradle"
]);

const SKIP_FILE_PATTERNS: RegExp[] = [
  /\.min\.[cm]?js$/i, // minified
  /[.\-]min\.[jt]sx?$/i,
  /\.d\.ts$/i, // type declarations
  /\.bundle\.[cm]?js$/i,
  /\.chunk\.[cm]?js$/i,
  /\.generated\.[jt]sx?$/i,
  /[._]generated?\.[jt]sx?$/i,
  /__fixtures__|__mocks__/,
  /\.pb\.js$/i, // protobuf generated
  /_pb2?\.js$/i
];

export function looksLikeBinary(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, 8000);
  if (sample.includes(0)) return true;
  return false;
}

/** Content heuristics: minified/generated files are unreadable noise for the AI. */
export function looksMinifiedOrGenerated(code: string): boolean {
  const lines = code.split("\n");
  if (lines.length > 60) {
    const avg = code.length / lines.length;
    if (avg > 250) return true;
  }
  const longest = lines.reduce((max, l) => Math.max(max, l.length), 0);
  if (longest > 5000 && lines.length < 200) return true;
  return false;
}

function isIgnoredDir(name: string): boolean {
  if (IGNORED_DIRS.has(name.toLowerCase())) return true;
  return name.startsWith(".") && name !== ".";
}

/**
 * Walks an extracted repository directory and returns the relevant
 * .js/.jsx/.ts/.tsx files, ignoring junk directories and unusable files.
 */
export function scanRepository(rootDir: string): ScanResult {
  const files: ScannedFile[] = [];
  const ignoredDirsHit = new Set<string>();
  let skippedGenerated = 0;
  let truncated = false;
  const maxFiles = env.maxRepoFiles;
  const maxBytes = env.maxFileSizeKb * 1024;

  const walk = (dir: string): void => {
    if (truncated) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // unreadable directory -> skip silently (fault tolerance)
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (files.length >= maxFiles) {
        truncated = true;
        return;
      }
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (isIgnoredDir(entry.name)) {
          ignoredDirsHit.add(entry.name);
          continue;
        }
        walk(abs);
        continue;
      }
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (!ALLOWED_EXTENSIONS.has(ext)) continue;

      const lowerName = entry.name.toLowerCase();
      if (SKIP_FILE_PATTERNS.some((re) => re.test(lowerName))) {
        skippedGenerated++;
        continue;
      }

      let stat: fs.Stats;
      try {
        stat = fs.statSync(abs);
      } catch {
        continue;
      }
      if (stat.size === 0 || stat.size > maxBytes) {
        if (stat.size > maxBytes) skippedGenerated++;
        continue;
      }

      files.push({
        absPath: abs,
        relPath: path.relative(rootDir, abs).split(path.sep).join("/"),
        size: stat.size
      });
    }
  };

  walk(rootDir);

  // stable order: shallowest first so entry points parse before leaves
  files.sort(
    (a, b) =>
      a.relPath.split("/").length - b.relPath.split("/").length ||
      a.relPath.localeCompare(b.relPath)
  );

  return { files, ignoredDirsHit: [...ignoredDirsHit], skippedGenerated, truncated };
}
