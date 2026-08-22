import { describe, expect, it } from "vitest";
import { findPath, hasComponent, pickComponentForQuestion } from "../src/modules/ai/graph.util";
import { parseLlmChatReply } from "../src/modules/ai/chat.service";
import type { Architecture } from "../src/modules/analysis/analysis.types";

const arch: Architecture = {
  components: [
    { id: "frontend", name: "Frontend App", type: "frontend", files: ["app/src/App.tsx"] },
    { id: "auth-routes", name: "Auth Routes", type: "routes", files: ["api/routes/auth.routes.ts"] },
    { id: "auth-controller", name: "Auth Controller", type: "controller" },
    {
      id: "user-model",
      name: "User Model",
      type: "model",
      description: "Mongoose model storing users",
      files: ["api/models/user.model.ts"]
    },
    { id: "mongodb-database", name: "MongoDB Database", type: "database" }
  ],
  connections: [
    { from: "frontend", to: "auth-routes", label: "sends requests" },
    { from: "auth-routes", to: "auth-controller", label: "delegates to" },
    { from: "auth-controller", to: "user-model", label: "persists via" },
    { from: "user-model", to: "mongodb-database", label: "stores in" }
  ]
};

describe("chat graph utilities", () => {
  it("validates component ids against the stored architecture", () => {
    expect(hasComponent(arch, "auth-controller")).toBe(true);
    expect(hasComponent(arch, "made-up-id")).toBe(false);
  });

  it("finds the semantic walk frontend -> auth -> database", () => {
    const path = findPath(arch, "frontend", "mongodb-database");
    expect(path).toEqual(["frontend", "auth-routes", "auth-controller", "user-model", "mongodb-database"]);
  });

  it("returns empty path when an endpoint is unknown", () => {
    expect(findPath(arch, "frontend", "ghost")).toEqual([]);
  });
});

describe("component matching for questions", () => {
  const metadata = {
    models: [{ name: "User", file: "api/models/user.model.ts" }],
    routes: [{ handler: "loginUser", file: "api/routes/auth.routes.ts" }]
  };

  it('maps "How does authentication work?" to the auth component', () => {
    expect(pickComponentForQuestion(arch, "How does authentication work?", metadata)).toBe(
      "auth-routes"
    );
  });

  it("maps data/storage questions toward the model component", () => {
    expect(pickComponentForQuestion(arch, "Where is user data stored?", metadata)).toBe(
      "user-model"
    );
  });

  it("returns null for totally unrelated questions", () => {
    expect(pickComponentForQuestion(arch, "What is the meaning of life?", undefined)).toBeNull();
  });
});

describe("LLM chat reply parsing", () => {
  it("extracts answer + TARGET_COMPONENT + PATH lines", () => {
    const parsed = parseLlmChatReply(
      `Authentication starts at the auth routes and flows into the controller.
TARGET_COMPONENT: auth-routes
PATH: frontend, auth-routes, auth-controller`
    );
    expect(parsed.targetId).toBe("auth-routes");
    expect(parsed.pathIds).toEqual(["frontend", "auth-routes", "auth-controller"]);
    expect(parsed.answer).toMatch(/Authentication starts/);
  });

  it("handles NONE markers", () => {
    const parsed = parseLlmChatReply(`No idea.\nTARGET_COMPONENT: NONE\nPATH: NONE`);
    expect(parsed.targetId).toBeNull();
    expect(parsed.pathIds).toEqual([]);
  });
});
