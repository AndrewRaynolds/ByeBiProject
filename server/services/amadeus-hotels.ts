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
    },
  );

  const token = resp.data.access_token as string;
  const expiresIn = resp.data.expires_in as number;

  tokenCache.token = token;
  tokenCache.expiresAt = Date.now() + expiresIn * 1000 - 10_000; // 10s margine

  return token;
}

export interface AmadeusHotelSearchParams {
  cityCode: string; // es. "BCN"
  checkInDate: string; // "2026-07-05"
  checkOutDate: string; // "2026-07-08"
  adults: number; // n° persone
  currency?: string; // default "EUR"
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
  params: AmadeusHotelSearchParams,
): Promise<SimpleHotelOffer[]> {
  const {
    cityCode,
    checkInDate,
    checkOutDate,
    adults,
    currency = "EUR",
  } = params;

  try {
    const token = await getAmadeusToken();
    console.log(`🏨 Amadeus: Token obtained, searching hotels in ${cityCode}...`);

    // Step 1: Get hotel IDs by city
    const hotelListResp = await axios.get(
      "https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          cityCode,
          radius: 20,
          radiusUnit: "KM",
          hotelSource: "ALL",
        },
      },
    );

    const hotelList = hotelListResp.data.data as any[];
    console.log(`🏨 Amadeus: Found ${hotelList?.length || 0} hotels in ${cityCode}`);
    
    if (!hotelList || hotelList.length === 0) {
      console.log(`🏨 Amadeus: No hotels found, returning mock data`);
      return getMockHotels(cityCode, currency);
    }

    // Get first 10 hotel IDs for offers search
    const hotelIds = hotelList.slice(0, 10).map((h: any) => h.hotelId).join(",");
    console.log(`🏨 Amadeus: Searching offers for hotels: ${hotelIds}`);

    // Step 2: Get offers for those hotels
    const offersResp = await axios.get(
      "https://test.api.amadeus.com/v3/shopping/hotel-offers",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          hotelIds,
          checkInDate,
          checkOutDate,
          adults,
          currency,
        },
      },
    );

    const offersData = offersResp.data.data as any[];
    console.log(`🏨 Amadeus: Found ${offersData?.length || 0} hotel offers`);

    if (!offersData || offersData.length === 0) {
      console.log(`🏨 Amadeus: No offers available, returning mock data`);
      return getMockHotels(cityCode, currency);
    }

    // Normalize the first 3 hotels with offers
    const hotels: SimpleHotelOffer[] = offersData.slice(0, 3).map((item) => {
      const hotel = item.hotel || {};
      const offer = (item.offers && item.offers[0]) || {};
      const price = offer.price || {};

      return {
        name: hotel.name,
        stars: hotel.rating || hotel.stars,
        priceTotal: parseFloat(price.total || "0"),
        currency: price.currency || currency,
        distance: hotel.distance && hotel.distance.toString(),
        raw: item,
      };
    });

    return hotels;
  } catch (error: any) {
    console.error(`🏨 Amadeus Error:`, error.response?.data || error.message);
    console.log(`🏨 Returning mock hotel data as fallback`);
    return getMockHotels(cityCode, currency);
  }
}

function getMockHotels(cityCode: string, currency: string): SimpleHotelOffer[] {
  const cityNames: Record<string, string> = {
    BCN: "Barcelona",
    PAR: "Paris",
    ROM: "Rome",
    LON: "London",
    MAD: "Madrid",
    PRG: "Prague",
    BUD: "Budapest",
    AMS: "Amsterdam",
    BER: "Berlin",
    LIS: "Lisbon",
  };
  const cityName = cityNames[cityCode] || cityCode;

  return [
    {
      name: `${cityName} Grand Hotel`,
      stars: "4",
      priceTotal: 185,
      currency,
    },
    {
      name: `${cityName} Central Inn`,
      stars: "3",
      priceTotal: 120,
      currency,
    },
    {
      name: `${cityName} Party Hostel`,
      stars: "2",
      priceTotal: 65,
      currency,
    },
  ];
}
