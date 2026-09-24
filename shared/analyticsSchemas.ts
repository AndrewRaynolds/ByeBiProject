import { z } from "zod";

export const affiliateClickEventSchema = z
  .object({
    sessionId: z.string().uuid(),
    provider: z.enum(["aviasales", "booking", "getyourguide"]),
    placement: z.enum([
      "checkout_flight",
      "checkout_hotel",
      "checkout_hotel_fallback",
      "checkout_experiences",
      "destinations",
      "experiences",
      "itinerary",
    ]),
    brand: z.enum(["byebro", "byebride"]),
    destination: z.string().trim().min(1).max(100).optional(),
    monetized: z.boolean(),
  })
  .strict();

export type AffiliateClickEvent = z.infer<typeof affiliateClickEventSchema>;
export type AffiliateProvider = AffiliateClickEvent["provider"];
export type AffiliatePlacement = AffiliateClickEvent["placement"];

export const affiliateSummaryRowSchema = z.object({
  key: z.string(),
  total: z.number().int().nonnegative(),
  monetized: z.number().int().nonnegative(),
});

export const affiliateClickSummarySchema = z.object({
  days: z.number().int().min(1).max(365),
  totalClicks: z.number().int().nonnegative(),
  monetizedClicks: z.number().int().nonnegative(),
  providers: z.array(affiliateSummaryRowSchema),
  placements: z.array(affiliateSummaryRowSchema),
});

export type AffiliateClickSummary = z.infer<typeof affiliateClickSummarySchema>;

export const productEventNames = [
  "home_view",
  "chat_started",
  "trip_plan_completed",
  "checkout_viewed",
  "auth_started",
  "signup_completed",
  "trip_saved",
  "trip_hub_viewed",
  "splitta_opened",
] as const;

export const productEventNameSchema = z.enum(productEventNames);

export const productEventSchema = z
  .object({
    sessionId: z.string().uuid(),
    eventName: productEventNameSchema,
    brand: z.enum(["byebro", "byebride"]),
  })
  .strict();

export type ProductEvent = z.infer<typeof productEventSchema>;
export type ProductEventName = ProductEvent["eventName"];

export const productFunnelStepSchema = z.object({
  eventName: z.enum([...productEventNames, "provider_click"]),
  count: z.number().int().nonnegative(),
  previousStepRate: z.number().nonnegative().nullable(),
});

export const productAnalyticsSummarySchema = z.object({
  days: z.union([z.literal(7), z.literal(30)]),
  funnel: z.array(productFunnelStepSchema),
  providers: z.array(affiliateSummaryRowSchema),
});

export type ProductAnalyticsSummary = z.infer<typeof productAnalyticsSummarySchema>;
