import crypto from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OtpPurpose } from "../src/modules/auth/otp.model";
import { clearOtp, consumeOtp, issueOtp } from "../src/modules/auth/otp.service";

/* ------------------------------------------------------------------ */
/* In-memory OtpModel mock                                             */
/* ------------------------------------------------------------------ */

interface FakeDoc {
  _id: string;
  email: string;
  purpose: OtpPurpose;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  lastSentAt: Date;
}

const { store } = vi.hoisted(() => ({ store: new Map<string, FakeDoc>() }));

const keyOf = (email: string, purpose: string) => `${email}:${purpose}`;

vi.mock("../src/modules/auth/otp.model", () => ({
  OtpModel: {
    findOne: vi.fn(async (filter: { email: string; purpose: string }) => {
      const doc = store.get(keyOf(filter.email, filter.purpose));
      if (!doc) return null;
      // mongoose documents expose save(); persist mutations back into the store
      return Object.assign(doc, {
        save: async () => {
          store.set(keyOf(filter.email, filter.purpose), doc);
          return doc;
        }
      });
    }),
    findOneAndUpdate: vi.fn(
      async (
        filter: { email: string; purpose: string },
        update: Record<string, unknown>
      ) => {
        const key = keyOf(filter.email, filter.purpose);
        const prev = store.get(key);
        const doc: FakeDoc = {
          _id: prev?._id ?? `id-${key}`,
          email: filter.email,
          purpose: filter.purpose as OtpPurpose,
          codeHash: String(update.codeHash),
          attempts: Number(update.attempts),
          expiresAt: update.expiresAt as Date,
          lastSentAt: update.lastSentAt as Date
        };
        store.set(key, doc);
        return doc;
      }
    ),
    deleteOne: vi.fn(async (filter: { _id?: string; email?: string; purpose?: string }) => {
      if (filter._id) {
        for (const [key, doc] of store) {
          if (doc._id === filter._id) store.delete(key);
        }
        return { deletedCount: 1 };
      }
      if (filter.email && filter.purpose) {
        store.delete(keyOf(filter.email, filter.purpose));
        return { deletedCount: 1 };
      }
      return { deletedCount: 0 };
    }),
    deleteMany: vi.fn(async (filter: { email: string; purpose: string }) => {
      const existed = store.delete(keyOf(filter.email, filter.purpose));
      return { deletedCount: existed ? 1 : 0 };
    })
  }
}));

vi.mock("../src/infrastructure/mailer/mailer.service", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../src/infrastructure/mailer/mailer.service")>();
  return { ...actual, sendMail: vi.fn() };
});

import { sendMail } from "../src/infrastructure/mailer/mailer.service";

const sendMailMock = sendMail as unknown as ReturnType<typeof vi.fn>;

function expectedHash(email: string, purpose: OtpPurpose, code: string): string {
  return crypto.createHash("sha256").update(`${email}:${purpose}:${code}`).digest("hex");
}

const EMAIL = "otp-test@example.com";

beforeEach(() => {
  store.clear();
  sendMailMock.mockReset();
});

describe("issueOtp", () => {
  it("creates a 6-digit code and reports delivery when SMTP works", async () => {
    sendMailMock.mockResolvedValue({ delivered: true });

    const result = await issueOtp(EMAIL, "register");

    expect(result).toEqual({ delivered: true });
    const doc = store.get(keyOf(EMAIL, "register"))!;
    expect(doc).toBeDefined();
    expect(doc.attempts).toBe(0);
    expect(doc.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(doc.lastSentAt.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("returns the raw code as devCode when SMTP is not configured", async () => {
    sendMailMock.mockImplementation(async (options: { text: string }) => ({
      delivered: false,
      devOtp: options.text.match(/\b(\d{6})\b/)?.[1]
    }));

    const result = await issueOtp(EMAIL, "register");

    expect(result.delivered).toBe(false);
    expect(result.devCode).toMatch(/^\d{6}$/);

    // the stored hash must correspond to the code that was actually generated
    const doc = store.get(keyOf(EMAIL, "register"))!;
    const sentCode = sendMailMock.mock.calls[0][0].text.match(/\b(\d{6})\b/)[1] as string;
    expect(sentCode).toBe(result.devCode);
    expect(doc.codeHash).toBe(expectedHash(EMAIL, "register", sentCode));
  });

  it("enforces the resend cooldown with a 429 including remaining seconds", async () => {
    const doc: FakeDoc = {
      _id: "id-1",
      email: EMAIL,
      purpose: "register",
      codeHash: "x",
      attempts: 0,
      expiresAt: new Date(Date.now() + 600_000),
      lastSentAt: new Date(Date.now() - 10_000) // 10s ago < 60s cooldown
    };
    store.set(keyOf(EMAIL, "register"), doc);

    await expect(issueOtp(EMAIL, "register")).rejects.toMatchObject({
      statusCode: 429,
      message: expect.stringMatching(/please wait \d+s/i)
    });

    // no new code was generated
    expect(store.get(keyOf(EMAIL, "register"))!._id).toBe("id-1");
  });

  it("allows resending once the cooldown has elapsed (invalidates old code)", async () => {
    const doc: FakeDoc = {
      _id: "id-old",
      email: EMAIL,
      purpose: "password_reset",
      codeHash: "old-hash",
      attempts: 3,
      expiresAt: new Date(Date.now() + 60_000),
      lastSentAt: new Date(Date.now() - 120_000) // > 60s ago
    };
    store.set(keyOf(EMAIL, "password_reset"), doc);
    sendMailMock.mockResolvedValue({ delivered: true });

    await expect(issueOtp(EMAIL, "password_reset")).resolves.toEqual({ delivered: true });

    const updated = store.get(keyOf(EMAIL, "password_reset"))!;
    expect(updated._id).toBe("id-old"); // same record upserted...
    expect(updated.attempts).toBe(0); // ...but reset
    expect(updated.codeHash).not.toBe("old-hash");
  });

  it("wraps SMTP failures in a 500 ApiError", async () => {
    sendMailMock.mockRejectedValue(new Error("connection refused"));

    await expect(issueOtp(EMAIL, "register")).rejects.toMatchObject({
      statusCode: 500,
      message: expect.stringMatching(/could not send/i)
    });
  });
});

describe("consumeOtp", () => {
  async function seedValid(code: string, over: Partial<FakeDoc> = {}) {
    const doc: FakeDoc = {
      _id: "id-consume",
      email: EMAIL,
      purpose: "register",
      codeHash: expectedHash(EMAIL, "register", code),
      attempts: 0,
      expiresAt: new Date(Date.now() + 300_000),
      lastSentAt: new Date(),
      ...over
    };
    store.set(keyOf(EMAIL, "register"), doc);
    return doc;
  }

  it("rejects when no active code exists", async () => {
    await expect(consumeOtp(EMAIL, "register", "111111")).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringMatching(/no active code/i)
    });
  });

  it("deletes and rejects expired codes", async () => {
    await seedValid("222222", { expiresAt: new Date(Date.now() - 1000) });

    await expect(consumeOtp(EMAIL, "register", "222222")).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringMatching(/expired/i)
    });
    expect(store.has(keyOf(EMAIL, "register"))).toBe(false);
  });

  it("deletes and rejects records whose attempts are exhausted", async () => {
    await seedValid("333333", { attempts: 5 });

    await expect(consumeOtp(EMAIL, "register", "333333")).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringMatching(/too many wrong attempts/i)
    });
    expect(store.has(keyOf(EMAIL, "register"))).toBe(false);
  });

  it("counts down remaining attempts on wrong codes", async () => {
    await seedValid("444444", { attempts: 0 });

    await expect(consumeOtp(EMAIL, "register", "999999")).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringMatching(/wrong code\. 4 attempts left\./i)
    });
    expect(store.get(keyOf(EMAIL, "register"))!.attempts).toBe(1);
  });

  it("uses singular phrasing for one attempt left", async () => {
    await seedValid("555555", { attempts: 3 }); // 3+1 wrong tries -> 1 remaining

    await expect(consumeOtp(EMAIL, "register", "999999")).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringMatching(/1 attempt left\./i)
    });
  });

  it("drops the attempt-count hint once attempts hit the max", async () => {
    await seedValid("666666", { attempts: 5 - 1 }); // this wrong try reaches max

    await expect(consumeOtp(EMAIL, "register", "999999")).rejects.toMatchObject({
      statusCode: 400,
      message: /^Wrong code\.$/
    });
  });

  it("consumes (deletes) the record on success", async () => {
    await seedValid("777777");

    await expect(consumeOtp(EMAIL, "register", "777777")).resolves.toBeUndefined();
    expect(store.has(keyOf(EMAIL, "register"))).toBe(false);
  });

  it("is purpose-scoped: a register code cannot be consumed as password_reset", async () => {
    await seedValid("888888");

    await expect(consumeOtp(EMAIL, "password_reset", "888888")).rejects.toMatchObject({
      statusCode: 400,
      message: expect.stringMatching(/no active code/i)
    });
  });
});

describe("clearOtp", () => {
  it("removes any stored code for the email/purpose pair", async () => {
    store.set(keyOf(EMAIL, "password_reset"), {} as FakeDoc);
    await clearOtp(EMAIL, "password_reset");
    expect(store.has(keyOf(EMAIL, "password_reset"))).toBe(false);
  });

  it("is a no-op when nothing is stored", async () => {
    await expect(clearOtp(EMAIL, "register")).resolves.toBeUndefined();
  });
});
