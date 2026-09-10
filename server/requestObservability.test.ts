import { beforeEach, describe, expect, it, vi } from "vitest";
import { log } from "./vite";
import { requestObservability } from "./requestObservability";

vi.mock("./vite", () => ({ log: vi.fn() }));

describe("request observability", () => {
  beforeEach(() => vi.clearAllMocks());

  it("adds a request id header and correlates the API completion log", () => {
    let finish: (() => void) | undefined;
    const req = {
      method: "GET",
      path: "/api/health",
    } as any;
    const res = {
      statusCode: 200,
      setHeader: vi.fn(),
      once: vi.fn((event: string, callback: () => void) => {
        if (event === "finish") finish = callback;
      }),
    } as any;
    const next = vi.fn();

    requestObservability(req, res, next);

    expect(req.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(res.setHeader).toHaveBeenCalledWith("X-Request-Id", req.requestId);
    expect(next).toHaveBeenCalledOnce();

    finish?.();
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining(`GET /api/health 200`),
    );
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining(`request_id=${req.requestId}`),
    );
  });

  it("does not register completion logging for static files", () => {
    const req = { method: "GET", path: "/assets/app.js" } as any;
    const res = { setHeader: vi.fn(), once: vi.fn() } as any;

    requestObservability(req, res, vi.fn());

    expect(res.setHeader).toHaveBeenCalledOnce();
    expect(res.once).not.toHaveBeenCalled();
  });
});
