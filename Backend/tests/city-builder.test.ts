import { describe, expect, it } from "vitest";
import { buildCityWorld } from "../src/modules/ai/city.builder";
import { generateHeuristic } from "../src/modules/ai/architect.service";
import type { CityWorld } from "../src/modules/analysis/analysis.types";
import type { ProjectMetadata } from "../src/modules/parser/parser.types";

function fakeMetadata(): ProjectMetadata {
  return {
    generatedAt: new Date().toISOString(),
    project: { name: "demo-api", repo: "acme/demo-api", primaryLanguage: "TypeScript" },
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
    dependencies: { express: "^4.18.2", mongoose: "^8", axios: "^1" },
    devDependencies: { jest: "^29", nodemon: "^3" },
    files: [
      { path: "server.js", bytes: 512, lines: 20, role: "entry" },
      { path: "src/routes/auth.routes.ts", bytes: 768, lines: 30, role: "routes" },
      { path: "src/controllers/auth.controller.ts", bytes: 1024, lines: 40, role: "controller" },
      { path: "src/services/user.service.ts", bytes: 896, lines: 35, role: "service" },
      { path: "src/models/user.model.ts", bytes: 384, lines: 15, role: "model" }
    ],
    imports: [
      { file: "src/routes/auth.routes.ts", source: "jsonwebtoken", specifiers: ["sign"] },
      { file: "src/services/user.service.ts", source: "axios", specifiers: ["default"] },
      { file: "src/services/user.service.ts", source: "./user.model", specifiers: ["User"] }
    ],
    exports: [],
    functions: [{ name: "login", file: "src/controllers/auth.controller.ts", line: 5, params: [], isAsync: true, exported: true, kind: "function" }],
    classes: [],
    routes: [
      { method: "POST", path: "/login", handler: "login", file: "src/routes/auth.routes.ts" }
    ],
    controllers: [{ name: "login", file: "src/controllers/auth.controller.ts", kind: "controller", type: "function" }],
    services: [{ name: "UserService", file: "src/services/user.service.ts", kind: "service", type: "class" }],
    models: [],
    authIndicators: {
      jwtLibraryUsed: true,
      passwordHashingUsed: false,
      passportUsed: false,
      sessionUsed: false,
      oauthUsed: false,
      authMiddlewareDetected: false,
      evidence: []
    }
  };
}

function buildWorld(): CityWorld {
  const arch = generateHeuristic(fakeMetadata());
  return buildCityWorld(arch, fakeMetadata(), null, new Date("2026-08-22T10:00:00Z"));
}

describe("city builder (3D world JSON)", () => {
  it("gives every component district + position + size inside district bounds", () => {
    const world = buildWorld();

    expect(world.districts.length).toBeGreaterThanOrEqual(2);
    for (const c of world.architecture.components) {
      expect(c.position).toBeDefined();
      expect(c.size.width).toBeGreaterThan(0);
      expect(c.district).toBeTruthy();
      const d = world.districts.find((x) => x.id === c.district)!;
      expect(Math.abs(c.position.x - d.position.x)).toBeLessThanOrEqual(d.bounds.width / 2);
      expect(Math.abs(c.position.z - d.position.z)).toBeLessThanOrEqual(d.bounds.depth / 2);
      expect(c.visual.importance).toBeGreaterThanOrEqual(1);
      expect(c.visual.complexity).toBeLessThanOrEqual(100);
      // synthetic nodes (bare frontend, auth middleware, external integrations)
      // may have no files; every ATTACHED file must carry parser metadata
      for (const f of c.files) {
        expect(f).toHaveProperty("size"); // bytes
        expect(f.lines).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("produces byte-identical output across runs (deterministic)", () => {
    const a = buildCityWorld(generateHeuristic(fakeMetadata()), fakeMetadata(), null, new Date("2026-08-22T10:00:00Z"));
    const b = buildCityWorld(generateHeuristic(fakeMetadata()), fakeMetadata(), null, new Date("2026-08-22T10:00:00Z"));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("connections reference real ids and paths start/end at component positions", () => {
    const world = buildWorld();
    const byId = new Map(world.architecture.components.map((c) => [c.id, c]));

    world.architecture.connections.forEach((conn, i) => {
      expect(conn.id).toBe(`conn-${String(i + 1).padStart(3, "0")}`);
      expect(byId.has(conn.from)).toBe(true);
      expect(byId.has(conn.to)).toBe(true);
      expect(["http", "auth-flow", "storage", "external-api", "internal", "dependency"]).toContain(conn.type);
      expect(conn.weight).toBeGreaterThanOrEqual(20);
      expect(conn.weight).toBeLessThanOrEqual(95);
      const start = conn.path[0];
      const end = conn.path[conn.path.length - 1];
      const from = byId.get(conn.from)!;
      const to = byId.get(conn.to)!;
      expect([start.x, start.y, start.z]).toEqual([from.position.x, from.position.y, from.position.z]);
      expect([end.x, end.y, end.z]).toEqual([to.position.x, to.position.y, to.position.z]);
    });
  });

  it("no two components in the same district overlap", () => {
    const world = buildWorld();
    for (const d of world.districts) {
      const members = world.architecture.components.filter((c) => c.district === d.id);
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          const overlapX =
            Math.abs(members[i].position.x - members[j].position.x) >=
            (members[i].size.width + members[j].size.width) / 2;
          const overlapZ =
            Math.abs(members[i].position.z - members[j].position.z) >=
            (members[i].size.depth + members[j].size.depth) / 2;
          expect(overlapX || overlapZ).toBe(true);
        }
      }
    }
  });

  it("fills component dependencies (imports from parser facts, uses from edges)", () => {
    const world = buildWorld();
    const ctrl = world.architecture.components.find((c) => c.type === "controller");
    expect(ctrl?.dependencies.imports).toContain("jsonwebtoken");
    const svc = world.architecture.components.find((c) => c.type === "service");
    // relative import "./user.model" must NOT appear as npm package
    expect(svc?.dependencies.imports).not.toContain("./user.model");
    expect(svc?.dependencies.imports).toContain("axios");
    for (const c of world.architecture.components) {
      for (const use of c.dependencies.uses) {
        expect(world.architecture.components.some((x) => x.id === use)).toBe(true);
      }
    }
  });

  it("builds the runtime dependency graph with usedBy component ids", () => {
    const world = buildWorld();
    const express = world.dependencies.runtime.find((d) => d.name === "express");
    expect(express?.version).toBe("^4.18.2");
    expect(express?.hasVulnerabilities).toBe(false);
    expect(Array.isArray(express?.usedBy)).toBe(true);
    expect(world.dependencies.dev).toContain("jest");
  });

  it("detects tech stack categories", () => {
    const world = buildWorld();
    expect(world.techStack.languages).toContain("TypeScript");
    expect(world.techStack.backend).toContain("express");
    expect(world.techStack.database).toContain("mongoose");
    expect(world.techStack.authentication).toContain("jsonwebtoken");
    expect(world.techStack.tooling).toContain("jest");
  });

  it("computes change tracking against a previous analysis snapshot", () => {
    const first = buildWorld();
    const prevSnapshot = {
      id: "64aaaaaaaaaaaaaaaaaa",
      components: first.architecture.components.slice(0, -1).map((c) => ({
        id: c.id,
        files: c.files.map((f) => f.path)
      })),
      connections: first.architecture.connections.slice(0, -1).map((c) => ({ from: c.from, to: c.to }))
    };
    const arch = generateHeuristic(fakeMetadata());
    const second = buildCityWorld(arch, fakeMetadata(), prevSnapshot, new Date("2026-08-22T11:00:00Z"));

    expect(second.changes.previousAnalysisId).toBe("64aaaaaaaaaaaaaaaaaa");
    expect(second.changes.componentsAffected.length).toBeGreaterThan(0);
    expect(second.changes.newConnections).toBeGreaterThanOrEqual(1);
    expect(second.changes.removedConnections).toBe(0);
  });

  it("first run has empty changes with null previousAnalysisId", () => {
    const world = buildWorld();
    expect(world.changes.previousAnalysisId).toBeNull();
    expect(world.changes.newConnections).toBe(0);
    expect(world.changes.removedConnections).toBe(0);
    expect(world.changes.componentsAffected).toEqual([]);
  });
});
