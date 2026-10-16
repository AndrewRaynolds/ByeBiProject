import axios from "axios";
import express from "express";
import { rateLimit } from "express-rate-limit";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Exercise the real transport and IP parser with loopback fixtures only.
// Never contact Zapier, the database, or another production service.
describe("runtime dependency security compatibility", () => {
  let server: Server;
  let baseUrl: string;
  let redirectTargetHits = 0;
  const requestOptions = { timeout: 5000, maxRedirects: 0, proxy: false as const };

  beforeAll(async () => {
    const app = express();
    app.set("trust proxy", 1);
    app.use(express.json());
    app.post("/echo", (req, res) => res.json({ method: req.method, body: req.body }));
    app.post("/redirect", (_req, res) => res.redirect(307, "/target"));
    app.post("/target", (_req, res) => {
      redirectTargetHits += 1;
      res.sendStatus(200);
    });
    app.post("/slow", (_req, res) => {
      const timer = setTimeout(() => res.sendStatus(200), 500);
      res.on("close", () => clearTimeout(timer));
    });
    app.get("/limited", rateLimit({
      windowMs: 60_000,
      limit: 1,
      standardHeaders: "draft-7",
      legacyHeaders: false,
    }), (_req, res) => res.sendStatus(200));

    server = createServer(app);
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", () => {
        server.removeListener("error", reject);
        resolve();
      });
    });
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    if (!server?.listening) return;
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  });

  it("preserves JSON POST requests with the webhook transport settings", async () => {
    const payload = { event: "ping", message: "local compatibility check" };
    const response = await axios.post(`${baseUrl}/echo`, payload, requestOptions);
    expect(response.status).toBe(200);
    expect(response.data).toEqual({ method: "POST", body: payload });
  });

  it("rejects redirects without sending a webhook body to the redirect target", async () => {
    await expect(axios.post(`${baseUrl}/redirect`, { event: "ping" }, requestOptions))
      .rejects.toMatchObject({ response: { status: 307 } });
    expect(redirectTargetHits).toBe(0);
  });

  it("honors a request timeout when the remote endpoint stalls", async () => {
    await expect(axios.post(`${baseUrl}/slow`, {}, { ...requestOptions, timeout: 50 }))
      .rejects.toMatchObject({ code: "ECONNABORTED" });
  });

  it("groups IPv6 addresses in the same /56 and separates neighboring networks", async () => {
    const request = (ip: string) => fetch(`${baseUrl}/limited`, {
      headers: { "X-Forwarded-For": ip },
    });
    expect((await request("2001:db8:1234:5600::1")).status).toBe(200);
    expect((await request("2001:db8:1234:56ff::2")).status).toBe(429);
    expect((await request("2001:db8:1234:5700::1")).status).toBe(200);
  });

  it("keeps IPv4 counters separate and limits repeat requests", async () => {
    const request = (ip: string) => fetch(`${baseUrl}/limited`, {
      headers: { "X-Forwarded-For": ip },
    });
    expect((await request("198.51.100.1")).status).toBe(200);
    expect((await request("198.51.100.2")).status).toBe(200);
    expect((await request("198.51.100.1")).status).toBe(429);
  });
});
