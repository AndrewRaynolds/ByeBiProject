export function getSafePostAuthPath(search: string): string {
  const requestedNext = new URLSearchParams(search).get("next");
  return requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
    ? requestedNext
    : "/";
}


export function buildProtectedRouteAuthPath(location: string): string {
  const safeLocation =
    location.startsWith("/") && !location.startsWith("//") ? location : "/";
  return `/auth?next=${encodeURIComponent(safeLocation)}`;
}
