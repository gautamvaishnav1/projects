import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireAuth } from "../src/shared/middleware/auth.middleware";
import { signAccessToken } from "../src/shared/utils/jwt.util";

function makeReq(headers: Record<string, string> = {}): Request {
  return { headers } as unknown as Request;
}

function makeRes(): Response {
  return {} as Response;
}

describe("requireAuth middleware", () => {
  let next: NextFunction & ReturnType<typeof vi.fn>;

  beforeEach(() => {
    next = vi.fn() as unknown as NextFunction & ReturnType<typeof vi.fn>;
  });

  it("rejects requests without an Authorization header", () => {
    requireAuth(makeReq(), makeRes(), next);
    expect(next).toHaveBeenCalledOnce();
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe("Missing bearer token");
  });

  it("rejects malformed Authorization headers", () => {
    for (const header of ["Basic abc123", "Bearer", "Token abc", "bearer-no-space"]) {
      next.mockClear();
      requireAuth(makeReq({ authorization: header }), makeRes(), next);
      const err = next.mock.calls[0][0];
      expect(err.statusCode).toBe(401);
    }
  });

  it("rejects invalid or expired tokens", () => {
    requireAuth(makeReq({ authorization: "Bearer garbage.token.here" }), makeRes(), next);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
    expect(err.message).toMatch(/invalid|expired/i);
  });

  it("attaches req.user and calls next for a valid bearer token", () => {
    const token = signAccessToken({ sub: "u-42", email: "dev@example.com" });
    const req = makeReq({ authorization: `Bearer ${token}` }) as Request & { user?: unknown };

    requireAuth(req, makeRes(), next);

    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0]).toHaveLength(0); // no error passed
    expect(req.user).toEqual({ id: "u-42", email: "dev@example.com" });
  });

  it("trims whitespace after Bearer prefix", () => {
    const token = signAccessToken({ sub: "u-7", email: "x@example.com" });
    const req = makeReq({ authorization: `Bearer   ${token}   ` }) as Request & { user?: unknown };

    requireAuth(req, makeRes(), next);

    expect(next.mock.calls[0]).toHaveLength(0);
    expect(req.user).toEqual({ id: "u-7", email: "x@example.com" });
  });

  it("rejects structurally valid tokens whose payload has no sub claim", async () => {
    const { default: jwt } = await import("jsonwebtoken");
    const { env } = await import("../src/config/env");
    const noSub = jwt.sign({ email: "a@b.c" }, env.jwtSecret);

    requireAuth(makeReq({ authorization: `Bearer ${noSub}` }), makeRes(), next);

    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe("Invalid token payload");
  });
});
