import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { validate } from "../src/shared/middleware/validate.middleware";

function makeReq(over: Partial<Request> = {}): Request {
  return { params: {}, query: {}, body: {}, ...over } as unknown as Request;
}

describe("validate middleware", () => {
  let next: NextFunction & ReturnType<typeof vi.fn>;
  let res: Response;

  beforeEach(() => {
    next = vi.fn() as unknown as NextFunction & ReturnType<typeof vi.fn>;
    res = {} as Response;
  });

  it("passes valid bodies through next() untouched", () => {
    const schema = z.object({ name: z.string() });
    const req = makeReq({ body: { name: "acme" } });

    validate({ body: schema })(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next.mock.calls[0]).toHaveLength(0);
    expect(req.body).toEqual({ name: "acme" });
  });

  it("replaces req.body with the parsed/coerced value", () => {
    const schema = z.object({ page: z.coerce.number().int(), active: z.coerce.boolean() });
    const req = makeReq({ body: { page: "3", active: "true" } });

    validate({ body: schema })(req, res, next);

    expect(req.body).toEqual({ page: 3, active: true });
    expect(next.mock.calls[0]).toHaveLength(0);
  });

  it("rejects invalid bodies with a 400 ApiError and field-level issues", () => {
    const schema = z.object({
      email: z.string().email(),
      age: z.number().min(18)
    });
    const req = makeReq({ body: { email: "nope", age: 5 } });

    validate({ body: schema })(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe("Validation failed");
    const fields = err.details.map((d: { field: string }) => d.field);
    expect(fields).toContain("email");
    expect(fields).toContain("age");
    for (const issue of err.details) expect(issue.message).toEqual(expect.any(String));
  });

  it("validates and merges query params", () => {
    const schema = z.object({ limit: z.coerce.number().max(100) });
    const req = makeReq({ query: { limit: "25", junk: "keep-me" } });

    validate({ query: schema })(req, res, next);

    expect(next.mock.calls[0]).toHaveLength(0);
    expect(req.query).toMatchObject({ limit: 25, junk: "keep-me" });
  });

  it("rejects invalid query params", () => {
    const schema = z.object({ limit: z.coerce.number().max(10) });
    const req = makeReq({ query: { limit: "999" } });

    validate({ query: schema })(req, res, next);

    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe("Invalid query parameters");
    expect(err.details[0].field).toBe("limit");
  });

  it("validates URL params (e.g. mongo ObjectId shape)", () => {
    const objectId = /^[a-f\d]{24}$/i;
    const schema = z.string().regex(objectId, "Must be a valid id");
    const good = makeReq({ params: { id: "507f1f77bcf86cd799439011" } });
    validate({ params: schema })(good, res, next);
    expect(next).toHaveBeenCalledOnce();

    next.mockClear();
    const bad = makeReq({ params: { id: "not-an-id" } });
    validate({ params: schema })(bad, res, next);
    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe("Invalid URL parameters");
  });

  it("supports all three schemas at once", () => {
    const req = makeReq({
      params: { projectId: "abc" },
      query: { q: "x" },
      body: { n: 1 }
    });

    validate({
      params: z.object({ projectId: z.string() }),
      query: z.object({ q: z.string() }),
      body: z.object({ n: z.number() })
    })(req, res, next);

    expect(next.mock.calls[0]).toHaveLength(0);
  });

  it("reports root-level issues with '(root)' field", () => {
    const schema = z.string().min(5); // non-object schema -> root issue path is []
    const req = makeReq({ body: "hi" });

    validate({ body: schema })(req, res, next);

    const err = next.mock.calls[0][0];
    expect(err.statusCode).toBe(400);
    expect(err.details[0].field).toBe("(root)");
  });

  it("stops at the first failing schema section (params before query)", () => {
    const req = makeReq({
      params: { id: "" },
      query: { q: "" }
    });

    validate({
      params: z.object({ id: z.string().min(2) }),
      query: z.object({ q: z.string().min(2) })
    })(req, res, next);

    const err = next.mock.calls[0][0];
    expect(err.message).toBe("Invalid URL parameters");
    expect(err.details[0].field).toBe("id");
  });
});
