import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { storage } from "../storage";

const subscriptionSchema = z.object({
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  brand: z.enum(["byebro", "byebride"]),
  locale: z.enum(["it", "en", "es"]),
});
const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{40,100}$/);
const resendResponseSchema = z.object({ id: z.string().min(1).max(200) });

export type NewsletterDeliveryStatus = "disabled" | "configured" | "misconfigured";

export function getNewsletterDeliveryStatus(): NewsletterDeliveryStatus {
  const mode = process.env.NEWSLETTER_EMAIL_MODE || "disabled";
  if (mode === "disabled") return "disabled";
  return process.env.RESEND_API_KEY?.trim() && process.env.NEWSLETTER_EMAIL_FROM?.trim()
    ? "configured"
    : "misconfigured";
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function copy(locale: "it" | "en" | "es", brand: "byebro" | "byebride") {
  const name = brand === "byebride" ? "ByeBride" : "ByeBro";
  return {
    it: {
      subject: `Conferma l'iscrizione alla newsletter ${name}`,
      lead: "Conferma il tuo indirizzo email per completare l'iscrizione.",
      cta: "Conferma iscrizione",
      ignore: "Se non hai richiesto tu l'iscrizione, puoi ignorare questa email.",
    },
    en: {
      subject: `Confirm your ${name} newsletter subscription`,
      lead: "Confirm your email address to complete your subscription.",
      cta: "Confirm subscription",
      ignore: "If you did not request this subscription, you can ignore this email.",
    },
    es: {
      subject: `Confirma tu suscripción al boletín de ${name}`,
      lead: "Confirma tu dirección de email para completar la suscripción.",
      cta: "Confirmar suscripción",
      ignore: "Si no solicitaste esta suscripción, puedes ignorar este email.",
    },
  }[locale];
}

async function sendConfirmationEmail(input: {
  email: string;
  brand: "byebro" | "byebride";
  locale: "it" | "en" | "es";
  token: string;
}): Promise<void> {
  if (getNewsletterDeliveryStatus() !== "configured") {
    throw new Error("Newsletter email delivery is unavailable");
  }
  const baseUrl = (process.env.APP_BASE_URL || "https://byebi.it").replace(/\/+$/, "");
  const confirmUrl = `${baseUrl}/api/newsletter/confirm?token=${encodeURIComponent(input.token)}`;
  const message = copy(input.locale, input.brand);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `byebi/newsletter/${tokenHash(input.token)}`,
      "User-Agent": "ByeBi/1.0",
    },
    body: JSON.stringify({
      from: process.env.NEWSLETTER_EMAIL_FROM,
      to: [input.email],
      subject: message.subject,
      text: `${message.lead}\n\n${confirmUrl}\n\n${message.ignore}`,
      html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6"><main style="max-width:600px;margin:auto;padding:24px"><h1 style="font-size:24px">${message.subject}</h1><p>${message.lead}</p><p><a href="${confirmUrl}" style="display:inline-block;padding:12px 18px;background:#db2777;color:#fff;text-decoration:none;border-radius:8px">${message.cta}</a></p><p style="font-size:12px;color:#6b7280">${message.ignore}</p></main></body></html>`,
    }),
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error(`Resend rejected newsletter email with status ${response.status}`);
  resendResponseSchema.parse(await response.json());
}

export async function requestNewsletterSubscription(input: unknown): Promise<void> {
  const parsed = subscriptionSchema.parse(input);
  const existing = await storage.getNewsletterSubscriberByEmail(parsed.email);
  if (existing?.status === "confirmed") return;

  const token = randomBytes(32).toString("base64url");
  await storage.upsertNewsletterSubscriber({
    ...parsed,
    tokenHash: tokenHash(token),
    tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
  await sendConfirmationEmail({ ...parsed, token });
}

export async function confirmNewsletterSubscription(rawToken: unknown): Promise<boolean> {
  const token = tokenSchema.safeParse(rawToken);
  if (!token.success) return false;
  return storage.confirmNewsletterSubscriber(tokenHash(token.data), new Date());
}

export async function unsubscribeNewsletterSubscription(rawToken: unknown): Promise<boolean> {
  const token = tokenSchema.safeParse(rawToken);
  if (!token.success) return false;
  return storage.unsubscribeNewsletterSubscriber(tokenHash(token.data));
}
