import { describe, expect, it } from "vitest";
import { buildProjectMetadata, type RepoInfoLite } from "../src/modules/parser/metadata.builder";
import type { FileFacts } from "../src/modules/parser/parser.types";

function fact(over: Partial<FileFacts> = {}): FileFacts {
  return {
    path: "src/a.ts",
    lines: 10,
    bytes: 100,
    role: "other",
    imports: [],
    exports: [],
    functions: [],
    classes: [],
    routes: [],
    models: [],
    controllers: [],
    services: [],
    authEvidence: [],
    parse: { ok: true, strategy: "babel", durationMs: 1 },
    ...over
  };
}

const repo: RepoInfoLite = {
  name: "demo-api",
  repo: "acme/demo-api",
  branch: "main",
  description: "demo",
  primaryLanguage: "TypeScript"
};

describe("buildProjectMetadata", () => {
  it("merges facts across files and carries project info through", () => {
    const meta = buildProjectMetadata(
      repo,
      [
        fact({ path: "a.ts", lines: 5 }),
        fact({ path: "b.ts", lines: 7 })
      ],
      { dependencies: { express: "^4" }, devDependencies: {} },
      123
    );

    expect(meta.project).toEqual({
      name: "demo-api",
      repo: "acme/demo-api",
      branch: "main",
      description: "demo",
      primaryLanguage: "TypeScript"
    });
    expect(meta.files).toHaveLength(2);
    expect(meta.files[0]).toEqual({ path: "a.ts", bytes: 100, lines: 5, role: "other" });
    expect(meta.stats.durationMs).toBe(123);
    expect(new Date(meta.generatedAt).toString()).not.toBe("Invalid Date");
  });

  it("computes parse-strategy stats (babel / fallback / failed)", () => {
    const meta = buildProjectMetadata(
      repo,
      [
        fact(),
        fact({ path: "b.ts", parse: { ok: true, strategy: "fallback", durationMs: 2 } }),
        fact({ path: "c.ts", parse: { ok: false, strategy: "fallback", durationMs: 3 } })
      ],
      { dependencies: {}, devDependencies: {} },
      9
    );

    expect(meta.stats).toMatchObject({
      filesConsidered: 3,
      filesParsedBabel: 1,
      filesFallback: 2,
      filesFailed: 1
    });
  });

  it("collects functions/classes/routes/models/controllers/services across files", () => {
    const meta = buildProjectMetadata(
      repo,
      [
        fact({
          functions: [
            { name: "f1", file: "a.ts", line: 1, params: [], isAsync: false, exported: false, kind: "function" }
          ],
          classes: [{ name: "C1", file: "a.ts", line: 2, extends: null, methods: ["m"], exported: true }],
          routes: [{ method: "GET", path: "/x", handler: "f1", file: "a.ts" }],
          models: [{ name: "User", file: "m.ts", collection: null, fields: ["email"] }],
          controllers: [{ name: "f1", file: "a.ts", kind: "controller", type: "function" }],
          services: [{ name: "S", file: "s.ts", kind: "service", type: "class" }]
        }),
        fact({
          path: "b.ts",
          functions: [
            { name: "f2", file: "b.ts", line: 5, params: ["x"], isAsync: true, exported: true, kind: "arrow" }
          ]
        })
      ],
      { dependencies: {}, devDependencies: {} },
      1
    );

    expect(meta.functions.map((f) => f.name)).toEqual(["f1", "f2"]);
    expect(meta.classes).toHaveLength(1);
    expect(meta.routes).toHaveLength(1);
    expect(meta.models).toHaveLength(1);
    expect(meta.controllers).toHaveLength(1);
    expect(meta.services).toHaveLength(1);
    expect(meta.stats.totalFunctions).toBe(2);
    expect(meta.stats.totalClasses).toBe(1);
    expect(meta.stats.totalRoutes).toBe(1);
    expect(meta.stats.totalModels).toBe(1);
  });

  it("caps collections to protect the AI context window", () => {
    const manyFunctions = Array.from({ length: 700 }, (_, i) => ({
      name: `fn${i}`,
      file: "big.ts",
      line: i,
      params: [],
      isAsync: false,
      exported: false,
      kind: "function" as const
    }));
    const manyModels = Array.from({ length: 150 }, (_, i) => ({
      name: `M${i}`,
      file: "big.ts",
      collection: null,
      fields: []
    }));

    const meta = buildProjectMetadata(repo, [fact({ functions: manyFunctions, models: manyModels })], {
      dependencies: {},
      devDependencies: {}
    }, 1);

    expect(meta.functions).toHaveLength(600); // cap.functions
    expect(meta.models).toHaveLength(120); // cap.models
  });

  describe("auth indicator detection", () => {
    it("detects jwt + password hashing from dependencies", () => {
      const meta = buildProjectMetadata(repo, [fact()], {
        dependencies: { jsonwebtoken: "^9", bcryptjs: "^3" },
        devDependencies: {}
      }, 1);

      expect(meta.authIndicators.jwtLibraryUsed).toBe(true);
      expect(meta.authIndicators.passwordHashingUsed).toBe(true);
    });

    it("detects passport, sessions and oauth", () => {
      const meta = buildProjectMetadata(
        repo,
        [fact({ authEvidence: ["oauth redirect flow in code"] })],
        { dependencies: { passport: "^0.7", "express-session": "^1.18" }, devDependencies: {} },
        1
      );

      expect(meta.authIndicators.passportUsed).toBe(true);
      expect(meta.authIndicators.sessionUsed).toBe(true);
      expect(meta.authIndicators.oauthUsed).toBe(true);
    });

    it("detects auth middleware via code evidence", () => {
      const meta = buildProjectMetadata(
        repo,
        [fact({ authEvidence: ['middleware "requireAuth" guards routes'] })],
        { dependencies: {}, devDependencies: {} },
        1
      );

      expect(meta.authIndicators.authMiddlewareDetected).toBe(true);
    });

    it("detects jwt.sign/jwt.verify usage and scrypt hashing from evidence strings", () => {
      const meta = buildProjectMetadata(
        repo,
        [fact({ authEvidence: ["calls jwt.sign() for tokens", "hashes with crypto.scrypt("] })],
        { dependencies: {}, devDependencies: {} },
        1
      );

      expect(meta.authIndicators.jwtLibraryUsed).toBe(true);
      expect(meta.authIndicators.passwordHashingUsed).toBe(true);
    });

    it("reports all-false when no auth signals exist", () => {
      const meta = buildProjectMetadata(repo, [fact()], { dependencies: {}, devDependencies: {} }, 1);

      expect(meta.authIndicators.jwtLibraryUsed).toBe(false);
      expect(meta.authIndicators.passwordHashingUsed).toBe(false);
      expect(meta.authIndicators.passportUsed).toBe(false);
      expect(meta.authIndicators.sessionUsed).toBe(false);
      expect(meta.authIndicators.oauthUsed).toBe(false);
      expect(meta.authIndicators.authMiddlewareDetected).toBe(false);
    });

    it("caps evidence at 40 entries", () => {
      const evidence = Array.from({ length: 60 }, (_, i) => `jwt usage ${i}`);
      const meta = buildProjectMetadata(repo, [fact({ authEvidence: evidence })], {
        dependencies: {},
        devDependencies: {}
      }, 1);

      expect(meta.authIndicators.evidence).toHaveLength(40);
    });
  });
});
