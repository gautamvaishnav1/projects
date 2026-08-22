import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../src/shared/utils/api-error";
import { env } from "../src/config/env";
import { chatCompletion, extractJson, llmConfigured } from "../src/infrastructure/llm/llm.client";

const mutableEnv = env as unknown as { llmApiKey: string; llmBaseUrl: string; llmTimeoutMs: number };
const originalKey = env.llmApiKey;

afterEach(() => {
  vi.unstubAllGlobals();
  mutableEnv.llmApiKey = originalKey;
});

describe("llmConfigured", () => {
  it("reflects whether an API key is set", () => {
    mutableEnv.llmApiKey = "";
    expect(llmConfigured()).toBe(false);
    mutableEnv.llmApiKey = "sk-test";
    expect(llmConfigured()).toBe(true);
  });
});

describe("extractJson", () => {
  it("parses direct JSON objects and arrays", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
    expect(extractJson("[1,2,3]")).toEqual([1, 2, 3]);
  });

  it("parses JSON inside markdown fences (with or without language tag)", () => {
    expect(extractJson('```json\n{"x": "y"}\n```')).toEqual({ x: "y" });
    expect(extractJson('```\n{"n": 5}\n```')).toEqual({ n: 5 });
  });

  it("scans the first balanced object out of surrounding prose", () => {
    const text = 'Here is your result: {"components":[{"name":"A"}]} hope that helps!';
    expect(extractJson(text)).toEqual({ components: [{ name: "A" }] });
  });

  it("handles braces and escaped quotes inside strings", () => {
    const text = `prefix {"desc": "uses {braces} and \\"quotes\\"", "n": 2} suffix`;
    expect(extractJson(text)).toEqual({ desc: 'uses {braces} and "quotes"', n: 2 });
  });

  it("returns the FIRST balanced object when multiple exist", () => {
    expect(extractJson('{"first":true} {"second":true}')).toEqual({ first: true });
  });

  it("throws when no JSON object exists", () => {
    expect(() => extractJson("no json here at all")).toThrow(/No JSON object/i);
  });

  it("throws on unbalanced objects", () => {
    expect(() => extractJson('{"broken": true ')).toThrow(/Unbalanced|Unexpected/i);
  });

  it("throws when the fenced block itself is invalid and no brace scan can save it", () => {
    expect(() => extractJson('```json\n{invalid}\n```')).toThrow();
  });
});

describe("chatCompletion", () => {
  function stubFetch(payload: unknown, ok = true, status = 200) {
    const fetchMock = vi.fn(async () => ({
      ok,
      status,
      json: async () => payload,
      text: async () => JSON.stringify(payload)
    }));
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("throws a 500 ApiError when no API key is configured", async () => {
    mutableEnv.llmApiKey = "";
    await expect(chatCompletion([{ role: "user", content: "hi" }])).rejects.toMatchObject({
      statusCode: 500
    });
  });

  it("POSTs to /chat/completions with model + messages and returns the content", async () => {
    mutableEnv.llmApiKey = "sk-test-123";
    const fetchMock = stubFetch({ choices: [{ message: { content: "hello world" } }] });

    const reply = await chatCompletion(
      [
        { role: "system", content: "sys" },
        { role: "user", content: "usr" }
      ],
      0.4
    );

    expect(reply).toBe("hello world");
    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/chat/completions");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk-test-123");
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe(env.llmModel);
    expect(body.temperature).toBe(0.4);
    expect(body.messages).toHaveLength(2);
  });

  it("wraps non-2xx responses in a 502 ApiError including the status", async () => {
    mutableEnv.llmApiKey = "sk-test";
    stubFetch({ error: "quota" }, false, 429);

    await expect(chatCompletion([{ role: "user", content: "?" }])).rejects.toSatisfy((err: unknown) => {
      const apiErr = err as ApiError;
      return (
        apiErr instanceof ApiError &&
        apiErr.statusCode === 502 &&
        apiErr.message.includes("429")
      );
    });
  });

  it("wraps network failures in a 502 ApiError", async () => {
    mutableEnv.llmApiKey = "sk-test";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      })
    );

    await expect(chatCompletion([{ role: "user", content: "?" }])).rejects.toBeInstanceOf(ApiError);
    await expect(chatCompletion([{ role: "user", content: "?" }])).rejects.toMatchObject({
      statusCode: 502
    });
  });

  it("rejects with 502 when the response has empty content", async () => {
    mutableEnv.llmApiKey = "sk-test";
    stubFetch({ choices: [{ message: {} }] });

    await expect(chatCompletion([{ role: "user", content: "?" }])).rejects.toMatchObject({
      statusCode: 502,
      message: expect.stringMatching(/empty/i)
    });
  });

  it("tolerates missing choices entirely as an empty response", async () => {
    mutableEnv.llmApiKey = "sk-test";
    stubFetch({});

    await expect(chatCompletion([{ role: "user", content: "?" }])).rejects.toMatchObject({
      statusCode: 502
    });
  });
});
