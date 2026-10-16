const INTERNAL_ORIGIN = "https://byebi.invalid";
export function getSafePostAuthPath(search: string): string {
  const requestedNext = new URLSearchParams(search).get("next");
  if (!requestedNext?.startsWith("/") || requestedNext.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(requestedNext)) return "/";
  try {
    const url = new URL(requestedNext, INTERNAL_ORIGIN);
    if (url.origin !== INTERNAL_ORIGIN || url.pathname.startsWith("//") || url.pathname === "/auth" || url.pathname.startsWith("/auth/")) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return "/"; }
}

export function buildProtectedRouteAuthPath(location: string): string {
  return `/auth?next=${encodeURIComponent(getSafePostAuthPath(`?next=${encodeURIComponent(location)}`))}`;
}
