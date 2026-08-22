import { describe, expect, it } from "vitest";
import {
  ARCHITECT_SYSTEM_PROMPT,
  CHAT_SYSTEM_PROMPT,
  architectUserPrompt,
  compactMetadataForPrompt
} from "../src/modules/ai/ai.prompts";
import type { ProjectMetadata } from "../src/modules/parser/parser.types";

function meta(over: Partial<ProjectMetadata> = {}): ProjectMetadata {
  return {
    generatedAt: new Date().toISOString(),
    project: { name: "demo", repo: "acme/demo" },
    stats: {
      filesConsidered: 1,
      filesParsedBabel: 1,
      filesFallback: 0,
      filesFailed: 0,
      totalFunctions: 0,
      totalClasses: 0,
      totalRoutes: 0,
      totalModels: 0,
      durationMs: 5
    },
    dependencies: { express: "^4" },
    devDependencies: {},
    files: [{ path: "index.ts", bytes: 256, lines: 10, role: "entry" }],
    imports: [],
    exports: [],
    functions: [],
    classes: [],
    routes: [],
    controllers: [],
    services: [],
    models: [],
    authIndicators: {
      jwtLibraryUsed: false,
      passwordHashingUsed: false,
      passportUsed: false,
      sessionUsed: false,
      oauthUsed: false,
      authMiddlewareDetected: false,
      evidence: []
    },
    ...over
  };
}

describe("compactMetadataForPrompt", () => {
  it("emits parseable JSON carrying project/stats/auth info", () => {
    const json = compactMetadataForPrompt(meta());
    const parsed = JSON.parse(json);

    expect(parsed.project.name).toBe("demo");
    expect(parsed.stats.durationMs).toBe(5);
    expect(Array.isArray(parsed.dependencies)).toBe(true);
    expect(parsed.dependencies).toEqual(["express"]);
    expect(parsed.authIndicators).toHaveProperty("jwtLibraryUsed", false);
  });

  it("summarizes dependencies as name lists with caps", () => {
    const deps: Record<string, string> = {};
    for (let i = 0; i < 80; i++) deps[`pkg-${i}`] = "1.0.0";
    const devDeps: Record<string, string> = {};
    for (let i = 0; i < 50; i++) devDeps[`dev-${i}`] = "1.0.0";

    const parsed = JSON.parse(compactMetadataForPrompt(meta({ dependencies: deps, devDependencies: devDeps })));

    expect(parsed.dependencies).toHaveLength(60);
    expect(parsed.devDependencies).toHaveLength(40);
  });

  it("caps routes/models/classes/imports samples", () => {
    const m = meta({
      routes: Array.from({ length: 100 }, (_, i) => ({
        method: "GET" as const,
        path: `/${i}`,
        handler: `h${i}`,
        file: "r.ts"
      })),
      models: Array.from({ length: 60 }, (_, i) => ({
        name: `M${i}`,
        file: "m.ts",
        collection: null,
        fields: []
      })),
      imports: Array.from({ length: 70 }, (_, i) => ({
        file: "a.ts",
        source: `lib-${i}`,
        specifiers: []
      }))
    });

    const parsed = JSON.parse(compactMetadataForPrompt(m));
    expect(parsed.routes).toHaveLength(80);
    expect(parsed.models).toHaveLength(40);
    expect(parsed.sampleImports).toHaveLength(50);
  });

  it("counts filesByRole", () => {
    const m = meta({
      files: [
        { path: "s.ts", bytes: 10, lines: 1, role: "service" },
        { path: "s2.ts", bytes: 20, lines: 2, role: "service" },
        { path: "e.ts", bytes: 30, lines: 3, role: "entry" }
      ]
    });
    const parsed = JSON.parse(compactMetadataForPrompt(m));
    expect(parsed.filesByRole).toEqual({ service: 2, entry: 1 });
  });

  it("truncates oversized payloads to the hard budget with a marker suffix", () => {
    const longPath = "/".concat("segment-".repeat(40), Math.random().toString());
    const m = meta({
      routes: Array.from({ length: 200 }, (_, i) => ({
        method: "POST" as const,
        path: `${longPath}-${i}`,
        handler: "handler",
        file: longPath
      }))
    });

    const json = compactMetadataForPrompt(m);
    expect(json.length).toBeLessThanOrEqual(45_000 + 20); // budget + small suffix
    expect(json.endsWith('"TRUNCATED"}')).toBe(true);
  });

  it("never emits raw AST keys in the payload", () => {
    const payload = JSON.parse(compactMetadataForPrompt(meta()));
    for (const key of Object.keys(payload)) {
      expect(key.toLowerCase()).not.toContain("ast");
    }
    expect(payload).not.toHaveProperty("functions"); // trimmed out of prompt shape? (kept only in metadata)
  });
});

describe("prompt constants", () => {
  it("architect system prompt demands strict JSON with components+connections", () => {
    expect(ARCHITECT_SYSTEM_PROMPT).toContain("JSON");
    expect(ARCHITECT_SYSTEM_PROMPT).toContain("components");
    expect(ARCHITECT_SYSTEM_PROMPT).toContain("connections");
  });

  it("chat system prompt requires TARGET_COMPONENT / PATH markers", () => {
    expect(CHAT_SYSTEM_PROMPT).toContain("TARGET_COMPONENT:");
    expect(CHAT_SYSTEM_PROMPT).toContain("PATH:");
  });

  it("architectUserPrompt embeds the metadata JSON after an instruction line", () => {
    const inner = compactMetadataForPrompt(meta());
    const prompt = architectUserPrompt(inner);
    expect(prompt.startsWith("Analyze this codebase summary")).toBe(true);
    expect(prompt).toContain(inner);
  });
});
