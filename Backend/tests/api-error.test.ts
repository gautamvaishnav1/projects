import { describe, expect, it } from "vitest";
import { ApiError } from "../src/shared/utils/api-error";

describe("ApiError", () => {
  it("is an Error subclass with name, statusCode and details", () => {
    const err = new ApiError(418, "I am a teapot", { hint: "short+stout" });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.name).toBe("ApiError");
    expect(err.statusCode).toBe(418);
    expect(err.message).toBe("I am a teapot");
    expect(err.details).toEqual({ hint: "short+stout" });
  });

  it("defaults details to undefined when omitted", () => {
    const err = new ApiError(500, "boom");
    expect(err.details).toBeUndefined();
  });

  it.each([
    ["badRequest", 400],
    ["unauthorized", 401],
    ["forbidden", 403],
    ["notFound", 404],
    ["conflict", 409],
    ["unprocessable", 422],
    ["tooManyRequests", 429],
    ["badGateway", 502],
    ["internal", 500]
  ] as const)("%s() produces status %i", (factory, statusCode) => {
    const err = (ApiError as unknown as Record<string, (m?: string) => ApiError>)[factory]();
    expect(err.statusCode).toBe(statusCode);
    expect(typeof err.message).toBe("string");
    expect(err.message.length).toBeGreaterThan(0);
  });

  it("static factories accept custom messages and details", () => {
    const err = ApiError.conflict("Email already registered", { field: "email" });
    expect(err.statusCode).toBe(409);
    expect(err.message).toBe("Email already registered");
    expect(err.details).toEqual({ field: "email" });
  });

  it("keeps a usable stack trace", () => {
    const err = ApiError.notFound();
    expect(err.stack).toEqual(expect.any(String));
    expect(err.stack!.length).toBeGreaterThan(0);
  });
});
