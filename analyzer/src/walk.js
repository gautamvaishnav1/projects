import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const IGNORE_DIRS = new Set([
  "node_modules", ".git", "dist", "build", "coverage", ".next",
  ".cache", "out", "vendor", "__pycache__", ".vercel", ".turbo",
]);
const EXT = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"]);
const MAX_FILES = 500;

/** Walk a directory and return [{abs, rel}] of code files. */
export async function walkCode(rootDir) {
  const out = [];
  async function rec(rel) {
    if (out.length >= MAX_FILES) return;
    const abs = path.join(rootDir, rel);
    const entries = await readdir(abs, { withFileTypes: true });
    for (const e of entries) {
      if (out.length >= MAX_FILES) return;
      const relChild = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        if (IGNORE_DIRS.has(e.name) || e.name.startsWith(".")) continue;
        await rec(relChild);
      } else if (EXT.has(path.extname(e.name).toLowerCase())) {
        const st = await stat(path.join(rootDir, relChild));
        if (st.size > 512_000) continue; // skip generated monsters
        out.push({ abs: path.join(rootDir, relChild), rel: relChild });
      }
    }
  }
  await rec("");
  out.sort((a, b) => a.rel.localeCompare(b.rel));
  return out;
}
