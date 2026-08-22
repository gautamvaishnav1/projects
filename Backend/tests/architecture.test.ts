import { describe, expect, it } from "vitest";
import { normalizeArchitecture } from "../src/modules/analysis/architecture.schema";
import { generateHeuristic } from "../src/modules/ai/architect.service";
import type { ProjectMetadata } from "../src/modules/parser/parser.types";

describe("architecture validation & normalization", () => {
  it("generates stable kebab-case ids and drops dangling/self connections", () => {
    const normalized = normalizeArchitecture({
      components: [
        { id: "Auth Routes", name: "Auth Routes", type: "routes", description: "d" },
        { name: "User Model", type: "model" },
        { id: "user-model", name: "Duplicate", type: "model" }
      ],
      connections: [
        { from: "Auth Routes", to: "User Model", label: "uses" },
        { from: "auth-routes", to: "ghost-component", label: "bad" },
        { from: "auth-routes", to: "auth-routes", label: "self" },
        { from: "unknown-x", to: "unknown-y", label: "bad2" }
      ]
    });

    const ids = normalized.components.map((c) => c.id);
    expect(ids).toContain("auth-routes");
    expect(ids).toContain("user-model");
    // duplicate id got deduplicated
    expect(new Set(ids).size).toBe(ids.length);

    const pairs = normalized.connections.map((c) => `${c.from}->${c.to}`);
    expect(pairs).toContain("auth-routes->user-model");
    for (const conn of normalized.connections) {
      expect(ids).toContain(conn.from);
      expect(ids).toContain(conn.to);
      expect(conn.from).not.toBe(conn.to);
    }
  });
});

function fakeMetadata(): ProjectMetadata {
  return {
    generatedAt: new Date().toISOString(),
    project: { name: "demo-api", repo: "acme/demo-api" },
    stats: {
      filesConsidered: 6,
      filesParsedBabel: 5,
      filesFallback: 1,
      filesFailed: 1,
      totalFunctions: 4,
      totalClasses: 1,
      totalRoutes: 3,
      totalModels: 1,
      durationMs: 42
    },
    dependencies: { express: "^4", mongoose: "^8", jsonwebtoken: "^9", bcryptjs: "^3" },
    devDependencies: {},
    files: [
      { path: "server.js", bytes: 512, lines: 20, role: "entry" },
      { path: "src/routes/auth.routes.ts", bytes: 768, lines: 30, role: "routes" },
      { path: "src/controllers/auth.controller.ts", bytes: 1024, lines: 40, role: "controller" },
      { path: "src/services/user.service.ts", bytes: 896, lines: 35, role: "service" },
      { path: "src/models/user.model.ts", bytes: 384, lines: 15, role: "model" }
    ],
    imports: [],
    exports: [],
    functions: [],
    classes: [],
    routes: [
      { method: "POST", path: "/login", handler: "loginUser", file: "src/routes/auth.routes.ts" },
      { method: "GET", path: "/users/:id", handler: "getUser", file: "src/routes/users.routes.ts" }
    ],
    controllers: [{ name: "loginUser", file: "src/controllers/auth.controller.ts", kind: "controller", type: "function" }],
    services: [{ name: "UserService", file: "src/services/user.service.ts", kind: "service", type: "class" }],
    models: [
      {
        name: "User",
        file: "src/models/user.model.ts",
        collection: "users",
        fields: ["email", "passwordHash"]
      }
    ],
    authIndicators: {
      jwtLibraryUsed: true,
      passwordHashingUsed: true,
      passportUsed: false,
      sessionUsed: false,
      oauthUsed: false,
      authMiddlewareDetected: false,
      evidence: ['jwt library import "jsonwebtoken"', "jwt.sign() call"]
    }
  };
}

describe("heuristic architect (offline fallback)", () => {
  it("builds a connected architecture with valid ids only", () => {
    const arch = generateHeuristic(fakeMetadata());

    expect(arch.components.length).toBeGreaterThanOrEqual(4);
    const ids = new Set(arch.components.map((c) => c.id));

    expect(ids.has("server-app")).toBe(true);
    expect([...ids].some((id) => id.includes("auth-routes"))).toBe(true);
    expect(ids.has("mongodb-database")).toBe(true);

    for (const c of arch.connections) {
      expect(ids.has(c.from)).toBe(true);
      expect(ids.has(c.to)).toBe(true);
    }
    // route -> controller -> service -> model chain exists
    const from = (a: string) => arch.connections.filter((c) => c.from === a).map((c) => c.to);
    const authRoutesId = [...ids].find((i) => i.includes("auth-routes"))!;
    expect(from(authRoutesId).length).toBeGreaterThan(0);
  });
});
