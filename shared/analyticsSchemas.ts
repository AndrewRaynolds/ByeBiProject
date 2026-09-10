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
