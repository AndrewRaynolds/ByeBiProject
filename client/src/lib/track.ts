import { debugLog } from "./debug";
import type {
  AffiliatePlacement,
  AffiliateProvider,
  ProductEventName,
} from "@shared/analyticsSchemas";

export function trackEvent(name: string, payload: Record<string, unknown>) {
  debugLog("[track]", name, payload);
}

type AffiliateClick = {
  provider: AffiliateProvider;
  placement: AffiliatePlacement;
  destination?: string;
  monetized: boolean;
};

function createPageSessionId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}

const SESSION_ID_KEY = "byebi.analytics.sessionId";
const fallbackSessionId = createPageSessionId();

function getAnonymousSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_ID_KEY);
    if (existing) return existing;
    sessionStorage.setItem(SESSION_ID_KEY, fallbackSessionId);
  } catch {
    // Storage can be unavailable in privacy-restricted browsers.
  }
  return fallbackSessionId;
}

function getBrand(): "byebro" | "byebride" {
  return localStorage.getItem("selectedBrand") === "byebride" ? "byebride" : "byebro";
}

export function trackProductEvent(
  eventName: ProductEventName,
  options: { dedupe?: boolean } = {},
): void {
  const sessionId = getAnonymousSessionId();
  const dedupeKey = `byebi.analytics.sent.${eventName}`;
  if (options.dedupe !== false) {
    try {
      if (sessionStorage.getItem(dedupeKey) === sessionId) return;
      sessionStorage.setItem(dedupeKey, sessionId);
    } catch {
      // Tracking remains best-effort when storage is unavailable.
    }
  }

  void fetch("/api/analytics/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, eventName, brand: getBrand() }),
    keepalive: true,
  }).catch(() => {
    // Analytics must never alter the product flow.
  });
}

export function trackAffiliateClick(click: AffiliateClick): void {
  void fetch("/api/analytics/affiliate-clicks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: getAnonymousSessionId(),
      brand: getBrand(),
      ...click,
    }),
    keepalive: true,
  }).catch(() => {
    // Analytics must never block navigation to an affiliate provider.
  });
}
