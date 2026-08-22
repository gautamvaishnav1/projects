import { describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../src/shared/utils/async-handler";

const req = {} as Request;
const res = {} as Response;

function makeNext() {
  return vi.fn() as unknown as NextFunction & ReturnType<typeof vi.fn>;
}

describe("asyncHandler", () => {
  it("calls the wrapped handler with req/res/next", async () => {
    const next = makeNext();
    const handler = vi.fn(async (r: Request, s: Response, n: NextFunction) => "ok");
    const wrapped = asyncHandler(handler);

    await wrapped(req, res, next);

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  it("does not call next when the promise resolves", async () => {
    const next = makeNext();
    const wrapped = asyncHandler(async () => undefined);
    await wrapped(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  it("supports sync handlers too", async () => {
    const next = makeNext();
    const wrapped = asyncHandler(() => 42);
    await wrapped(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  it("forwards rejected promise errors to next", async () => {
    const next = makeNext();
    const failure = new Error("database exploded");
    const wrapped = asyncHandler(async () => {
      throw failure;
    });

    await wrapped(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith(failure);
  });

  it("propagates sync throws to the caller (Express handles them at the router layer)", () => {
    const next = makeNext();
    const failure = new Error("sync boom");
    const wrapped = asyncHandler(() => {
      throw failure;
    });

    // the wrapper itself throws synchronously; only promise rejections reach next()
    expect(() => wrapped(req, res, next)).toThrow(failure);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns void (never passes a value into next)", async () => {
    const next = makeNext();
    const wrapped = asyncHandler(async () => "value");
    const result = wrapped(req, res, next);
    expect(await result).toBeUndefined();
  });
});
