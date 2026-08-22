import { describe, expect, it } from "vitest";
import {
  forgotPasswordSchema,
  githubAuthSchema,
  googleAuthSchema,
  loginSchema,
  registerSchema,
  resendOtpSchema,
  resetPasswordSchema,
  verifyOtpSchema
} from "../src/modules/auth/auth.validation";
import { createProjectSchema } from "../src/modules/projects/project.validation";

const VALID_PASSWORD = "Passw0rd!";

describe("auth validation schemas", () => {
  describe("registerSchema", () => {
    it("accepts a valid registration and normalizes email", () => {
      const parsed = registerSchema.parse({
        name: "  Ada Lovelace ",
        email: "  ADA@Example.COM ",
        password: "Secret123"
      });
      expect(parsed.name).toBe("Ada Lovelace");
      expect(parsed.email).toBe("ada@example.com");
    });

    it("rejects a missing or empty name (min(1) applies even though marked optional)", () => {
      expect(registerSchema.safeParse({ email: "a@b.co", password: VALID_PASSWORD }).success).toBe(false);
      expect(
        registerSchema.safeParse({ name: "", email: "a@b.co", password: VALID_PASSWORD }).success
      ).toBe(false);
    });

    it.each([
      ["too short", "Ab1"],
      ["no digit", "Abcdefghij"],
      ["no letter", "12345678"],
      ["way too long", "A1".repeat(100)]
    ])("rejects %s passwords", (_label, password) => {
      expect(
        registerSchema.safeParse({ name: "X", email: "a@b.co", password }).success
      ).toBe(false);
    });

    it("rejects malformed emails", () => {
      for (const bad of ["nope", "a@b", "@x.com", "a b@c.com"]) {
        expect(registerSchema.safeParse({ email: bad, password: "Secret123" }).success).toBe(false);
      }
    });
  });

  describe("loginSchema", () => {
    it("accepts any non-empty password on login", () => {
      const parsed = loginSchema.parse({ email: "User@Site.io", password: "x" });
      expect(parsed.email).toBe("user@site.io");
      expect(parsed.password).toBe("x");
    });

    it("rejects empty password", () => {
      expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
    });
  });

  describe("verifyOtpSchema", () => {
    it("accepts exactly six digits", () => {
      expect(verifyOtpSchema.parse({ email: "a@b.co", code: "012345" })).toEqual({
        email: "a@b.co",
        code: "012345"
      });
    });

    it.each(["12345", "1234567", "12a456", "abcdef", ""])("rejects code %p", (code) => {
      expect(verifyOtpSchema.safeParse({ email: "a@b.co", code }).success).toBe(false);
    });
  });

  describe("resendOtpSchema", () => {
    it("defaults purpose to register", () => {
      expect(resendOtpSchema.parse({ email: "a@b.co" }).purpose).toBe("register");
    });

    it("allows both known purposes only", () => {
      expect(resendOtpSchema.parse({ email: "a@b.co", purpose: "password_reset" }).purpose).toBe(
        "password_reset"
      );
      expect(resendOtpSchema.safeParse({ email: "a@b.co", purpose: "hacking" }).success).toBe(false);
    });
  });

  it("forgotPasswordSchema requires just the email", () => {
    expect(forgotPasswordSchema.parse({ email: "A@B.Co" }).email).toBe("a@b.co");
    expect(forgotPasswordSchema.safeParse({}).success).toBe(false);
  });

  it("resetPasswordSchema enforces the strong-password rules on newPassword", () => {
    const good = resetPasswordSchema.safeParse({
      email: "a@b.co",
      code: "654321",
      newPassword: "Fresh1234"
    });
    expect(good.success).toBe(true);

    const weak = resetPasswordSchema.safeParse({
      email: "a@b.co",
      code: "654321",
      newPassword: "short"
    });
    expect(weak.success).toBe(false);
  });

  it("googleAuthSchema demands a credential of reasonable length", () => {
    expect(googleAuthSchema.safeParse({ credential: "x".repeat(25) }).success).toBe(true);
    expect(googleAuthSchema.safeParse({ credential: "short" }).success).toBe(false);
  });

  it("githubAuthSchema bounds the oauth code length", () => {
    expect(githubAuthSchema.safeParse({ code: "abcde" }).success).toBe(true);
    expect(githubAuthSchema.safeParse({ code: "ab" }).success).toBe(false);
    expect(githubAuthSchema.safeParse({ code: "z".repeat(201) }).success).toBe(false);
  });

  it("exports match the expected password constant shape (smoke)", () => {
    expect(registerSchema.safeParse({ email: "ok@ok.co", password: VALID_PASSWORD, name: "N" }).success).toBe(true);
  });
});

describe("createProjectSchema", () => {
  it("accepts a valid GitHub project payload", () => {
    const parsed = createProjectSchema.parse({
      name: " My Project ",
      repoUrl: "https://github.com/acme/widgets"
    });
    expect(parsed.name).toBe("My Project");
    expect(parsed.description).toBe("");
  });

  it("keeps provided descriptions", () => {
    expect(
      createProjectSchema.parse({
        name: "P",
        description: "hello",
        repoUrl: "https://github.com/a/b"
      }).description
    ).toBe("hello");
  });

  it("requires an actual URL", () => {
    expect(createProjectSchema.safeParse({ name: "P", repoUrl: "not a url" }).success).toBe(false);
  });

  it("rejects non-GitHub hosts", () => {
    expect(
      createProjectSchema.safeParse({ name: "P", repoUrl: "https://gitlab.com/a/b" }).success
    ).toBe(false);
  });

  it("bounds name length", () => {
    expect(createProjectSchema.safeParse({ name: "", repoUrl: "https://github.com/a/b" }).success).toBe(false);
    expect(
      createProjectSchema.safeParse({ name: "n".repeat(121), repoUrl: "https://github.com/a/b" }).success
    ).toBe(false);
  });
});
