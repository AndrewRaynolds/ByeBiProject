/**
 * @vitest-environment jsdom
 */
import { Suspense } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Router as WouterRouter } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { Router } from "./BrandedApp";

vi.mock("@/pages/SharedTrip", () => ({
  default: () => <div>Shared trip page</div>,
}));
vi.mock("@/pages/TripHub", () => ({
  default: () => <div>Trip hub page</div>,
}));
vi.mock("@/hooks/use-auth", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/lib/queryClient", () => ({ queryClient: {} }));
vi.mock("@/lib/protected-route", async () => {
  const { createElement } = await import("react");
  const { Route } = await import("wouter");
  return {
    ProtectedRoute: ({ path, component }: { path: string; component: React.ComponentType }) =>
      createElement(Route, { path }, createElement(component)),
  };
});

describe("BrandedApp routing", () => {
  it("resolves a shared-trip URL to SharedTrip instead of the trip-id route", async () => {
    const location = memoryLocation({ path: "/trips/shared/public-token", static: true });

    render(
      <WouterRouter hook={location.hook}>
        <Suspense fallback={<div>Loading</div>}>
          <Router selectedBrand="byebro" />
        </Suspense>
      </WouterRouter>,
    );

    expect(await screen.findByText("Shared trip page")).toBeInTheDocument();
    expect(screen.queryByText("Trip hub page")).not.toBeInTheDocument();
  });
});
