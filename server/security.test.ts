import { EventEmitter } from "node:events";
import { describe, expect, it, vi } from "vitest";
import { createConcurrencyLimiter } from "./security";

function createResponse() {
  const response = new EventEmitter() as EventEmitter & {
    status: ReturnType<typeof vi.fn>;
    json: ReturnType<typeof vi.fn>;
  };
  response.status = vi.fn(() => response);
  response.json = vi.fn(() => response);
  return response;
}

describe("AI concurrency limiter", () => {
  it("limits active requests and releases slots exactly once", () => {
    const limiter = createConcurrencyLimiter(2);
    const request = { ip: "203.0.113.10" } as any;
    const first = createResponse();
    const second = createResponse();
    const rejected = createResponse();
    const admittedAfterClose = createResponse();
    const next = vi.fn();

    limiter(request, first as any, next);
    limiter(request, second as any, next);
    limiter(request, rejected as any, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(rejected.status).toHaveBeenCalledWith(429);

    first.emit("close");
    first.emit("finish");
    limiter(request, admittedAfterClose as any, next);

    expect(next).toHaveBeenCalledTimes(3);
  });
});

