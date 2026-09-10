type BookingSearchParams = {
  destination: string;
  checkInDate?: string;
  checkOutDate?: string;
  adults: number;
  hotelName?: string;
  affiliateId?: string;
};

const BOOKING_AFFILIATE_ID_PATTERN = /^\d{1,20}$/;

export function getBookingAffiliateId(): string | undefined {
  const value = import.meta.env.VITE_BOOKING_AFFILIATE_ID?.trim();
  return value && BOOKING_AFFILIATE_ID_PATTERN.test(value) ? value : undefined;
}

export function hasBookingAffiliateId(): boolean {
  return Boolean(getBookingAffiliateId());
}

export function buildBookingSearchUrl(params: BookingSearchParams): string {
  const url = new URL("https://www.booking.com/searchresults.html");
  const searchTerm = [params.hotelName, params.destination]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ");

  url.searchParams.set("ss", searchTerm);
  if (params.checkInDate) url.searchParams.set("checkin", params.checkInDate);
  if (params.checkOutDate) url.searchParams.set("checkout", params.checkOutDate);
  url.searchParams.set("group_adults", String(Math.max(1, Math.min(params.adults, 50))));

  const affiliateId = params.affiliateId ?? getBookingAffiliateId();
  if (affiliateId && BOOKING_AFFILIATE_ID_PATTERN.test(affiliateId)) {
    url.searchParams.set("aid", affiliateId);
  }

  return url.toString();
}

export function isMonetizedAviasalesUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const marker = url.searchParams.get("marker");
    return url.hostname === "www.aviasales.com" && Boolean(marker && marker !== "byebi");
  } catch {
    return false;
  }
}
