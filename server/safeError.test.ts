import { describe, expect, it } from "vitest";
import { getSafeErrorMetadata } from "./safeError";

describe("getSafeErrorMetadata", () => {
  it("keeps operational metadata without exposing the error message", () => {
    const error = Object.assign(new Error("secret upstream response"), {
      response: { status: 401, data: { token: "secret" } },
      config: { headers: { authorization: "Bearer secret" } },
    });

    expect(getSafeErrorMetadata(error)).toEqual({ name: "Error", status: 401 });
  });

  it("handles non-error values", () => {
    expect(getSafeErrorMetadata("failure")).toEqual({ name: "UnknownError" });
  });
});

