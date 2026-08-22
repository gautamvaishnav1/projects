import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Architecture } from "../src/modules/analysis/analysis.types";
import type { ProjectMetadata } from "../src/modules/parser/parser.types";
import { answerQuestion } from "../src/modules/ai/chat.service";

const { llmConfiguredMock, chatCompletionMock } = vi.hoisted(() => ({
  llmConfiguredMock: vi.fn<() => boolean>(),
  chatCompletionMock: vi.fn()
}));

vi.mock("../src/infrastructure/llm/llm.client", () => ({
  llmConfigured: llmConfiguredMock,
  chatCompletion: chatCompletionMock
}));

const arch: Architecture = {
  components: [
    { id: "frontend", name: "Frontend App", type: "frontend" },
    { id: "server-app", name: "Express Server", type: "config" },
    { id: "auth-routes", name: "Auth Routes", type: "routes", description: "Auth endpoints." },
    { id: "auth-controller", name: "Auth Controller", type: "controller" },
    {
      id: "user-model",
      name: "User Model",
      type: "model",
      description: "Stores users.",
      files: ["src/models/user.model.ts"]
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

function metaAuth(): ProjectMetadata {
  return {
    generatedAt: new Date().toISOString(),
    project: { name: "api", repo: "a/api" },
    stats: {} as ProjectMetadata["stats"],
    dependencies: {},
    devDependencies: {},
    files: [],
    imports: [],
    exports: [],
    functions: [],
    classes: [],
    routes: [],
    controllers: [],
    services: [],
    models: [
      { name: "User", file: "src/models/user.model.ts", collection: null, fields: ["email", "passwordHash"] }
    ],
    authIndicators: {
      jwtLibraryUsed: true,
      passwordHashingUsed: true,
      passportUsed: false,
      sessionUsed: false,
      oauthUsed: false,
      authMiddlewareDetected: false,
      evidence: ["jwt library import"]
    },
    ...({} as Record<string, never>)
  };
}

beforeEach(() => {
  llmConfiguredMock.mockReturnValue(false);
  chatCompletionMock.mockReset();
});

describe("answerQuestion — deterministic heuristic mode (no LLM)", () => {
  it("explains an empty architecture gracefully", async () => {
    const result = await answerQuestion({ architecture: { components: [], connections: [] } }, "anything?");
    expect(result.targetComponent).toBeNull();
    expect(result.path).toEqual([]);
    expect(result.answer).toMatch(/no analyzed components/i);
  });

  it("answers auth questions targeting the auth component with JWT evidence", async () => {
    const result = await answerQuestion(
      { architecture: arch, metadata: metaAuth() },
      "How does authentication work?"
    );

    expect(result.targetComponent).toBe("auth-routes");
    expect(result.path[0]).toBe("frontend");
    expect(result.answer).toMatch(/Auth signals/i);
    expect(result.relatedComponents.length).toBeGreaterThan(0);
    // every emitted id is part of the stored architecture
    const ids = new Set(arch.components.map((c) => c.id));
    for (const id of [result.targetComponent, ...result.path, ...result.relatedComponents]) {
      if (id) expect(ids.has(id)).toBe(true);
    }
  });

  it("adds model field evidence when the target id matches a metadata model", async () => {
    // evidenceFromMetadata matches models by NAME === component id
    const modelArch: Architecture = {
      components: [
        {
          id: "user",
          name: "User",
          type: "model",
          description: "Mongoose model storing users",
          files: ["src/models/user.model.ts"]
        }
      ],
      connections: []
    };
    const result = await answerQuestion(
      { architecture: modelArch, metadata: metaAuth() },
      "Where is user data stored?"
    );
    expect(result.targetComponent).toBe("user");
    expect(result.answer).toContain("email");
    expect(result.answer).toContain("passwordHash");
  });

  it("admits defeat for unmatched questions and suggests components", async () => {
    const result = await answerQuestion({ architecture: arch }, "What is the airspeed of an unladen swallow?");
    expect(result.targetComponent).toBeNull();
    expect(result.answer).toMatch(/could not match/i);
    expect(result.answer).toContain("Frontend App");
  });

  it("never leaves the start component out of the walk when target equals start", async () => {
    const singleTargetArch: Architecture = {
      components: [{ id: "frontend", name: "Frontend", type: "frontend" }],
      connections: []
    };
    const result = await answerQuestion({ architecture: singleTargetArch }, "tell me about frontend");
    expect(result.targetComponent).toBe("frontend");
    expect(result.path).toEqual(["frontend"]);
  });

  it("describes outgoing/incoming connections for the matched component", async () => {
    const result = await answerQuestion({ architecture: arch }, "what about the user model?");
    expect(result.targetComponent).toBe("user-model");
    expect(result.answer).toMatch(/persists|receives/i);
  });
});

describe("answerQuestion — LLM mode", () => {
  it("uses validated TARGET_COMPONENT / PATH from the LLM reply", async () => {
    llmConfiguredMock.mockReturnValue(true);
    chatCompletionMock.mockResolvedValue(
      "Auth flows through routes into the controller.\nTARGET_COMPONENT: auth-controller\nPATH: frontend, auth-routes, auth-controller"
    );

    const result = await answerQuestion({ architecture: arch }, "how does login work?");

    expect(chatCompletionMock).toHaveBeenCalledOnce();
    expect(result.answer).toMatch(/flows through routes/);
    expect(result.targetComponent).toBe("auth-controller");
    expect(result.path).toEqual(["frontend", "auth-routes", "auth-controller"]);
  });

  it("drops hallucinated component ids from the path", async () => {
    llmConfiguredMock.mockReturnValue(true);
    chatCompletionMock.mockResolvedValue(
      "Answer.\nTARGET_COMPONENT: auth-routes\nPATH: frontend, made-up-component, auth-routes"
    );

    const result = await answerQuestion({ architecture: arch }, "?");

    expect(result.path).not.toContain("made-up-component");
    expect(result.path.every((id) => arch.components.some((c) => c.id === id))).toBe(true);
  });

  it("stitches a walk ending at the target when PATH omits it", async () => {
    llmConfiguredMock.mockReturnValue(true);
    chatCompletionMock.mockResolvedValue(
      "Go all the way down.\nTARGET_COMPONENT: mongodb-database\nPATH: frontend"
    );

    const result = await answerQuestion({ architecture: arch }, "where does data end up?");

    expect(result.path[result.path.length - 1]).toBe("mongodb-database");
    expect(result.path[0]).toBe("frontend");
  });

  it("falls back to the heuristic answer when the LLM call fails", async () => {
    llmConfiguredMock.mockReturnValue(true);
    chatCompletionMock.mockRejectedValue(new Error("rate limited"));

    const result = await answerQuestion(
      { architecture: arch, metadata: metaAuth() },
      "How does authentication work?"
    );

    expect(result.targetComponent).toBe("auth-routes"); // heuristic picked it
    expect(chatCompletionMock).toHaveBeenCalledOnce();
  });

  it("falls back to heuristic when LLM emits an invalid target id", async () => {
    llmConfiguredMock.mockReturnValue(true);
    chatCompletionMock.mockResolvedValue(
      "Answer text here.\nTARGET_COMPONENT: totally-fake\nPATH: NONE"
    );

    const result = await answerQuestion(
      { architecture: arch, metadata: metaAuth() },
      "How does authentication work?"
    );

    expect(result.targetComponent).toBe("auth-routes");
    expect(result.path.length).toBeGreaterThan(0);
  });

  it("keeps the heuristic answer text when the LLM answer is blank", async () => {
    llmConfiguredMock.mockReturnValue(true);
    chatCompletionMock.mockResolvedValue("\nTARGET_COMPONENT: auth-controller\nPATH: NONE");

    const result = await answerQuestion(
      { architecture: arch, metadata: metaAuth() },
      "How does authentication work?"
    );

    expect(result.answer.length).toBeGreaterThan(0);
  });
});
