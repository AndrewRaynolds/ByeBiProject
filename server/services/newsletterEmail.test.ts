import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { storageMock } = vi.hoisted(() => ({
  storageMock: {
    getNewsletterSubscriberByEmail: vi.fn(),
    upsertNewsletterSubscriber: vi.fn(),
    confirmNewsletterSubscriber: vi.fn(),
    unsubscribeNewsletterSubscriber: vi.fn(),
  },
}));

vi.mock("../storage", () => ({ storage: storageMock }));

import {
  confirmNewsletterSubscription,
  getNewsletterDeliveryStatus,
  requestNewsletterSubscription,
} from "./newsletterEmail";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEWSLETTER_EMAIL_MODE = "live";
  process.env.RESEND_API_KEY = "re_test";
  process.env.NEWSLETTER_EMAIL_FROM = "ByeBi <newsletter@updates.example.com>";
  process.env.APP_BASE_URL = "https://byebi.it";
  storageMock.getNewsletterSubscriberByEmail.mockResolvedValue(undefined);
  storageMock.upsertNewsletterSubscriber.mockResolvedValue({ status: "pending" });
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.NEWSLETTER_EMAIL_MODE;
  delete process.env.RESEND_API_KEY;
  delete process.env.NEWSLETTER_EMAIL_FROM;
  delete process.env.APP_BASE_URL;
});

describe("newsletter double opt-in", () => {
  it("stores only a token hash and sends a confirmation link", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ id: "email_newsletter_1" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ));
    vi.stubGlobal("fetch", fetchMock);

    await requestNewsletterSubscription({
      email: " Person@Example.com ",
      brand: "byebride",
      locale: "it",
    });

    const stored = storageMock.upsertNewsletterSubscriber.mock.calls[0][0];
    expect(stored.email).toBe("person@example.com");
    expect(stored.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload.to).toEqual(["person@example.com"]);
    expect(payload.text).toContain("https://byebi.it/api/newsletter/confirm?token=");
    expect(payload.text).not.toContain(stored.tokenHash);
  });

  it("confirms by hashing the public token", async () => {
    storageMock.confirmNewsletterSubscriber.mockResolvedValue(true);
    const token = "a".repeat(43);

    await expect(confirmNewsletterSubscription(token)).resolves.toBe(true);
    expect(storageMock.confirmNewsletterSubscriber).toHaveBeenCalledWith(
      expect.stringMatching(/^[a-f0-9]{64}$/),
      expect.any(Date),
    );
  });

  it("does not resend to an already confirmed subscriber", async () => {
    storageMock.getNewsletterSubscriberByEmail.mockResolvedValue({ status: "confirmed" });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await requestNewsletterSubscription({
      email: "person@example.com",
      brand: "byebro",
      locale: "en",
    });

    expect(storageMock.upsertNewsletterSubscriber).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports provider configuration without exposing credentials", () => {
    expect(getNewsletterDeliveryStatus()).toBe("configured");
    delete process.env.RESEND_API_KEY;
    expect(getNewsletterDeliveryStatus()).toBe("misconfigured");
  });
});
