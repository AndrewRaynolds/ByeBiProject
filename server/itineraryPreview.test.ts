import { describe, expect, it } from "vitest";
import { buildItineraryPreview } from "./itineraryPreview";

describe("buildItineraryPreview", () => {
  it("builds a non-persistent preview for the public Zapier flow", () => {
    const preview = buildItineraryPreview({
      city: "Roma",
      startDate: "2026-08-10",
      endDate: "2026-08-13",
      people: 4,
      interests: ["food"],
      budget: "medio",
      content: "Anteprima generata",
    });

    expect(preview).toMatchObject({
      name: "Addio al Celibato a Roma",
      duration: "3 giorni",
      price: 499,
      description: "Anteprima generata",
    });
    expect(preview).not.toHaveProperty("id");
    expect(preview).not.toHaveProperty("tripId");
    expect(preview).not.toHaveProperty("createdAt");
  });
});
