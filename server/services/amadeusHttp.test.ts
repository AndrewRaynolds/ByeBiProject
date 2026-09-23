import axios from "axios";
import { describe, expect, it, vi } from "vitest";
import {
  AmadeusTemporaryError,
  getSafeAmadeusErrorMetadata,
  isRetryableAmadeusError,
  withAmadeusRetry,
} from "./amadeusHttp";

function axiosError(code?: string, status?: number) {
  return new axios.AxiosError(
    "Amadeus request failed",
    code,
    undefined,
    undefined,
    status ? { status } as never : undefined,
  );
}

describe("Amadeus HTTP resilience", () => {
  it.each(["EAI_AGAIN", "ENOTFOUND", "ECONNRESET", "ETIMEDOUT"])(
    "treats %s as retryable",
    (code) => {
      expect(isRetryableAmadeusError(axiosError(code))).toBe(true);
    },
  );

  it.each([429, 500, 502, 503, 504])(
    "treats HTTP %s as retryable",
    (status) => {
      expect(isRetryableAmadeusError(axiosError(undefined, status))).toBe(true);
    },
  );

  it("does not retry permanent client errors", async () => {
    const operation = vi.fn().mockRejectedValue(axiosError(undefined, 400));

    await expect(
      withAmadeusRetry(operation, { wait: async () => undefined }),
    ).rejects.toMatchObject({ response: { status: 400 } });
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("recovers after a temporary DNS failure", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(axiosError("EAI_AGAIN"))
      .mockResolvedValue("ok");

    await expect(
      withAmadeusRetry(operation, { wait: async () => undefined }),
    ).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("returns a stable temporary error after all attempts fail", async () => {
    const operation = vi.fn().mockRejectedValue(axiosError("EAI_AGAIN"));

    await expect(
      withAmadeusRetry(operation, {
        maxAttempts: 3,
        wait: async () => undefined,
      }),
    ).rejects.toBeInstanceOf(AmadeusTemporaryError);
    expect(operation).toHaveBeenCalledTimes(3);
  });
});


describe("safe Amadeus error metadata", () => {
  it("exposes status and Amadeus error identifiers without response details", () => {
    const error = new axios.AxiosError(
      "Request failed",
      "ERR_BAD_REQUEST",
      undefined,
      undefined,
      {
        status: 400,
        data: {
          errors: [{
            code: 38189,
            title: "INVALID FORMAT",
            detail: "sensitive upstream detail that must not be logged",
          }],
        },
      } as never,
    );

    expect(getSafeAmadeusErrorMetadata(error)).toEqual({
      name: "AxiosError",
      status: 400,
      networkCode: "ERR_BAD_REQUEST",
      apiCode: 38189,
      apiTitle: "INVALID FORMAT",
    });
  });

  it("unwraps the final cause of a temporary Amadeus error", () => {
    const cause = axiosError("ETIMEDOUT");
    expect(getSafeAmadeusErrorMetadata(new AmadeusTemporaryError(cause))).toEqual({
      name: "AmadeusTemporaryError",
      networkCode: "ETIMEDOUT",
    });
  });
});
