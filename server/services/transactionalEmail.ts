import { z } from "zod";
import {
  merchandiseNotificationTypes,
  type MerchandiseNotificationType,
  type MerchandiseOrder,
} from "@shared/schema";
import { storage } from "../storage";
import { getSafeErrorMetadata } from "../safeError";

const emailSchema = z.string().trim().email().max(320);
const resendResponseSchema = z.object({ id: z.string().min(1).max(200) });

type EmailDeliveryMode = "disabled" | "test" | "live";
type EmailContent = { subject: string; text: string; html: string };

let drainInProgress = false;
let workerTimer: NodeJS.Timeout | undefined;

function getDeliveryMode(): EmailDeliveryMode {
  const mode = process.env.TRANSACTIONAL_EMAIL_MODE || "disabled";
  return mode === "test" || mode === "live" ? mode : "disabled";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMoney(order: MerchandiseOrder): string {
  try {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: order.currency,
    }).format(order.amountTotal / 100);
  } catch {
    return `${(order.amountTotal / 100).toFixed(2)} ${order.currency}`;
  }
}

function orderSummary(order: MerchandiseOrder): string {
  return order.items
    .map((item) => `${item.quantity} × ${item.productName} — ${item.variantName}`)
    .join("\n");
}

export function buildMerchandiseEmail(
  order: MerchandiseOrder,
  type: MerchandiseNotificationType,
): EmailContent {
  const shortId = order.id.slice(0, 8).toUpperCase();
  const dashboardUrl = `${(process.env.APP_BASE_URL || "https://byebi.it").replace(/\/+$/, "")}/dashboard`;
  const summary = orderSummary(order);
  const total = formatMoney(order);
  const trackingLine = order.trackingUrl
    ? `Segui la spedizione: ${order.trackingUrl}`
    : order.trackingNumber
      ? `Codice tracking: ${order.trackingNumber}`
      : "";

  const messages: Record<MerchandiseNotificationType, { subject: string; lead: string; detail: string }> = {
    payment_confirmed: {
      subject: `Pagamento confermato — ordine ${shortId}`,
      lead: "Abbiamo ricevuto correttamente il tuo pagamento.",
      detail: "Stiamo preparando l'ordine per la produzione.",
    },
    order_submitted: {
      subject: `Ordine ${shortId} ricevuto`,
      lead: "Il tuo ordine è stato trasmesso al nostro partner Printful.",
      detail: "Riceverai un nuovo aggiornamento quando entrerà nelle fasi successive o sarà affidato al corriere.",
    },
    order_shipped: {
      subject: `Il tuo ordine ${shortId} è stato spedito`,
      lead: "Il merchandise è in viaggio.",
      detail: trackingLine || "I dettagli di tracciamento saranno disponibili appena comunicati dal corriere.",
    },
    order_attention: {
      subject: `Aggiornamento importante sull'ordine ${shortId}`,
      lead: "Il tuo ordine richiede una verifica da parte del nostro team.",
      detail: "Non devi effettuare un nuovo pagamento. Ti contatteremo se saranno necessarie altre informazioni.",
    },
    order_refunded: {
      subject: `Rimborso avviato — ordine ${shortId}`,
      lead: "Il rimborso del tuo ordine è stato avviato sul metodo di pagamento originale.",
      detail: "I tempi di accredito dipendono dalla banca o dal circuito di pagamento.",
    },
  };
  const message = messages[type];
  const text = [
    message.lead,
    message.detail,
    "",
    `Ordine: ${shortId}`,
    summary,
    `Totale: ${total}`,
    "",
    `Consulta i tuoi ordini: ${dashboardUrl}`,
  ].filter(Boolean).join("\n");

  const htmlItems = order.items
    .map((item) => `<li>${item.quantity} × ${escapeHtml(item.productName)} — ${escapeHtml(item.variantName)}</li>`)
    .join("");
  const detailHtml = order.trackingUrl && type === "order_shipped"
    ? `<a href="${escapeHtml(order.trackingUrl)}">Segui la spedizione</a>`
    : escapeHtml(message.detail);

  return {
    subject: message.subject,
    text,
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6"><main style="max-width:600px;margin:auto;padding:24px"><h1 style="font-size:24px">${escapeHtml(message.subject)}</h1><p>${escapeHtml(message.lead)}</p><p>${detailHtml}</p><h2 style="font-size:18px">Ordine ${shortId}</h2><ul>${htmlItems}</ul><p><strong>Totale: ${escapeHtml(total)}</strong></p><p><a href="${escapeHtml(dashboardUrl)}">Consulta i tuoi ordini</a></p><hr><p style="font-size:12px;color:#6b7280">Email transazionale relativa al tuo acquisto su ByeBi.</p></main></body></html>`,
  };
}

function configuredRecipient(order: MerchandiseOrder): string | undefined {
  const mode = getDeliveryMode();
  const candidate = mode === "test"
    ? process.env.TRANSACTIONAL_EMAIL_TEST_RECIPIENT
    : order.customerEmail;
  const parsed = emailSchema.safeParse(candidate);
  return parsed.success ? parsed.data : undefined;
}

function hasProviderConfiguration(): boolean {
  return Boolean(
    getDeliveryMode() !== "disabled" &&
    process.env.RESEND_API_KEY?.trim() &&
    process.env.TRANSACTIONAL_EMAIL_FROM?.trim(),
  );
}

async function sendWithResend(
  order: MerchandiseOrder,
  type: MerchandiseNotificationType,
  recipient: string,
): Promise<string> {
  const content = buildMerchandiseEmail(order, type);
  const mode = getDeliveryMode();
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `byebi/${type}/${order.id}`,
      "User-Agent": "ByeBi/1.0",
    },
    body: JSON.stringify({
      from: process.env.TRANSACTIONAL_EMAIL_FROM,
      to: [recipient],
      subject: mode === "test"
        ? `[TEST per ${order.customerEmail || "cliente senza email"}] ${content.subject}`
        : content.subject,
      text: content.text,
      html: content.html,
      ...(process.env.TRANSACTIONAL_EMAIL_REPLY_TO
        ? { reply_to: process.env.TRANSACTIONAL_EMAIL_REPLY_TO }
        : {}),
    }),
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) {
    throw new Error(`Resend rejected the email with status ${response.status}`);
  }
  return resendResponseSchema.parse(await response.json()).id;
}

export async function queueMerchandiseNotification(
  orderId: string,
  type: MerchandiseNotificationType,
): Promise<void> {
  try {
    if (!merchandiseNotificationTypes.includes(type) || !hasProviderConfiguration()) return;
    const order = await storage.getMerchandiseOrderById(orderId);
    if (!order || !configuredRecipient(order)) return;
    await storage.enqueueMerchandiseNotification(orderId, type);
    void drainMerchandiseNotifications().catch((error) =>
      console.error("Transactional email worker failed", getSafeErrorMetadata(error)),
    );
  } catch (error) {
    console.error("Transactional email could not be queued", getSafeErrorMetadata(error));
  }
}

export async function drainMerchandiseNotifications(): Promise<void> {
  if (drainInProgress || !hasProviderConfiguration()) return;
  drainInProgress = true;
  try {
    const staleBefore = new Date(Date.now() - 5 * 60_000);
    const notifications = await storage.getRetryableMerchandiseNotifications(staleBefore, 20);
    for (const notification of notifications) {
      if (!await storage.claimMerchandiseNotification(notification.id, staleBefore)) continue;
      try {
        const order = await storage.getMerchandiseOrderById(notification.orderId);
        const recipient = order && configuredRecipient(order);
        if (!order || !recipient) {
          throw new Error("Order recipient is unavailable");
        }
        const providerMessageId = await sendWithResend(order, notification.type, recipient);
        await storage.completeMerchandiseNotification(notification.id, {
          status: "sent",
          providerMessageId,
        });
      } catch (error) {
        await storage.completeMerchandiseNotification(notification.id, {
          status: "failed",
          lastError: error instanceof Error ? error.message : "Email delivery failed",
        });
        console.error("Transactional email delivery failed", getSafeErrorMetadata(error));
      }
    }
  } finally {
    drainInProgress = false;
  }
}

export function startTransactionalEmailWorker(): () => void {
  if (!hasProviderConfiguration() || workerTimer) return () => undefined;
  const runWorker = () => void drainMerchandiseNotifications().catch((error) =>
    console.error("Transactional email worker failed", getSafeErrorMetadata(error)),
  );
  runWorker();
  workerTimer = setInterval(runWorker, 60_000);
  workerTimer.unref();
  return () => {
    if (workerTimer) clearInterval(workerTimer);
    workerTimer = undefined;
  };
}
