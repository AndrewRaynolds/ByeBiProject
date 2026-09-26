export type AuthAction = "login" | "register" | "logout";

export function getAuthErrorTranslationKey(
  message: string,
  action: AuthAction,
): string {
  const normalized = message.trim().toLowerCase();

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid credentials")
  ) {
    return "auth.loginFailedDesc";
  }

  if (
    normalized.includes("email not confirmed") ||
    normalized.includes("email not verified")
  ) {
    return "auth.emailNotConfirmed";
  }

  if (
    normalized.includes("user already registered") ||
    normalized.includes("already been registered") ||
    normalized.includes("already registered")
  ) {
    return "auth.alreadyRegistered";
  }

  if (
    normalized.includes("rate limit") ||
    normalized.includes("too many requests") ||
    normalized.includes("request rate")
  ) {
    return "auth.rateLimited";
  }

  if (action === "register") return "auth.registerErrorGeneric";
  if (action === "logout") return "auth.logoutErrorDesc";
  return "auth.loginErrorGeneric";
}
