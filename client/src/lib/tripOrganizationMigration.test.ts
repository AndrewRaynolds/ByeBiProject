/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearLegacyTripOrganizationStatus,
  getLegacyTripOrganizationStatusKey,
  loadLegacyTripOrganizationStatus,
} from "./tripOrganizationMigration";

describe("legacy trip organization migration", () => {
  beforeEach(() => localStorage.clear());

  it("loads the old local checklist only when it matches the strict contract", () => {
    const key = getLegacyTripOrganizationStatusKey(12);
    localStorage.setItem(key, JSON.stringify({
      flight: "done",
      hotel: "pending",
      activities: "done",
    }));

    expect(loadLegacyTripOrganizationStatus(12)).toEqual({
      flight: "done",
      hotel: "pending",
      activities: "done",
    });
  });

  it("discards corrupt or obsolete local values", () => {
    const key = getLegacyTripOrganizationStatusKey(12);
    localStorage.setItem(key, JSON.stringify({
      flight: "booked",
      hotel: "pending",
      activities: "done",
    }));

    expect(loadLegacyTripOrganizationStatus(12)).toBeNull();
    expect(localStorage.getItem(key)).toBeNull();
  });

  it("clears the retired key after server persistence", () => {
    const key = getLegacyTripOrganizationStatusKey(12);
    localStorage.setItem(key, "{}");

    clearLegacyTripOrganizationStatus(12);

    expect(localStorage.getItem(key)).toBeNull();
  });
});
