import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "../src/config/env";
import {
  otpEmailTemplate,
  sendMail,
  type MailOptions
} from "../src/infrastructure/mailer/mailer.service";

/* nodemailer mock — transporter behavior is swappable per-test via ref */
const { sendMailRef } = vi.hoisted(() => ({
  sendMailRef: { current: null as ((opts: Record<string, unknown>) => Promise<unknown>) | null }
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: (opts: Record<string, unknown>) =>
        sendMailRef.current
          ? sendMailRef.current(opts)
          : Promise.resolve({ messageId: "<default@test>" })
    }))
  }
}));

const mutableEnv = env as unknown as {
  smtpHost: string;
  smtpUser: string;
  smtpPass: string;
};
const original = {
  smtpHost: env.smtpHost,
  smtpUser: env.smtpUser,
  smtpPass: env.smtpPass
};

function setSmtp(host: string) {
  mutableEnv.smtpHost = host;
  mutableEnv.smtpUser = host ? "user" : "";
  mutableEnv.smtpPass = host ? "pass" : "";
}

beforeEach(() => {
  sendMailRef.current = null;
});

afterEach(() => {
  mutableEnv.smtpHost = original.smtpHost;
  mutableEnv.smtpUser = original.smtpUser;
  mutableEnv.smtpPass = original.smtpPass;
});

describe("sendMail (dev fallback mode — SMTP unconfigured)", () => {
  it("does not deliver and surfaces the OTP as devOtp", async () => {
    setSmtp("");
    const options: MailOptions = {
      to: "dev@example.com",
      subject: "Verify",
      text: "Your code is: 482913"
    };

    const result = await sendMail(options);

    expect(result.delivered).toBe(false);
    expect(result.devOtp).toBe("482913");
  });

  it("returns undefined devOtp when the text contains no 6-digit code", async () => {
    setSmtp("");
    const result = await sendMail({ to: "x@y.z", subject: "s", text: "no codes here" });
    expect(result.devOtp).toBeUndefined();
  });

  it("extracts the first standalone 6-digit group only", async () => {
    setSmtp("");
    const result = await sendMail({
      to: "x@y.z",
      subject: "s",
      text: "Order #1234567 shipped. Your code is 901234."
    });
    expect(result.devOtp).toBe("901234");
  });
});

describe("sendMail (SMTP configured)", () => {
  it("delivers via the transporter with the configured from address", async () => {
    const seen: Array<Record<string, unknown>> = [];
    sendMailRef.current = async (opts) => {
      seen.push(opts);
      return { messageId: "<test@test>" };
    };
    setSmtp("smtp.test.server");

    const result = await sendMail({ to: "rcpt@example.com", subject: "Hi", text: "body" });

    expect(result).toEqual({ delivered: true });
    expect(seen).toHaveLength(1);
    expect(seen[0].to).toBe("rcpt@example.com");
    expect(seen[0].from).toBe(env.mailFrom);
  });

  it("propagates transporter failures after logging them", async () => {
    sendMailRef.current = async () => {
      throw new Error("relay denied");
    };
    setSmtp("smtp.test.server");

    await expect(sendMail({ to: "r@x.y", subject: "s", text: "t" })).rejects.toThrow(
      /relay denied/i
    );
  });
});

describe("otpEmailTemplate", () => {
  it("uses a registration subject for register purpose", () => {
    const tpl = otpEmailTemplate("135790", "register");
    expect(tpl.subject).toMatch(/verify your software world account/i);
    expect(tpl.text).toContain("135790");
    expect(tpl.text).toContain("10 minutes");
    expect(tpl.html).toContain("135790");
  });

  it("uses a reset subject for password_reset purpose", () => {
    const tpl = otpEmailTemplate("246810", "password_reset");
    expect(tpl.subject).toMatch(/reset your software world password/i);
    expect(tpl.html).toContain("246810");
  });
});
