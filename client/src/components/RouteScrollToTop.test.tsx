/** @vitest-environment jsdom */
import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RouteScrollToTop from "./RouteScrollToTop";

let location = "/";
vi.mock("wouter", () => ({ useLocation: () => [location, vi.fn()] }));

describe("Phase 3 route scroll", () => {
  beforeEach(() => vi.spyOn(window, "scrollTo").mockImplementation(() => undefined));

  it.each(["/destinations", "/destinations/7", "/experiences"])("scrolls %s to the top", (path) => {
    location = path;
    render(<RouteScrollToTop />);
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: "auto" });
  });
});
