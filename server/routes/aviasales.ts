// server/routes/aviasales.ts
import { Router } from "express";
import { searchCheapestFlights } from "../services/aviasales";

const router = Router();

router.get("/search", async (req, res) => {
  try {
       console.log("Aviasales request", req.query);
    console.log("Token present?", !!process.env.AVIASALES_API_TOKEN);
    console.log("Partner present?", !!process.env.AVIASALES_PARTNER_ID);
    
    const { origin, destination, departDate, currency } = req.query;

    if (!origin || !destination) {
      return res.status(400).json({ error: "origin and destination required" });
    }

    const data = await searchCheapestFlights({
      origin: String(origin),
      destination: String(destination),
      departDate: departDate ? String(departDate) : undefined,
      currency: currency ? String(currency) : "EUR",
    });

    res.json(data);
  } catch (err) {
    console.error("Aviasales API error", err);
    res.status(500).json({ error: "Flight search failed" });
  }
});

export default router;
