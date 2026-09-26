import { z } from "zod";

export const tripOrganizationItemStatusSchema = z.enum(["pending", "done"]);

export const tripOrganizationStatusSchema = z.object({
  flight: tripOrganizationItemStatusSchema,
  hotel: tripOrganizationItemStatusSchema,
  activities: tripOrganizationItemStatusSchema,
}).strict();

export const tripOrganizationStatusResponseSchema = z.object({
  status: tripOrganizationStatusSchema,
  persisted: z.boolean(),
}).strict();

export const tripOrganizationOverviewItemSchema = z.object({
  tripId: z.number().int().positive(),
  status: tripOrganizationStatusSchema,
  persisted: z.boolean(),
}).strict();

export const tripOrganizationOverviewResponseSchema = z.array(
  tripOrganizationOverviewItemSchema,
);

export const defaultTripOrganizationStatus = {
  flight: "pending",
  hotel: "pending",
  activities: "pending",
} as const satisfies z.infer<typeof tripOrganizationStatusSchema>;

export type TripOrganizationKind = keyof typeof defaultTripOrganizationStatus;
export function countCompletedTripOrganizationItems(
  status: z.infer<typeof tripOrganizationStatusSchema>,
): number {
  return Object.values(status).filter((item) => item === "done").length;
}

export type TripOrganizationStatus = z.infer<typeof tripOrganizationStatusSchema>;
export type TripOrganizationStatusResponse = z.infer<typeof tripOrganizationStatusResponseSchema>;
export type TripOrganizationOverviewItem = z.infer<typeof tripOrganizationOverviewItemSchema>;
export type TripOrganizationOverviewResponse = z.infer<typeof tripOrganizationOverviewResponseSchema>;
