type FeedbackMailtoInput = {
  email: string;
  subject: string;
  message: string;
  brand: "byebro" | "byebride";
  locale: "it" | "en" | "es";
  pathname: string;
};

export function sanitizeFeedbackPathname(pathname: string): string {
  const withoutQuery = pathname.split("?")[0]?.split("#")[0] || "/";
  return withoutQuery
    .replace(/^\/trips\/shared\/[^/]+$/, "/trips/shared/:token")
    .replace(/^\/trips\/\d+$/, "/trips/:id");
}

export function buildFeedbackMailto(input: FeedbackMailtoInput): string {
  const pathname = sanitizeFeedbackPathname(input.pathname);
  const body = [
    input.message.trim(),
    "",
    "---",
    `Brand: ${input.brand}`,
    `Locale: ${input.locale}`,
    `Page: ${pathname}`,
  ].join("\n");

  return `mailto:${input.email}?subject=${encodeURIComponent(input.subject)}&body=${encodeURIComponent(body)}`;
}
