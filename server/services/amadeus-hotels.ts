// server/services/amadeus-hotels.ts
import axios from "axios";

let tokenCache: { token: string | null; expiresAt: number } = {
  token: null,
  expiresAt: 0,
};

async function getAmadeusToken(): Promise<string> {
  if (tokenCache.token && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }

  const apiKey = process.env.AMADEUS_API_KEY;
  const apiSecret = process.env.AMADEUS_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error("Amadeus API credentials not configured");
  }

  const resp = await axios.post(
    "https://test.api.amadeus.com/v1/security/oauth2/token",
    new URLSearchParams({
      grant_type: "client_credentials",
      client_id: apiKey,
      client_secret: apiSecret,
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  const token = resp.data.access_token as string;
  const expiresIn = resp.data.expires_in as number;

  tokenCache.token = token;
  tokenCache.expiresAt = Date.now() + expiresIn * 1000 - 10_000; // 10s margine

  return token;
}

export interface AmadeusHotelSearchParams {
  cityCode: string;      // es. "BCN"
  checkInDate: string;   // "2026-07-05"
  checkOutDate: string;  // "2026-07-08"
  adults: number;        // n° persone
  currency?: string;     // default "EUR"
}

export interface SimpleHotelOffer {
  name: string;
  stars?: string;
  priceTotal: number;
  currency: string;
  distance?: string;
  raw?: any; // opzionale per debug
}

export async function searchHotels(
  params: AmadeusHotelSearchParams
): Promise<SimpleHotelOffer[]> {
  const token = await getAmadeusToken();

  const { cityCode, checkInDate, checkOutDate, adults, currency = "EUR" } = params;

  const resp = await axios.get(
    "https://test.api.amadeus.com/v2/shopping/hotel-offers",
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        cityCode,
        checkInDate,
        checkOutDate,
        adults,
        currency,
      },
    }
  );

  const data = resp.data.data as any[];

  // Normalizziamo i primi 3 hotel
  const hotels: SimpleHotelOffer[] = data.slice(0, 3).map((item) => {
    const hotel = item.hotel || {};
    const offer = (item.offers && item.offers[0]) || {};
    const price = offer.price || {};

    return {
      name: hotel.name,
      stars: hotel.rating || hotel.stars,
      priceTotal: parseFloat(price.total || "0"),
      currency: price.currency || currency,
      distance: hotel.distance && hotel.distance.toString(),
      raw: item, // tienilo per debug, puoi toglierlo in prod
    };
  });

  return hotels;
}
