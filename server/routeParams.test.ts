import { describe, expect, it } from "vitest";
import { parsePositiveIntegerParam } from "./routeParams";

describe("parsePositiveIntegerParam", () => {
  it("accepts positive safe integers", () => {
    expect(parsePositiveIntegerParam("1")).toBe(1);
    expect(parsePositiveIntegerParam("42")).toBe(42);
    expect(parsePositiveIntegerParam(String(Number.MAX_SAFE_INTEGER))).toBe(
      Number.MAX_SAFE_INTEGER,
    );
  });

  it.each(["", "0", "-1", "1.5", "12abc", " 12", "1e2", "01"])(
    "rejects malformed identifier %j",
    (value) => {
      expect(parsePositiveIntegerParam(value)).toBeNull();
    },
  );

  it("rejects integers larger than JavaScript can represent safely", () => {
    expect(parsePositiveIntegerParam("9007199254740992")).toBeNull();
  });
});
