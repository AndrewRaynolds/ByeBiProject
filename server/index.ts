import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import amadeusDebugRoute from "./routes/amadeus-debug";
import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync, hasStripeCredentials } from './stripeClient';
import { WebhookHandlers } from './webhookHandlers';
import {
  aiLimiter,
  apiLimiter,
  commerceLimiter,
  externalApiLimiter,
  webhookLimiter,
} from "./security";
import { storage } from "./storage";
import { createHttpSecurityMiddleware } from "./httpSecurity";
import { validateRuntimeEnvironment } from "./runtimeConfig";

const app = express();

let isShuttingDown = false;

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(createHttpSecurityMiddleware());

// Stripe webhook route MUST be registered BEFORE express.json()
// Stripe integration (connector: Stripe)
app.post(
  '/api/stripe/webhook',
  webhookLimiter,
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      if (!Buffer.isBuffer(req.body)) {
        console.error('STRIPE WEBHOOK ERROR: req.body is not a Buffer');
        return res.status(500).json({ error: 'Webhook processing error' });
      }
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error.message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

// Now apply JSON middleware for all other routes
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

app.get("/api/ready", async (_req, res) => {
  if (isShuttingDown) {
    return res.status(503).json({ status: "shutting_down" });
  }

  try {
    await storage.healthCheck();
    res.status(200).json({
      status: "ready",
      persistence:
        process.env.CRITICAL_DATA_PERSISTENCE === "database"
          ? "database"
          : "memory",
    });
  } catch (error) {
    console.error("Readiness check failed:", error);
    res.status(503).json({ status: "unavailable" });
  }
});

app.use("/api", apiLimiter);
app.use("/api/chat", aiLimiter);
app.use("/api/generate-itinerary", aiLimiter);
app.use("/api/stripe", commerceLimiter);
app.use("/api/printful", commerceLimiter);
app.use("/api/hotels", externalApiLimiter);
app.use("/api/flights", externalApiLimiter);
app.use("/api/images", externalApiLimiter);
app.use("/api/amadeus", amadeusDebugRoute);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.warn('DATABASE_URL not set - Stripe sync disabled');
    return;
  }

  if (!hasStripeCredentials() && !process.env.REPL_IDENTITY && !process.env.WEB_REPL_RENEWAL) {
    console.warn('Stripe credentials not set - Stripe sync disabled');
    return;
  }

  try {
    console.log('Initializing Stripe schema...');
    await runMigrations({ databaseUrl });
    console.log('Stripe schema ready');

    const stripeSync = await getStripeSync();

    const replitDomains = process.env.REPLIT_DOMAINS;
    if (replitDomains) {
      console.log('Setting up managed webhook...');
      const webhookBaseUrl = `https://${replitDomains.split(',')[0]}`;
      try {
        const result = await stripeSync.findOrCreateManagedWebhook(
          `${webhookBaseUrl}/api/stripe/webhook`
        );
        console.log(`Webhook configured: ${result?.webhook?.url || 'OK'}`);
      } catch (err: any) {
        console.warn('Webhook setup skipped:', err.message);
      }
    } else {
      console.log('REPLIT_DOMAINS not set, skipping webhook setup');
    }

    console.log('Syncing Stripe data...');
    stripeSync.syncBackfill()
      .then(() => console.log('Stripe data synced'))
      .catch((err: any) => console.error('Error syncing Stripe data:', err));
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
  }
}

async function startServer() {
  validateRuntimeEnvironment(process.env);
  await initStripe();

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message =
      status >= 500 && app.get("env") === "production"
        ? "Internal Server Error"
        : err.message || "Internal Server Error";

    console.error("Unhandled request error:", err);
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = Number(process.env.PORT) || 5000;
  const host = process.env.HOST ?? "0.0.0.0";
  const listenOptions: Parameters<typeof server.listen>[0] = { port, host };

  if (process.platform === "linux") {
    listenOptions.reusePort = true;
  }

  await new Promise<void>((resolve, reject) => {
    const handleStartupError = (error: Error) => {
      server.off("error", handleStartupError);
      reject(error);
    };

    server.once("error", handleStartupError);
    server.listen(listenOptions, () => {
      server.off("error", handleStartupError);
      resolve();
    });
  });

  log(`serving on port ${port}`);

  const shutdown = (signal: NodeJS.Signals) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    log(`${signal} received, shutting down`);

    const forceShutdownTimer = setTimeout(() => {
      console.error("Graceful shutdown timed out");
      process.exit(1);
    }, 10_000);
    forceShutdownTimer.unref();

    server.close(async (serverError) => {
      let exitCode = serverError ? 1 : 0;

      if (serverError) {
        console.error("HTTP server shutdown failed:", serverError);
      }

      try {
        await storage.close();
      } catch (databaseError) {
        exitCode = 1;
        console.error("Database shutdown failed:", databaseError);
      } finally {
        clearTimeout(forceShutdownTimer);
        process.exit(exitCode);
      }
    });
  };

  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}

startServer().catch(async (error) => {
  console.error("Server startup failed:", error);
  try {
    await storage.close();
  } catch (databaseError) {
    console.error("Database cleanup after startup failure failed:", databaseError);
  }
  process.exitCode = 1;
});
