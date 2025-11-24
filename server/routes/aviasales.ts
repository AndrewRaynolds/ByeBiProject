// server/routes/aviasales.ts
import { Router } from "express";
import { searchCheapestFlights } from "../services/aviasales";

const router = Router();

router.get("/search", async (req, res) => {
  try {
    const { origin, destination, departDate, currency } = req.query;

    if (!origin || !destination) {
      return res.status(400).json({ error: "origin and destination required" });
    }

    const raw = await searchCheapestFlights({
      origin: String(origin),
      destination: String(destination),
      departDate: departDate ? String(departDate) : undefined,
      currency: currency ? String(currency) : "EUR",
    });

    // raw ha la forma { data: { BCN: { "0": {...}, "1": {...} } }, currency, success }
    const destCode = Object.keys(raw.data)[0];
    const offersObj = raw.data[destCode] || {};

    const offers = Object.values(offersObj as any)
      .sort((a: any, b: any) => a.price - b.price)
      .slice(0, 3) // prendi le 3 più economiche
      .map((o: any, idx: number) => ({
        id: idx,
        airline: o.airline,
        price: o.price,
        departureAt: o.departure_at,
        returnAt: o.return_at,
        flightNumber: o.flight_number,
      }));

    return res.json({
      origin,
      destination: destCode,
      currency: raw.currency,
      offers,
    });
  } catch (err) {
    console.error("Aviasales API error", err);
    res.status(500).json({ error: "Flight search failed" });
  }
});

export default router;
