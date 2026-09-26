import { describe, expect, it } from "vitest";
import {
  countCompletedTripOrganizationItems,
  defaultTripOrganizationStatus,
  tripOrganizationOverviewResponseSchema,
  tripOrganizationStatusResponseSchema,
  tripOrganizationStatusSchema,
} from "./tripOrganizationSchemas";

describe("trip organization schemas", () => {
  it("uses pending as the neutral unsaved default", () => {
    expect(defaultTripOrganizationStatus).toEqual({
      flight: "pending",
      hotel: "pending",
      activities: "pending",
    });
  });

  it("accepts only the three manual organization fields", () => {
    expect(tripOrganizationStatusSchema.safeParse({
      flight: "done",
      hotel: "pending",
      activities: "done",
    }).success).toBe(true);

    expect(tripOrganizationStatusSchema.safeParse({
      flight: "booked",
      hotel: "pending",
      activities: "done",
    }).success).toBe(false);

    expect(tripOrganizationStatusSchema.safeParse({
      flight: "done",
      hotel: "pending",
      activities: "done",
      providerBookingId: "external-id",
    }).success).toBe(false);
  });

  it("counts completed manual organization items without inferring booking state", () => {
    expect(countCompletedTripOrganizationItems({
      flight: "done",
      hotel: "pending",
      activities: "done",
    })).toBe(2);
    expect(countCompletedTripOrganizationItems(defaultTripOrganizationStatus)).toBe(0);
  });

  it("validates the dashboard overview contract", () => {
    expect(tripOrganizationOverviewResponseSchema.safeParse([
      {
        tripId: 12,
        status: { flight: "done", hotel: "pending", activities: "done" },
        persisted: true,
      },
      {
        tripId: 13,
        status: defaultTripOrganizationStatus,
        persisted: false,
      },
    ]).success).toBe(true);
  });

  it("distinguishes a server default from persisted user state", () => {
    expect(tripOrganizationStatusResponseSchema.safeParse({
      status: defaultTripOrganizationStatus,
      persisted: false,
    }).success).toBe(true);
  });
});
