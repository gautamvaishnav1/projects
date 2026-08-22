import mongoose from "mongoose";
import { afterAll, describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../src/shared/utils/api-error";
import { logger } from "../src/shared/utils/logger";
import { errorHandler, notFoundHandler } from "../src/shared/errors/error.middleware";

vi.mock("../src/config/env", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../src/config/env")>();
  return { ...mod, isProd: false };
});

const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => {});

function makeRes(): Response & { statusCode: number; body: unknown } {
  const res = {
    statusCode: 0,
    body: null as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    }
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

function handle(err: unknown) {
  const res = makeRes();
  errorHandler(err, {} as Request, res, (() => {}) as NextFunction);
  return { res, payload: res.body as Record<string, unknown> };
}

afterAll(() => {
  errorSpy.mockRestore();
});

describe("notFoundHandler", () => {
  it("responds 404 with a JSON message", () => {
    const res = makeRes();
    notFoundHandler({} as Request, res);
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ success: false, message: "Route not found" });
  });
});

describe("errorHandler", () => {
  it("passes ApiError status/message/details through", () => {
    const apiErr = new ApiError(409, "Email exists", { field: "email" });
    const { res, payload } = handle(apiErr);

    expect(res.statusCode).toBe(409);
    expect(payload.success).toBe(false);
    expect(payload.message).toBe("Email exists");
    expect(payload.details).toEqual({ field: "email" });
    expect(payload.stack).toBeUndefined(); // <500 never leaks stack
  });

  it("maps mongoose ValidationError to 400 with per-field details", () => {
    const ve = new mongoose.Error.ValidationError();
    ve.addError(
      "email",
      new mongoose.Error.ValidatorError({ path: "email", message: "Path `email` is required." })
    );
    const { res, payload } = handle(ve);

    expect(res.statusCode).toBe(400);
    expect(payload.message).toBe("Validation failed");
    expect(payload.details).toEqual([
      { field: "email", message: "Path `email` is required." }
    ]);
  });

  it("maps mongoose CastError to 400 naming the bad field", () => {
    const ce = new mongoose.Error.CastError("ObjectId", "nope", "_id");
    const { res, payload } = handle(ce);

    expect(res.statusCode).toBe(400);
    expect(payload.message).toBe('Invalid value for "_id"');
  });

  it("maps duplicate-key (code 11000) errors to 409 with keyValue details", () => {
    const dup = Object.assign(new Error("E11000"), { code: 11000, keyValue: { email: "a@b.c" } });
    const { res, payload } = handle(dup);

    expect(res.statusCode).toBe(409);
    expect(payload.message).toBe("Duplicate key error");
    expect(payload.details).toEqual({ email: "a@b.c" });
  });

  it("maps SyntaxError to 400 malformed JSON", () => {
    const { res, payload } = handle(new SyntaxError("Unexpected token } in JSON"));
    expect(res.statusCode).toBe(400);
    expect(payload.message).toBe("Malformed JSON body");
  });

  it("returns generic 500 for unknown Errors and logs them", () => {
    errorSpy.mockClear();
    const boom = new Error("kaboom");
    const { res, payload } = handle(boom);

    expect(res.statusCode).toBe(500);
    expect(payload.message).toBe("Internal server error");
    expect(errorSpy).toHaveBeenCalledOnce();
  });

  it("includes the stack for 5xx in non-production", () => {
    const { payload } = handle(new Error("with stack"));
    expect(payload.stack).toEqual(expect.any(String));
  });

  it("handles non-Error thrown values (strings/objects)", () => {
    errorSpy.mockClear();
    const { res, payload } = handle("just a string");
    expect(res.statusCode).toBe(500);
    expect(payload.message).toBe("Internal server error");

    const r2 = makeRes();
    errorHandler({ weird: true }, {} as Request, r2, (() => {}) as NextFunction);
    expect(r2.statusCode).toBe(500);
    expect((r2.body as Record<string, unknown>).success).toBe(false);
  });

  it("never exposes details when there are none", () => {
    const { payload } = handle(new Error("plain"));
    expect(payload).not.toHaveProperty("details");
  });

  it("does not include stack for client errors even in dev", () => {
    const { payload } = handle(ApiError.badRequest("bad"));
    expect(payload).not.toHaveProperty("stack");
  });
});
