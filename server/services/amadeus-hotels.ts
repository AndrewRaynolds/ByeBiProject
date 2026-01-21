// server/services/amadeus-hotels.ts
import axios from "axios";

type SearchHotelsParams = {
  cityCode: string;      // es. "BCN"
  checkInDate: string;   // es. "2026-07-05"
  checkOutDate: string;  // es. "2026-07-08"
  adults: number;        // 1-9
  currency?: string;     // es. "EUR"
};

export type BookingFlow = "IN_APP" | "REDIRECT";
export type PaymentPolicy = "PAY_AT_HOTEL" | "PREPAY" | "DEPOSIT" | "UNKNOWN";

export type HotelResult = {
  hotelId: string;
  name: string;
  stars?: string;
  latitude?: number;
  longitude?: number;
  priceTotal: number;
  currency: string;
  offerId: string;
  bookingFlow: BookingFlow;
  paymentPolicy: PaymentPolicy;
  checkInDate: string;
  checkOutDate: string;
  roomDescription?: string;
};

// In produzione: NODE_ENV è l'unica fonte di verità per mock/debug
// AMADEUS_ENV serve solo per selezionare le credenziali API
const isProd = process.env.NODE_ENV === "production";
const useAmadeusLive = process.env.AMADEUS_ENV === "production";

const AMADEUS_API_KEY = useAmadeusLive
  ? process.env.AMADEUS_API_KEY_LIVE
  : process.env.AMADEUS_API_KEY_TEST;

const AMADEUS_API_SECRET = useAmadeusLive
  ? process.env.AMADEUS_API_SECRET_LIVE
  : process.env.AMADEUS_API_SECRET_TEST;

if (!AMADEUS_API_KEY || !AMADEUS_API_SECRET) {
  console.error(
    `[Amadeus Hotels] Missing credentials for ${useAmadeusLive ? "LIVE" : "TEST"} environment`
  );
}

const AMADEUS_BASE_URL = useAmadeusLive
  ? "https://api.amadeus.com"
  : "https://test.api.amadeus.com";

let tokenCache: { token: string | null; expiresAt: number } = {
  token: null,
  expiresAt: 0,
};

async function getAmadeusToken(): Promise<string> {
  // se il token è ancora valido, riusalo
  if (tokenCache.token && tokenCache.expiresAt > Date.now() + 10_000) {
    return tokenCache.token;
  }

  if (!AMADEUS_API_KEY || !AMADEUS_API_SECRET) {
    throw new Error("Amadeus credentials are not configured");
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: AMADEUS_API_KEY,
    client_secret: AMADEUS_API_SECRET,
  });

  const resp = await axios.post(
    `${AMADEUS_BASE_URL}/v1/security/oauth2/token`,
    body,
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  const accessToken = resp.data.access_token as string;
  const expiresIn = resp.data.expires_in as number; // seconds

  tokenCache = {
    token: accessToken,
    // un filo prima della scadenza reale
    expiresAt: Date.now() + (expiresIn - 60) * 1000,
  };

  return accessToken;
}

/**
 * Flusso ufficiale:
 * 1) Hotel List API: /v1/reference-data/locations/hotels/by-city -> hotelIds
 * 2) Hotel Search API V3: /v3/shopping/hotel-offers -> prezzi/offerte
 */
export async function searchHotels(
  params: SearchHotelsParams
): Promise<HotelResult[]> {
  const {
    cityCode,
    checkInDate,
    checkOutDate,
    adults,
    currency = "EUR",
  } = params;

  const token = await getAmadeusToken();

  // STEP 1: lista hotel per città (hotelIds)
  const hotelListResp = await axios.get(
    `${AMADEUS_BASE_URL}/v1/reference-data/locations/hotels/by-city`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        cityCode,
        radius: 20,
        radiusUnit: "KM",
      },
    }
  );

  const hotelIds: string[] =
    hotelListResp.data?.data
      ?.map((h: any) => h.hotelId)
      .filter((id: any) => !!id)
      .slice(0, 30) || []; // limita per non bruciare chiamate

  if (!hotelIds.length) {
    // In produzione NON mockiamo, ritorniamo vuoto
    if (isProd) {
      return [];
    }

    // In sandbox possiamo restituire qualcosa di finto per testare la UI
    return [
      {
        hotelId: "MOCK1",
        name: `${cityCode} Test Hotel`,
        stars: "3",
        priceTotal: 100,
        currency,
        offerId: "MOCK_OFFER_1",
        bookingFlow: "IN_APP" as BookingFlow,
        paymentPolicy: "PAY_AT_HOTEL" as PaymentPolicy,
        checkInDate,
        checkOutDate,
        roomDescription: "Standard Double Room",
      },
      {
        hotelId: "MOCK2",
        name: `${cityCode} Party Hostel`,
        stars: "2",
        priceTotal: 60,
        currency,
        offerId: "MOCK_OFFER_2",
        bookingFlow: "REDIRECT" as BookingFlow,
        paymentPolicy: "PREPAY" as PaymentPolicy,
        checkInDate,
        checkOutDate,
        roomDescription: "Shared Dormitory",
      },
    ];
  }

  // STEP 2: offerte reali per quei hotelIds
  const offersResp = await axios.get(
    `${AMADEUS_BASE_URL}/v3/shopping/hotel-offers`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        hotelIds: hotelIds.join(","),
        adults,
        checkInDate,
        checkOutDate,
        currency,
      },
    }
  );

  const data = offersResp.data?.data || [];

  const MIN_PRICE_PER_NIGHT = 10;
  const MAX_PRICE_PER_NIGHT = 2000;

  const results: HotelResult[] = data
    .map((item: any) => {
      const offer = item.offers?.[0];
      if (!offer) return null;

      // Determina paymentPolicy dalla risposta Amadeus
      const paymentPolicy = determinePaymentPolicy(offer);
      // IN_APP solo se PAY_AT_HOTEL, altrimenti REDIRECT
      const bookingFlow: BookingFlow = paymentPolicy === "PAY_AT_HOTEL" ? "IN_APP" : "REDIRECT";

      return {
        hotelId: item.hotel?.hotelId ?? item.hotelId,
        name: item.hotel?.name ?? "Unknown hotel",
        stars: item.hotel?.rating,
        latitude: item.hotel?.geoCode?.latitude,
        longitude: item.hotel?.geoCode?.longitude,
        priceTotal: Number(offer.price.total),
        currency: offer.price.currency || currency,
        offerId: offer.id,
        bookingFlow,
        paymentPolicy,
        checkInDate: offer.checkInDate || checkInDate,
        checkOutDate: offer.checkOutDate || checkOutDate,
        roomDescription: offer.room?.description?.text || offer.room?.typeEstimated?.category,
      } as HotelResult;
    })
    .filter((x: HotelResult | null) => x !== null && !Number.isNaN(x!.priceTotal) && x!.offerId);

  const filteredResults = results.filter((hotel) => {
    const pricePerNight = hotel.priceTotal;
    if (pricePerNight < MIN_PRICE_PER_NIGHT || pricePerNight > MAX_PRICE_PER_NIGHT) {
      if (!isProd) {
        console.log(`[HOTEL-FILTER] Excluded outlier: ${hotel.name} - €${pricePerNight}/night`);
      }
      return false;
    }
    return true;
  });

  if (!isProd) {
    console.log('[HOTEL-RESULTS]', {
      cityCode,
      totalFromAPI: results.length,
      afterPriceFilter: filteredResults.length,
      top3: filteredResults.slice(0, 3).map(h => h.name),
      priceRange: filteredResults.length ? {
        min: Math.min(...filteredResults.map(h => h.priceTotal)),
        max: Math.max(...filteredResults.map(h => h.priceTotal))
      } : null
    });
  }

  return filteredResults;
}

/**
 * Determina la policy di pagamento dall'offerta Amadeus
 */
function determinePaymentPolicy(offer: any): PaymentPolicy {
  const policies = offer.policies;
  if (!policies) return "UNKNOWN";

  // Controlla paymentType
  const paymentType = policies.paymentType?.toLowerCase();
  if (paymentType === "deposit") return "DEPOSIT";
  if (paymentType === "guarantee") return "PREPAY";

  // Controlla se è pay at hotel (nessun pagamento anticipato richiesto)
  const guarantee = policies.guarantee;
  const deposit = policies.deposit;
  
  // Se non ci sono requisiti di garanzia/deposito, è PAY_AT_HOTEL
  if (!guarantee && !deposit) return "PAY_AT_HOTEL";
  
  // CORREZIONE: Se richiede carta di credito come garanzia, NON è IN_APP
  // L'utente deve inserire la carta, quindi è REDIRECT
  if (guarantee?.acceptedPayments?.methods?.includes("CREDIT_CARD")) {
    return "PREPAY"; // Richiede carta = REDIRECT
  }

  // Se c'è deposito, è DEPOSIT o PREPAY
  if (deposit) {
    const amount = parseFloat(deposit.amount || "0");
    if (amount > 0) return "DEPOSIT";
  }

  return "PREPAY";
}

// ========== HOTEL BOOKING ==========

export type BookHotelParams = {
  offerId: string;
  guest: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
};

export type BookingResult = {
  success: boolean;
  confirmationId?: string;
  bookingId?: string;
  status?: string;
  hotelName?: string;
  checkInDate?: string;
  checkOutDate?: string;
  totalPrice?: number;
  currency?: string;
  error?: string;
};

/**
 * Prenota un hotel tramite Amadeus Hotel Booking API
 * SOLO per offerte IN_APP (PAY_AT_HOTEL)
 */
export async function bookHotel(params: BookHotelParams): Promise<BookingResult> {
  const { offerId, guest } = params;

  // Mock booking per sandbox
  if (!isProd && offerId.startsWith("MOCK_")) {
    return {
      success: true,
      confirmationId: `MOCK-CONF-${Date.now()}`,
      bookingId: `MOCK-BOOK-${Date.now()}`,
      status: "CONFIRMED",
      hotelName: "Mock Hotel",
      error: undefined,
    };
  }

  try {
    const token = await getAmadeusToken();

    // Prima verifichiamo che l'offerta sia ancora disponibile
    const offerCheckResp = await axios.get(
      `${AMADEUS_BASE_URL}/v3/shopping/hotel-offers/${offerId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const offerData = offerCheckResp.data?.data;
    if (!offerData) {
      return {
        success: false,
        error: "Offerta non più disponibile o scaduta",
      };
    }

    // Verifica che sia PAY_AT_HOTEL
    const paymentPolicy = determinePaymentPolicy(offerData.offers?.[0] || {});
    if (paymentPolicy !== "PAY_AT_HOTEL") {
      return {
        success: false,
        error: "Questa offerta richiede pagamento anticipato. Usa il checkout esterno.",
      };
    }

    // Procedi con la prenotazione PAY_AT_HOTEL (NO carta richiesta)
    const bookingResp = await axios.post(
      `${AMADEUS_BASE_URL}/v2/booking/hotel-orders`,
      {
        data: {
          type: "hotel-order",
          guests: [
            {
              tid: 1,
              title: "MR",
              firstName: guest.firstName,
              lastName: guest.lastName,
              phone: guest.phone || "+39000000000",
              email: guest.email,
            },
          ],
          rooms: [
            {
              guestIds: [1],
              offerId: offerId,
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const bookingData = bookingResp.data?.data?.[0];
    
    if (!bookingData) {
      return {
        success: false,
        error: "Errore nella creazione della prenotazione",
      };
    }

    return {
      success: true,
      confirmationId: bookingData.associatedRecords?.[0]?.reference || bookingData.id,
      bookingId: bookingData.id,
      status: "CONFIRMED",
      hotelName: bookingData.hotel?.name,
      checkInDate: bookingData.hotelBookings?.[0]?.checkInDate,
      checkOutDate: bookingData.hotelBookings?.[0]?.checkOutDate,
      totalPrice: parseFloat(bookingData.hotelBookings?.[0]?.price?.total || "0"),
      currency: bookingData.hotelBookings?.[0]?.price?.currency,
    };
  } catch (error: any) {
    console.error("[Amadeus Booking Error]", error.response?.status, error.response?.data);
    
    // Gestione errori specifici
    const amadeusError = error.response?.data?.errors?.[0];
    if (amadeusError) {
      if (amadeusError.code === 38196) {
        return { success: false, error: "Offerta scaduta o non disponibile" };
      }
      if (amadeusError.code === 36803) {
        return { success: false, error: "Il prezzo è cambiato. Riprova la ricerca." };
      }
      if (amadeusError.code === 38199) {
        return { success: false, error: "Nessuna disponibilità per queste date" };
      }
      return { success: false, error: amadeusError.detail || amadeusError.title };
    }

    return {
      success: false,
      error: "Errore durante la prenotazione. Riprova più tardi.",
    };
  }
}
