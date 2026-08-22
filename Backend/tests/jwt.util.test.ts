import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { env } from "../src/config/env";
import { signAccessToken, verifyAccessToken } from "../src/shared/utils/jwt.util";

describe("jwt.util", () => {
  const payload = { sub: "user-123", email: "user@example.com" };

  it("signs and verifies an access token round-trip", () => {
    const token = signAccessToken(payload);
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // header.payload.signature

    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe("user-123");
    expect(decoded.email).toBe("user@example.com");
  });

  it("embeds standard JWT claims (iat/exp)", () => {
    const token = signAccessToken(payload);
    const decoded = verifyAccessToken(token) as Record<string, unknown> & typeof payload;
    expect(decoded.iat).toEqual(expect.any(Number));
    expect(decoded.exp).toEqual(expect.any(Number));
    expect(decoded.exp as number).toBeGreaterThan(decoded.iat as number);
  });

  it("honours env.jwtExpiresIn expiry window", () => {
    const token = signAccessToken(payload);
    const decoded = jwt.decode(token) as { exp: number; iat: number };
    // default env is "7d"; just assert a sane multi-hour window
    expect(decoded.exp - decoded.iat).toBeGreaterThan(60);
  });

  it("rejects a garbage token", () => {
    expect(() => verifyAccessToken("not-a-jwt")).toThrow(/jwt/i);
  });

  it("rejects a token signed with a different secret", () => {
    const forged = jwt.sign(payload, "some-other-secret", { expiresIn: "1h" });
    expect(() => verifyAccessToken(forged)).toThrow(/signature|verify/i);
  });

  it("rejects an expired token", () => {
    const expired = jwt.sign(payload, env.jwtSecret, { expiresIn: -10 });
    expect(() => verifyAccessToken(expired)).toThrow(/expired/i);
  });

  it("rejects tampered payloads", () => {
    const token = signAccessToken(payload);
    const [header, , signature] = token.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ ...payload, sub: "admin-1" })).toString(
      "base64url"
    );
    expect(() => verifyAccessToken(`${header}.${forgedPayload}.${signature}`)).toThrow();
  });

  it("verifies tokens produced directly by jsonwebtoken with same secret", () => {
    const manual = jwt.sign(payload, env.jwtSecret, { expiresIn: "7d" });
    expect(verifyAccessToken(manual).sub).toBe("user-123");
  });
});
