import { describe, expect, it } from "vitest";
import { parseSource } from "../src/modules/parser/babel.parser";
import { extractWithFallback } from "../src/modules/parser/fallback-extractor";

describe("parser failure handling (fault tolerance)", () => {
  it("babel rejects genuinely broken syntax", () => {
    expect(() =>
      parseSource("const router = require('express');\nrouter.get('/x', broken(", "src/broken.js")
    ).toThrow();
  });

  it("fallback extractor still extracts signal from a broken file", () => {
    const code = `const router = require('express').Router();
router.get('/health', getHealth);
router.post('/login', loginUser);
async function loginUser(req, res) { return null; }
module.exports = { loginUser };`;

    const facts = extractWithFallback("src/routes/auth.routes.ts", code, new Error("Unexpected token"));

    expect(facts.parse.ok).toBe(false);
    expect(facts.parse.strategy).toBe("fallback");
    expect(facts.routes).toContainEqual({
      method: "GET",
      path: "/health",
      handler: "getHealth",
      file: "src/routes/auth.routes.ts"
    });
    expect(facts.routes).toContainEqual(
      expect.objectContaining({ method: "POST", path: "/login", handler: "loginUser" })
    );
    expect(facts.functions.map((f) => f.name)).toContain("loginUser");
    expect(facts.imports.map((i) => i.source)).toContain("express");
    expect(facts.exports[0]?.names).toContain("loginUser");
  });

  it("never throws even on total garbage", () => {
    const facts = extractWithFallback(
      "weird/file.ts",
      "\x00\x01 garbage \x02 {{[[[",
      new Error("boom")
    );
    expect(facts.parse.strategy).toBe("fallback");
    expect(facts.lines).toBeGreaterThan(0);
  });
});
