const ALLOWED_EXTERNAL_HOSTS = new Set([
  "www.aviasales.com",
  "www.booking.com",
  "gyg.me",
  "www.getyourguide.com",
  "www.google.com",
  "maps.google.com",
]);

export function isAllowedExternalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && ALLOWED_EXTERNAL_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export function openExternalUrl(value: string): boolean {
  if (!isAllowedExternalUrl(value)) return false;
  window.open(value, "_blank", "noopener,noreferrer");
  return true;
}
