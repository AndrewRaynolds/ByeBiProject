/** @vitest-environment jsdom */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import { ProtectedRoute } from "./protected-route";

const authState = vi.hoisted(() => ({
  user: null as null | { id: string },
  isLoading: false,
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => authState,
}));

function ProtectedContent() {
  return <p>Protected content</p>;
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    authState.user = null;
    authState.isLoading = false;
  });

  it("preserves the requested protected route through authentication", () => {
    const location = memoryLocation({
      path: "/trips/42?tab=expenses",
      record: true,
    });

    render(
      <Router hook={location.hook}>
        <ProtectedRoute path="/trips/:id" component={ProtectedContent} />
      </Router>,
    );

    expect(location.history.at(-1)).toBe(
      "/auth?next=%2Ftrips%2F42%3Ftab%3Dexpenses",
    );
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("renders the protected page when the user is authenticated", () => {
    authState.user = { id: "user-a" };
    const location = memoryLocation({ path: "/trips/42", record: true });

    render(
      <Router hook={location.hook}>
        <ProtectedRoute path="/trips/:id" component={ProtectedContent} />
      </Router>,
    );

    expect(screen.getByText("Protected content")).toBeInTheDocument();
    expect(location.history.at(-1)).toBe("/trips/42");
  });
});
