export function getSafePostAuthPath(search: string): string {
  const requestedNext = new URLSearchParams(search).get("next");
  return requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
    ? requestedNext
    : "/";
}
