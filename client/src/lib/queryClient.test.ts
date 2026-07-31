/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
}));

import {
  ApiError,
  ApiTimeoutError,
  apiRequest,
  fetchWithTimeout,
  shouldRetryQuery,
} from "./queryClient";

describe("API client", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("aborts requests that exceed their timeout", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
      ),
    );

    const request = fetchWithTimeout("/api/slow", {}, 50);
    const assertion = expect(request).rejects.toEqual(
      expect.objectContaining({ name: "ApiTimeoutError", timeoutMs: 50 }),
    );

    await vi.advanceTimersByTimeAsync(50);
    await assertion;
  });

  it("returns a structured API error from JSON responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Operazione non consentita" }), {
          status: 403,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    await expect(apiRequest("GET", "/api/private")).rejects.toEqual(
      expect.objectContaining<ApiError>({
        name: "ApiError",
        status: 403,
        message: "Operazione non consentita",
      }),
    );
  });

  it("does not expose an HTML error document to the interface", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<html>internal proxy details</html>", {
          status: 502,
          statusText: "Bad Gateway",
          headers: { "content-type": "text/html" },
        }),
      ),
    );

    await expect(apiRequest("GET", "/api/failing")).rejects.toEqual(
      expect.objectContaining({ message: "Bad Gateway", status: 502 }),
    );
  });
});

describe("query retry policy", () => {
  it("retries transient errors at most twice", () => {
    expect(shouldRetryQuery(0, new ApiTimeoutError(100))).toBe(true);
    expect(shouldRetryQuery(1, new ApiError(503, "Unavailable"))).toBe(true);
    expect(shouldRetryQuery(2, new ApiError(503, "Unavailable"))).toBe(false);
  });

  it("does not retry client or cancellation errors", () => {
    expect(shouldRetryQuery(0, new ApiError(404, "Not found"))).toBe(false);
    expect(
      shouldRetryQuery(0, new DOMException("Aborted", "AbortError")),
    ).toBe(false);
  });
});
