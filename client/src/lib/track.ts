import { debugLog } from "./debug";
import type {
  AffiliatePlacement,
  AffiliateProvider,
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

const pageSessionId = createPageSessionId();

export function trackAffiliateClick(click: AffiliateClick): void {
  const selectedBrand = localStorage.getItem("selectedBrand");
  const brand = selectedBrand === "byebride" ? "byebride" : "byebro";

  void fetch("/api/analytics/affiliate-clicks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: pageSessionId,
      brand,
      ...click,
    }),
    keepalive: true,
  }).catch(() => {
    // Analytics must never block navigation to an affiliate provider.
  });
}
