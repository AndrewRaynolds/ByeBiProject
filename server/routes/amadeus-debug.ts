import express from "express";
import axios from "axios";

const router = express.Router();

const isProd =
  process.env.AMADEUS_ENV === "production" ||
  process.env.NODE_ENV === "production";

const BASE_URL = isProd
  ? "https://api.amadeus.com"
  : "https://test.api.amadeus.com";

router.get("/api/amadeus/debug", async (req, res) => {
  try {
    const key = isProd
      ? process.env.AMADEUS_API_KEY_LIVE
      : process.env.AMADEUS_API_KEY_TEST;

    const secret = isProd
      ? process.env.AMADEUS_API_SECRET_LIVE
      : process.env.AMADEUS_API_SECRET_TEST;

    if (!key || !secret) {
      return res.status(500).json({
        ok: false,
        error: "Missing Amadeus credentials",
        env: process.env.AMADEUS_ENV,
      });
    }

    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: key,
      client_secret: secret,
    });

    const tokenResp = await axios.post(
      `${BASE_URL}/v1/security/oauth2/token`,
      body,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    res.json({
      ok: true,
      environment: isProd ? "LIVE" : "TEST",
      baseUrl: BASE_URL,
      tokenExpiresIn: tokenResp.data.expires_in,
    });
  } catch (err: any) {
    res.status(500).json({
      ok: false,
      message: "Amadeus auth failed",
      status: err.response?.status,
      data: err.response?.data,
    });
  }
});

export default router;
