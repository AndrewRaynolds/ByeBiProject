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

export const defaultTripOrganizationStatus = {
  flight: "pending",
  hotel: "pending",
  activities: "pending",
} as const satisfies z.infer<typeof tripOrganizationStatusSchema>;

export type TripOrganizationKind = keyof typeof defaultTripOrganizationStatus;
export type TripOrganizationStatus = z.infer<typeof tripOrganizationStatusSchema>;
export type TripOrganizationStatusResponse = z.infer<typeof tripOrganizationStatusResponseSchema>;
