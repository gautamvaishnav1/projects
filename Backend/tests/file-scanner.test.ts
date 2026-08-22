import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: { maxRepoFiles: 500, maxFileSizeKb: 1 }
}));

vi.mock("../src/config/env", () => ({ env: mockEnv }));

import {
  looksLikeBinary,
  looksMinifiedOrGenerated,
  scanRepository
} from "../src/modules/repository/file-scanner";

let root: string;
const rootsToClean: string[] = [];

function makeRoot(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scan-test-"));
  rootsToClean.push(dir);
  return dir;
}

function write(relPath: string, content: string): void {
  const abs = path.join(root!, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
}

beforeAll(() => {
  root = makeRoot();
});

afterAll(() => {
  for (const dir of rootsToClean) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("looksLikeBinary", () => {
  it("flags buffers containing NUL bytes", () => {
    expect(looksLikeBinary(Buffer.from([0x68, 0x00, 0x69]))).toBe(true);
  });

  it("accepts plain UTF-8 source code", () => {
    expect(looksLikeBinary(Buffer.from("const x = 1;\nconsole.log(x);\n"))).toBe(false);
  });

  it("detects a single null byte even deep in the buffer", () => {
    const buf = Buffer.alloc(100, 0x41);
    buf[99] = 0;
    expect(looksLikeBinary(buf)).toBe(true);
  });
});

describe("looksMinifiedOrGenerated", () => {
  it("flags many very long average lines", () => {
    const minified = Array.from({ length: 61 }, () => "x".repeat(300)).join("\n");
    expect(looksMinifiedOrGenerated(minified)).toBe(true);
  });

  it("flags one gigantic line when file is short-ish", () => {
    const blob = `${"a".repeat(6000)}\n${"b".repeat(10)}`;
    expect(looksMinifiedOrGenerated(blob)).toBe(true);
  });

  it("accepts normal readable source", () => {
    const normal = Array.from({ length: 30 }, (_, i) => `const value${i} = ${i};`).join("\n");
    expect(looksMinifiedOrGenerated(normal)).toBe(false);
  });

  it("accepts long files with reasonable line lengths", () => {
    const readable = Array.from({ length: 500 }, () => "const ok = computeSomethingSmall();").join("\n");
    expect(looksMinifiedOrGenerated(readable)).toBe(false);
  });
});

describe("scanRepository", () => {
  afterEach(() => {
    mockEnv.maxRepoFiles = 500;
    mockEnv.maxFileSizeKb = 1;
  });

  it("collects only allowed extensions with posix relPaths, sorted shallow-first", () => {
    const tree = makeRoot();
    fs.writeFileSync(path.join(tree, "index.ts"), "export {};");
    fs.mkdirSync(path.join(tree, "src"));
    fs.writeFileSync(path.join(tree, "src", "app.ts"), "export {};"); 
    fs.mkdirSync(path.join(tree, "src", "deep"), { recursive: true });
    fs.writeFileSync(path.join(tree, "src", "deep", "util.tsx"), "export {};");

    const result = scanRepository(tree);

    expect(result.files.map((f) => f.relPath.replace(/\\/g, "/"))).toEqual([
      "index.ts",
      "src/app.ts",
      "src/deep/util.tsx"
    ]);
    expect(result.truncated).toBe(false);
  });

  it("ignores junk/hidden directories and records which ones were hit", () => {
    write("node_modules/pkg/index.js", "x");
    write(".git/hooks/pre-commit.js", "x");
    write("dist/bundle.js", "x");
    write(".next/page.js", "x");

    const result = scanRepository(root!);
    const lower = result.ignoredDirsHit.map((d) => d.toLowerCase());
    expect(lower).toContain("node_modules");
    expect(lower).toContain(".git");
    expect(lower).toContain("dist");
    expect(result.files.every((f) => !f.relPath.includes("node_modules"))).toBe(true);
  });

  it("skips generated/minified/declaration files and counts them", () => {
    write("types/lib.d.ts", "declare const x: number;"); // "types" is NOT an ignored dir
    write("public/app.min.js", "var a=1;");
    write("proto/messages.pb.js", "module.exports={};");

    const result = scanRepository(root!);
    expect(result.files.some((f) => f.relPath.endsWith(".d.ts"))).toBe(false);
    expect(result.files.some((f) => f.relPath.includes(".min."))).toBe(false);
    expect(result.skippedGenerated).toBeGreaterThanOrEqual(3);
  });

  it("skips empty files and oversized files (counted as generated)", () => {
    write("empty-file.ts", "");
    write("huge.ts", "y".repeat(3 * 1024)); // maxFileSizeKb = 1

    const result = scanRepository(root!);
    expect(result.files.some((f) => f.relPath === "empty-file.ts")).toBe(false);
    expect(result.files.some((f) => f.relPath === "huge.ts")).toBe(false);
    expect(result.ignoredDirsHit.length + result.skippedGenerated).toBeGreaterThan(0);
  });

  it("only includes .js/.jsx/.ts/.tsx files", () => {
    write("styles.css", "body{}");
    write("README.md", "# hi");
    write("data.json", "{}");
    write("script.py", "print(1)");

    const result = scanRepository(root!);
    const exts = result.files.map((f) => path.extname(f.absPath));
    for (const ext of exts) {
      expect([".js", ".jsx", ".ts", ".tsx"]).toContain(ext);
    }
  });

  it("reports size metadata per file", () => {
    write("sized.ts", "1234567890");
    const result = scanRepository(root!);
    const found = result.files.find((f) => f.relPath === "sized.ts");
    expect(found?.size).toBe(10);
    expect(found?.absPath).toEqual(expect.any(String));
    expect(fs.existsSync(found!.absPath)).toBe(true);
  });

  it("truncates when the file budget is exhausted and marks truncated=true", () => {
    const tree = makeRoot();
    for (let i = 0; i < 5; i++) {
      fs.writeFileSync(path.join(tree, `file-${i}.ts`), "export {};");
    }

    mockEnv.maxRepoFiles = 2;
    const result = scanRepository(tree);

    expect(result.truncated).toBe(true);
    expect(result.files).toHaveLength(2);
  });

  it("returns an empty result gracefully for a nonexistent directory", () => {
    const result = scanRepository(path.join(os.tmpdir(), "definitely-missing-dir-xyz"));
    expect(result.files).toEqual([]);
    expect(result.truncated).toBe(false);
  });
});
