import { describe, expect, it } from "vitest";
import { getAuthErrorTranslationKey } from "./authErrors";

describe("getAuthErrorTranslationKey", () => {
  it("normalizes actionable authentication errors", () => {
    expect(getAuthErrorTranslationKey("Invalid login credentials", "login"))
      .toBe("auth.loginFailedDesc");
    expect(getAuthErrorTranslationKey("Email not confirmed", "login"))
      .toBe("auth.emailNotConfirmed");
    expect(getAuthErrorTranslationKey("User already registered", "register"))
      .toBe("auth.alreadyRegistered");
    expect(getAuthErrorTranslationKey("Email rate limit exceeded", "register"))
      .toBe("auth.rateLimited");
  });

  it("falls back to action-specific generic messages instead of provider text", () => {
    expect(getAuthErrorTranslationKey("Unexpected auth provider failure", "login"))
      .toBe("auth.loginErrorGeneric");
    expect(getAuthErrorTranslationKey("Unexpected auth provider failure", "register"))
      .toBe("auth.registerErrorGeneric");
    expect(getAuthErrorTranslationKey("Unexpected auth provider failure", "logout"))
      .toBe("auth.logoutErrorDesc");
  });
});
