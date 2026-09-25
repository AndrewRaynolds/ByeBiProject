/**
 * @vitest-environment jsdom
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OptimizedImage from "./optimized-image";

let intersectionCallback: IntersectionObserverCallback;

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: IntersectionObserverCallback) {
      intersectionCallback = callback;
    }
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    takeRecords = vi.fn(() => []);
    root = null;
    rootMargin = "";
    thresholds = [];
  });
});

describe("OptimizedImage lazy loading", () => {
  it("does not render the fallback as the image before it intersects", () => {
    render(<OptimizedImage src="https://images.unsplash.com/photo.jpg" alt="Destination" />);

    expect(screen.getByRole("img", { name: "Destination" })).not.toHaveAttribute("src");
  });

  it("loads the optimized source on intersection and uses the fallback only on error", () => {
    render(<OptimizedImage src="https://images.unsplash.com/photo.jpg" alt="Destination" width={400} height={300} />);
    const image = screen.getByRole("img", { name: "Destination" });

    act(() => {
      intersectionCallback([{ isIntersecting: true, target: image } as unknown as IntersectionObserverEntry], {} as IntersectionObserver);
    });

    expect(image).toHaveAttribute("src", "https://images.unsplash.com/photo.jpg?w=400&h=300&auto=format&q=80&fit=crop");

    fireEvent.error(image);
    expect(image.getAttribute("src")).toContain("data:image/svg+xml");
  });
});
