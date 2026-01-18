// server/services/aviasales.ts
import axios from "axios";
import { cityToIata, CITY_TO_IATA } from "./cityMapping";

// Re-export for backwards compatibility
export { cityToIata, CITY_TO_IATA };

const API_TOKEN = process.env.AVIASALES_API_TOKEN;
const PARTNER_ID = process.env.AVIASALES_PARTNER_ID;

if (!API_TOKEN || !PARTNER_ID) {
  console.error("Missing Aviasales credentials in env variables");
}

export async function searchCheapestFlights(params: {
  origin: string;       // IATA, es. "ROM"
  destination: string;  // IATA, es. "BCN"
  departDate?: string;  // "2026-07-05" (opzionale per v1/prices/cheap)
  currency?: string;    // "EUR"
}) {
  const { origin, destination, departDate, currency = "EUR" } = params;

  const requestParams = {
    origin,
    destination,
    depart_date: departDate,
    token: API_TOKEN,
    currency,
  };

  console.log("🔍 Aviasales API request:", {
    url: "https://api.travelpayouts.com/v1/prices/cheap",
    params: { ...requestParams, token: API_TOKEN ? "[REDACTED]" : "MISSING" }
  });

  try {
    const res = await axios.get(
      "https://api.travelpayouts.com/v1/prices/cheap",
      { params: requestParams }
    );

    console.log("📦 Aviasales API response status:", res.status);
    console.log("📦 Aviasales API response data:", JSON.stringify(res.data, null, 2));

    return res.data;
  } catch (error: any) {
    console.error("❌ Aviasales API error:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
}
