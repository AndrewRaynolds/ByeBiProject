import "./types";
import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { randomUUID } from "crypto";
import { storage } from "./storage";
import { 
  insertTripSchema, 
  insertExpenseGroupSchema, 
  insertExpenseSchema,
} from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { generateItinerary } from "./services/openai";
import { supabase } from "./supabase";
import { registerZapierRoutes } from "./zapier-integration";
import { searchFlights } from "./services/amadeus-flights";
import { iataToCity, resolveIataCode } from "./services/cityMapping";
import { searchHotels } from "./services/amadeus-hotels";
import { AmadeusTemporaryError } from "./services/amadeusHttp";
import { getStoreProducts, getProductDetail, getShippingRates, PrintfulOrderNotCancellableError } from "./services/printful";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { buildPublicBlogPost } from "./blog";
import { blogSubmissionLimiter } from "./security";
import { buildItineraryPreview } from "./itineraryPreview";
import { hotelSearchQuerySchema } from "@shared/hotelSchemas";
import { buildAviasalesUrl, flightSearchQuerySchema } from "@shared/flightSchemas";
import { calculateTripDays, isValidDateRange, normalizeTripDate } from "@shared/dateUtils";
import { getSafeErrorMetadata } from "./safeError";
import { chatStreamRequestSchema } from "@shared/chatSchemas";
import { parsePositiveIntegerParam } from "./routeParams";
import { affiliateClickEventSchema } from "@shared/analyticsSchemas";
import { MerchandiseOrderRetryError, WebhookHandlers } from "./webhookHandlers";
import { isValidPrintfulWebhookToken, processPrintfulWebhook } from "./printfulWebhookHandlers";


const checkoutItemSchema = z.object({
  productId: z.number().int().positive(),
  variantId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(10),
}).strict();
const checkoutSchema = z.object({
  brand: z.enum(["byebro", "byebride"]),
  shippingCountry: z.enum(["IT", "DE", "FR", "ES", "NL", "BE", "AT", "PT", "GR", "PL", "CZ", "HU", "HR", "RO", "BG", "SE", "DK", "FI", "IE", "GB"]),
  acceptTerms: z.literal(true),
  items: z.array(checkoutItemSchema).min(1).max(20),
}).strict();
const MERCHANDISE_LEGAL_VERSION = "2026-08-04";
const merchandiseOrderStatusSchema = z.object({
  orderId: z.string().uuid(),
  sessionId: z.string().regex(/^cs_(?:test_|live_)?[A-Za-z0-9]+$/),
});
const brandProductIds = {
  byebride: new Set([450568421, 450564312, 450562726]),
  byebro: new Set([420156309, 420156126]),
} as const;
const printfulShippingSchema = z
  .object({
    countryCode: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/),
    items: z.array(z.object({
      sync_variant_id: z.number().int().positive(),
      quantity: z.number().int().min(1).max(10),
    }).strict()).min(1).max(20),
  })
  .strict();
const itineraryDateSchema = z.string().refine(
  (value) => normalizeTripDate(value) === value,
  "Invalid date",
);
const zapierItinerarySchema = z
  .object({
    citta: z.string().trim().min(1).max(100),
    date: z.object({
      startDate: itineraryDateSchema,
      endDate: itineraryDateSchema,
    }).strict(),
    persone: z.number().int().min(1).max(50),
    interessi: z.array(z.string().trim().min(1).max(100)).max(20).optional().default([]),
    budget: z.enum(["economico", "medio", "alto"]).optional().default("medio"),
    esperienze: z.array(z.string().trim().min(1).max(100)).max(20).optional().default([]),
  })
  .strict()
  .refine(
    (value) =>
      isValidDateRange(value.date.startDate, value.date.endDate) &&
      calculateTripDays(value.date.startDate, value.date.endDate) <= 30,
    { path: ["date", "endDate"], message: "Invalid itinerary date range" },
  );
const zapierItineraryResponseSchema = z
  .object({ itinerary: z.string().trim().min(1).max(20_000) })
  .passthrough();
const updateExpenseSchema = insertExpenseSchema
  .omit({ groupId: true })
  .partial()
  .strict();

export async function registerRoutes(app: Express): Promise<Server> {

  const getOptionalUser = async (req: Request) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return undefined;
    const token = authHeader.slice("Bearer ".length);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    return error ? undefined : user ?? undefined;
  };

  app.post("/api/analytics/affiliate-clicks", async (req: Request, res: Response) => {
    const event = affiliateClickEventSchema.safeParse(req.body);
    if (!event.success) {
      return res.status(400).json({ error: "Invalid affiliate click event" });
    }

    try {
      await storage.recordAffiliateClick(event.data);
      return res.status(202).json({ accepted: true });
    } catch (error: unknown) {
      console.error("Error recording affiliate click", getSafeErrorMetadata(error));
      return res.status(503).json({ error: "Analytics temporarily unavailable" });
    }
  });

  // Stripe integration routes (connector: Stripe)
  app.get("/api/stripe/publishable-key", async (req: Request, res: Response) => {
    try {
      const key = await getStripePublishableKey();
      return res.json({ publishableKey: key });
    } catch (error: any) {
      console.error("Error getting Stripe publishable key", getSafeErrorMetadata(error));
      return res.status(500).json({ message: "Failed to get Stripe config" });
    }
  });

  app.post("/api/stripe/checkout", async (req: Request, res: Response) => {
    try {
      const salesMode = process.env.MERCHANDISE_SALES_MODE ||
        (process.env.NODE_ENV === "production" ? "disabled" : "test");
      if (salesMode === "disabled") {
        return res.status(503).json({ message: "Merchandise sales are not active" });
      }
      const { brand, shippingCountry, items } = checkoutSchema.parse(req.body);
      if (items.some((item) => !brandProductIds[brand].has(item.productId))) {
        return res.status(400).json({ message: "Some products do not belong to the selected brand" });
      }

      const productIds = Array.from(new Set(items.map((item) => item.productId)));

      const verifiedVariants = new Map<string, { name: string; price: string; currency: string; imageUrl: string; productName: string }>();

      for (const productId of productIds) {
        const product = await getProductDetail(productId);
        for (const variant of product.variants) {
          verifiedVariants.set(`${productId}:${variant.id}`, {
            name: variant.name,
            price: variant.retailPrice,
            currency: variant.currency,
            imageUrl: variant.previewUrl || variant.imageUrl,
            productName: product.name,
          });
        }
      }

      const unverifiedItems = items.filter((item) => !verifiedVariants.has(`${item.productId}:${item.variantId}`));
      if (unverifiedItems.length > 0) {
        return res.status(400).json({
          message: "Some items could not be verified",
          unverifiedVariantIds: unverifiedItems.map((item: any) => item.variantId),
        });
      }

      const lineItems = items.map((item) => {
        const verified = verifiedVariants.get(`${item.productId}:${item.variantId}`)!;
        const unitAmount = Math.round(Number.parseFloat(verified.price) * 100);
        if (!Number.isSafeInteger(unitAmount) || unitAmount <= 0) {
          throw new Error("Printful returned an invalid merchandise price");
        }

        return {
          price_data: {
            currency: verified.currency.toLowerCase(),
            product_data: {
              name: verified.productName,
              description: verified.name,
              ...(verified.imageUrl ? { images: [verified.imageUrl] } : {}),
            },
            unit_amount: unitAmount,
          },
          quantity: item.quantity,
        };
      });
      const currencies = new Set(lineItems.map((item) => item.price_data.currency.toUpperCase()));
      if (currencies.size !== 1) {
        return res.status(400).json({ message: "All checkout items must use the same currency" });
      }
      const currency = Array.from(currencies)[0];
      const shippingRates = await getShippingRates(
        shippingCountry,
        items.map((item) => ({
          sync_variant_id: item.variantId,
          quantity: item.quantity,
        })),
        currency,
      );
      const usableShippingRates = shippingRates
        .map((rate) => ({
          ...rate,
          unitAmount: Math.round(Number.parseFloat(rate.rate) * 100),
        }))
        .filter((rate) =>
          rate.currency.toUpperCase() === currency &&
          Number.isSafeInteger(rate.unitAmount) &&
          rate.unitAmount >= 0,
        )
        .sort((left, right) => left.unitAmount - right.unitAmount);
      const shippingRate =
        usableShippingRates.find((rate) => rate.id === "STANDARD") ||
        usableShippingRates[0];
      if (!shippingRate) {
        return res.status(400).json({ message: "Shipping is not available for the selected country" });
      }
      lineItems.push({
        price_data: {
          currency: currency.toLowerCase(),
          product_data: {
            name: `Shipping — ${shippingRate.name}`,
            description: `${shippingRate.minDeliveryDays}-${shippingRate.maxDeliveryDays} business days`,
          },
          unit_amount: shippingRate.unitAmount,
        },
        quantity: 1,
      });

      const orderId = randomUUID();
      const user = await getOptionalUser(req);
      const order = await storage.createMerchandiseOrder({
        id: orderId,
        userId: user?.id ?? null,
        customerEmail: null,
        brand,
        amountTotal: lineItems.reduce(
          (total, item) => total + item.price_data.unit_amount * item.quantity,
          0,
        ),
        currency,
        shippingCountry,
        shippingMethod: shippingRate.id,
        shippingAmount: shippingRate.unitAmount,
        legalVersion: MERCHANDISE_LEGAL_VERSION,
        termsAcceptedAt: new Date(),
        items: items.map((item) => {
          const verified = verifiedVariants.get(`${item.productId}:${item.variantId}`)!;
          return {
            productId: item.productId,
            variantId: item.variantId,
            productName: verified.productName,
            variantName: verified.name,
            quantity: item.quantity,
            unitAmount: Math.round(Number.parseFloat(verified.price) * 100),
          };
        }),
      });

      const configuredBaseUrl = process.env.APP_BASE_URL?.replace(/\/+$/, "");
      if (process.env.NODE_ENV === "production" && !configuredBaseUrl) {
        return res.status(500).json({ message: "Checkout base URL is not configured" });
      }
      const baseUrl = configuredBaseUrl || `${req.protocol}://${req.get("host")}`;
      const stripe = await getUncachableStripeClient();

      const sessionParams: any = {
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60 + 5,
        success_url: `${baseUrl}/merchandise?payment=success&order_id=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/merchandise?payment=cancelled&order_id=${order.id}`,
        client_reference_id: order.id,
        shipping_address_collection: {
          allowed_countries: [shippingCountry],
        },
        metadata: {
          byebi_order_id: order.id,
        },
        payment_intent_data: {
          metadata: { byebi_order_id: order.id },
        },
        ...(user?.email ? { customer_email: user.email } : {}),
      };

      const session = await stripe.checkout.sessions.create(sessionParams);
      const attached = await storage.attachStripeSessionToOrder(order.id, session.id);
      if (!attached) {
        await stripe.checkout.sessions.expire(session.id).catch(() => undefined);
        throw new Error("Unable to associate Stripe session with merchandise order");
      }

      return res.json({ url: session.url, orderId: order.id });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid checkout items" });
      }
      console.error("Error creating Stripe checkout session", getSafeErrorMetadata(error));
      return res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  app.get("/api/merchandise/orders/:orderId/status", async (req: Request, res: Response) => {
    try {
      const parsed = merchandiseOrderStatusSchema.safeParse({
        orderId: req.params.orderId,
        sessionId: req.query.session_id,
      });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid order reference" });
      }
      const order = await storage.getMerchandiseOrderByIdAndSession(
        parsed.data.orderId,
        parsed.data.sessionId,
      );
      if (!order) return res.status(404).json({ message: "Order not found" });
      return res.json({
        id: order.id,
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        amountTotal: order.amountTotal,
        currency: order.currency,
        shippingCountry: order.shippingCountry,
        shippingMethod: order.shippingMethod,
        shippingAmount: order.shippingAmount,
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl,
        shippingCarrier: order.shippingCarrier,
        shippedAt: order.shippedAt,
        createdAt: order.createdAt,
      });
    } catch (error: any) {
      console.error("Error retrieving merchandise order", getSafeErrorMetadata(error));
      return res.status(500).json({ message: "Failed to retrieve order" });
    }
  });

  // Authorization middleware — verifies Supabase JWT Bearer token
  const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const token = authHeader.split(" ")[1];
    supabase.auth.getUser(token).then(({ data: { user }, error }) => {
      if (error || !user) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }
      req.supabaseUser = user;
      next();
    }).catch(() => {
      return res.status(401).json({ message: "Authentication error" });
    });
  };

  const isAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (req.supabaseUser?.app_metadata?.role !== "admin") {
      return res.status(403).json({ message: "Administrator access required" });
    }
    next();
  };

  app.get("/api/merchandise/orders", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const orders = await storage.getMerchandiseOrdersByUserId(req.supabaseUser!.id);
      return res.json(orders.map((order) => ({
        id: order.id,
        brand: order.brand,
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        amountTotal: order.amountTotal,
        currency: order.currency,
        shippingCountry: order.shippingCountry,
        shippingMethod: order.shippingMethod,
        shippingAmount: order.shippingAmount,
        items: order.items,
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl,
        shippingCarrier: order.shippingCarrier,
        shippedAt: order.shippedAt,
        createdAt: order.createdAt,
      })));
    } catch (error) {
      console.error("Error retrieving merchandise orders", getSafeErrorMetadata(error));
      return res.status(500).json({ message: "Failed to retrieve merchandise orders" });
    }
  });

  app.get(
    "/api/admin/merchandise/orders",
    isAuthenticated,
    isAdmin,
    async (_req: Request, res: Response) => {
      try {
        const orders = await storage.getAllMerchandiseOrders(100);
        return res.json(orders.map((order) => ({
          id: order.id,
          userId: order.userId,
          brand: order.brand,
          paymentStatus: order.paymentStatus,
          fulfillmentStatus: order.fulfillmentStatus,
          amountTotal: order.amountTotal,
          currency: order.currency,
          shippingCountry: order.shippingCountry,
          shippingMethod: order.shippingMethod,
          shippingAmount: order.shippingAmount,
          items: order.items,
          printfulOrderId: order.printfulOrderId,
          printfulStatus: order.printfulStatus,
          stripeRefundId: order.stripeRefundId,
          trackingNumber: order.trackingNumber,
          trackingUrl: order.trackingUrl,
          shippingCarrier: order.shippingCarrier,
          shippedAt: order.shippedAt,
          failureCode: order.failureCode,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        })));
      } catch (error) {
        console.error("Error retrieving admin merchandise orders", getSafeErrorMetadata(error));
        return res.status(500).json({ message: "Failed to retrieve merchandise orders" });
      }
    },
  );

  app.post(
    "/api/admin/merchandise/orders/:orderId/retry",
    isAuthenticated,
    isAdmin,
    async (req: Request, res: Response) => {
      try {
        await WebhookHandlers.retryMerchandiseOrder(req.params.orderId);
        const order = await storage.getMerchandiseOrderById(req.params.orderId);
        return res.json({
          id: order?.id,
          fulfillmentStatus: order?.fulfillmentStatus,
          printfulOrderId: order?.printfulOrderId,
          printfulStatus: order?.printfulStatus,
        });
      } catch (error) {
        if (error instanceof MerchandiseOrderRetryError) {
          return res.status(error.statusCode).json({ message: error.message });
        }
        console.error("Error retrying merchandise order", getSafeErrorMetadata(error));
        return res.status(503).json({ message: "Merchandise fulfillment is temporarily unavailable" });
      }
    },
  );

  app.post(
    "/api/admin/merchandise/orders/:orderId/refund",
    isAuthenticated,
    isAdmin,
    async (req: Request, res: Response) => {
      try {
        await WebhookHandlers.refundMerchandiseOrder(req.params.orderId);
        const order = await storage.getMerchandiseOrderById(req.params.orderId);
        return res.json({
          id: order?.id,
          paymentStatus: order?.paymentStatus,
          fulfillmentStatus: order?.fulfillmentStatus,
          stripeRefundId: order?.stripeRefundId,
        });
      } catch (error) {
        if (error instanceof MerchandiseOrderRetryError) {
          return res.status(error.statusCode).json({ message: error.message });
        }
        if (error instanceof PrintfulOrderNotCancellableError) {
          return res.status(409).json({
            message: `Printful order can no longer be cancelled (${error.printfulStatus})`,
          });
        }
        console.error("Error refunding merchandise order", getSafeErrorMetadata(error));
        return res.status(503).json({ message: "Refund is temporarily unavailable" });
      }
    },
  );

  app.get(
    "/api/admin/affiliate-summary",
    isAuthenticated,
    isAdmin,
    async (req: Request, res: Response) => {
      const parsedDays = z.coerce.number().int().min(1).max(365).safeParse(req.query.days ?? 30);
      if (!parsedDays.success) {
        return res.status(400).json({ error: "Invalid analytics period" });
      }

      try {
        const since = new Date();
        since.setUTCDate(since.getUTCDate() - parsedDays.data);
        const summary = await storage.getAffiliateClickSummary(since, parsedDays.data);
        return res.json(summary);
      } catch (error: unknown) {
        console.error("Error loading affiliate summary", getSafeErrorMetadata(error));
        return res.status(503).json({ error: "Analytics temporarily unavailable" });
      }
    },
  );

  const requireOwnedExpenseGroup = async (
    req: Request,
    res: Response,
    groupId: number,
  ): Promise<boolean> => {
    const userId = req.supabaseUser?.id;
    if (!userId) {
      res.status(401).json({ message: "Authentication required" });
      return false;
    }
    if (!Number.isInteger(groupId)) {
      res.status(400).json({ message: "Invalid expense group ID" });
      return false;
    }
    if (!(await storage.isExpenseGroupOwner(groupId, userId))) {
      res.status(404).json({ message: "Expense group not found" });
      return false;
    }
    return true;
  };

  // Get current user from Supabase JWT
  app.get("/api/user", async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const token = authHeader.split(" ")[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const meta = user.user_metadata || {};
    return res.json({
      id: user.id,
      email: user.email,
      username: meta.username || user.email?.split("@")[0],
      firstName: meta.firstName || meta.first_name,
      lastName: meta.lastName || meta.last_name,
      isAdmin: user.app_metadata?.role === "admin",
    });
  });

  // Trip routes
  app.post("/api/trips", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const supabaseUser = req.supabaseUser;
      if (!supabaseUser) {
        return res.status(401).json({ message: "Authentication required" });
      }
      // Always use the authenticated user's UUID as userId (ignoring any client-sent userId)
      const tripPayload = { ...req.body, userId: supabaseUser.id };
      const tripData = insertTripSchema.parse(tripPayload);
      const trip = await storage.createTrip(tripData);
      return res.status(201).json(trip);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: fromZodError(error).message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/trips/user/:userId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const supabaseUser = req.supabaseUser;
      if (!supabaseUser) {
        return res.status(401).json({ message: "Authentication required" });
      }
      const requestedUserId = req.params.userId;

      // Enforce that users can only fetch their own trips
      if (requestedUserId !== supabaseUser.id) {
        return res.status(403).json({ message: "Forbidden: cannot access another user's trips" });
      }

      const trips = await storage.getTripsByUserId(requestedUserId);
      return res.status(200).json(trips);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Destination routes
  app.get("/api/destinations", async (req: Request, res: Response) => {
    try {
      const destinations = await storage.getAllDestinations();
      return res.status(200).json(destinations);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Experience routes
  app.get("/api/experiences", async (req: Request, res: Response) => {
    try {
      const experiences = await storage.getAllExperiences();
      return res.status(200).json(experiences);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Blog post routes
  app.get("/api/blog-posts", async (req: Request, res: Response) => {
    try {
      const blogPosts = await storage.getAllBlogPosts();
      return res.status(200).json(blogPosts);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/blog-posts/:id", async (req: Request, res: Response) => {
    try {
      const id = parsePositiveIntegerParam(req.params.id);
      if (id === null) return res.status(400).json({ message: "ID non valido" });
      const blogPost = await storage.getBlogPost(id);
      if (!blogPost) return res.status(404).json({ message: "Storia non trovata" });
      return res.status(200).json(blogPost);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/blog-posts", blogSubmissionLimiter, isAuthenticated, async (req: Request, res: Response) => {
    try {
      const validatedData = buildPublicBlogPost(req.body);
      const blogPost = await storage.createBlogPost(validatedData);
      return res.status(201).json(blogPost);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dati non validi", errors: error.errors });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Printful Merchandise routes
  app.post("/api/printful/webhook", async (req: Request, res: Response) => {
    if (!isValidPrintfulWebhookToken(req.query.token)) {
      return res.status(401).json({ message: "Invalid Printful webhook token" });
    }
    try {
      await processPrintfulWebhook(req.body);
      return res.status(204).send();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid Printful webhook payload" });
      }
      console.error("Error processing Printful webhook", getSafeErrorMetadata(error));
      return res.status(503).json({ message: "Printful webhook processing failed" });
    }
  });

  app.get("/api/printful/products", async (req: Request, res: Response) => {
    try {
      const products = await getStoreProducts();
      return res.status(200).json(products);
    } catch (error: unknown) {
      console.error("Error fetching Printful products", getSafeErrorMetadata(error));
      return res.status(502).json({ message: "Printful service temporarily unavailable" });
    }
  });

  app.get("/api/printful/products/:id", async (req: Request, res: Response) => {
    const productId = parsePositiveIntegerParam(req.params.id);
    if (productId === null) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    try {
      const product = await getProductDetail(productId);
      return res.status(200).json(product);
    } catch (error: unknown) {
      console.error("Error fetching Printful product detail", getSafeErrorMetadata(error));
      return res.status(502).json({ message: "Printful service temporarily unavailable" });
    }
  });

  app.post("/api/printful/shipping-rates", async (req: Request, res: Response) => {
    const parsedShippingRequest = printfulShippingSchema.safeParse(req.body);
    if (!parsedShippingRequest.success) {
      return res.status(400).json({ message: "Invalid shipping request" });
    }

    try {
      const { countryCode, items } = parsedShippingRequest.data;
      const rates = await getShippingRates(countryCode, items);
      return res.status(200).json(rates);
    } catch (error: unknown) {
      console.error("Error fetching Printful shipping rates", getSafeErrorMetadata(error));
      return res.status(502).json({ message: "Printful service temporarily unavailable" });
    }
  });

  // SplittaBro - Expense Group routes
  app.post("/api/expense-groups", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.supabaseUser!.id;
      const groupData = insertExpenseGroupSchema.parse(req.body);
      if (groupData.tripId) {
        const trip = await storage.getTrip(groupData.tripId);
        if (!trip || trip.userId !== userId) {
          return res.status(404).json({ message: "Trip not found" });
        }
      }
      const group = await storage.createExpenseGroup(groupData, userId);
      return res.status(201).json(group);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: fromZodError(error).message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/trips/:tripId/expense-groups", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const tripId = parsePositiveIntegerParam(req.params.tripId);
      if (tripId === null) {
        return res.status(400).json({ message: "Invalid trip ID" });
      }
      const trip = await storage.getTrip(tripId);
      
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      if (trip.userId !== req.supabaseUser!.id) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      const expenseGroups = await storage.getExpenseGroupsByTripId(
        tripId,
        req.supabaseUser!.id,
      );
      return res.status(200).json(expenseGroups);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Get all expense groups (for SplittaBro standalone use)
  app.get("/api/expense-groups", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Get all expense groups
      const allGroups = await storage.getAllExpenseGroups(req.supabaseUser!.id);
      return res.status(200).json(allGroups);
    } catch (error) {
      console.error("Error fetching expense groups", getSafeErrorMetadata(error));
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/expense-groups/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parsePositiveIntegerParam(req.params.id);
      if (id === null) {
        return res.status(400).json({ message: "Invalid expense group ID" });
      }
      if (!(await requireOwnedExpenseGroup(req, res, id))) return;
      const group = await storage.getExpenseGroup(id);
      
      if (!group) {
        return res.status(404).json({ message: "Expense group not found" });
      }
      
      return res.status(200).json(group);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // SplittaBro - Expense routes
  app.post("/api/expenses", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const expenseData = insertExpenseSchema.parse(req.body);
      if (!(await requireOwnedExpenseGroup(req, res, expenseData.groupId))) return;
      const expense = await storage.createExpense(expenseData);
      return res.status(201).json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: fromZodError(error).message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/expense-groups/:groupId/expenses", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const groupId = parsePositiveIntegerParam(req.params.groupId);
      if (groupId === null) {
        return res.status(400).json({ message: "Invalid expense group ID" });
      }
      if (!(await requireOwnedExpenseGroup(req, res, groupId))) return;
      const group = await storage.getExpenseGroup(groupId);
      
      if (!group) {
        return res.status(404).json({ message: "Expense group not found" });
      }
      
      const expenses = await storage.getExpensesByGroupId(groupId);
      return res.status(200).json(expenses);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/expenses/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parsePositiveIntegerParam(req.params.id);
      if (id === null) {
        return res.status(400).json({ message: "Invalid expense ID" });
      }
      const expense = await storage.getExpense(id);
      
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      if (!(await requireOwnedExpenseGroup(req, res, expense.groupId))) return;
      
      return res.status(200).json(expense);
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/expenses/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parsePositiveIntegerParam(req.params.id);
      if (id === null) {
        return res.status(400).json({ message: "Invalid expense ID" });
      }
      const expense = await storage.getExpense(id);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      if (!(await requireOwnedExpenseGroup(req, res, expense.groupId))) return;
      const updateData = updateExpenseSchema.parse(req.body);
      
      const updatedExpense = await storage.updateExpense(id, updateData);
      
      if (!updatedExpense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      return res.status(200).json(updatedExpense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: fromZodError(error).message });
      }
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.delete("/api/expenses/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parsePositiveIntegerParam(req.params.id);
      if (id === null) {
        return res.status(400).json({ message: "Invalid expense ID" });
      }
      const expense = await storage.getExpense(id);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      if (!(await requireOwnedExpenseGroup(req, res, expense.groupId))) return;
      const result = await storage.deleteExpense(id);
      
      if (!result) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      return res.status(200).json({ message: "Expense deleted successfully" });
    } catch (error) {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Zapier AI-powered itinerary generation
  app.post("/api/generate-itinerary", async (req: Request, res: Response) => {
    try {
      const requestData = zapierItinerarySchema.parse(req.body);
      
      // Prepara i dati per Zapier webhook
      const zapierPayload = {
        destination: requestData.citta,
        startDate: requestData.date.startDate,
        endDate: requestData.date.endDate,
        groupSize: requestData.persone,
        budget: requestData.budget,
        interests: requestData.interessi,
        experiences: requestData.esperienze,
        timestamp: new Date().toISOString(),
        source: "ByeBi itinerary API"
      };
      
      // Invia i dati a Zapier webhook (se configurato)
      let zapierResponse = null;
      const zapierWebhookUrl = process.env.ZAPIER_WEBHOOK_URL;
      
      if (zapierWebhookUrl) {
        try {
          const response = await fetch(zapierWebhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(zapierPayload),
            signal: AbortSignal.timeout(10_000),
          });
          
          if (response.ok) {
            const parsedResponse = zapierItineraryResponseSchema.safeParse(await response.json());
            zapierResponse = parsedResponse.success ? parsedResponse.data : null;
          } else {
            console.error("Zapier itinerary webhook failed", { status: response.status });
          }
        } catch (error) {
          console.error("Zapier itinerary webhook failed", getSafeErrorMetadata(error));
        }
      }
      
      // Se Zapier ha restituito un itinerario, usalo; altrimenti usa fallback
      let itineraryContent = "Itinerario personalizzato in generazione...";
      
      if (zapierResponse && zapierResponse.itinerary) {
        itineraryContent = zapierResponse.itinerary;
      } else {
        // Fallback: genera un itinerario di base
        const duration = Math.ceil(
          (new Date(requestData.date.endDate).getTime() - new Date(requestData.date.startDate).getTime()) 
          / (1000 * 60 * 60 * 24)
        );
        
        itineraryContent = `🎉 Addio al Celibato a ${requestData.citta}
        
📅 Durata: ${duration} giorni per ${requestData.persone} persone
💰 Budget: ${requestData.budget}
🎯 Interessi: ${requestData.interessi.join(', ') || 'Divertimento generale'}

📋 Itinerario personalizzato:
Stiamo elaborando il vostro itinerario perfetto con ChatGPT tramite Zapier...

⏰ L'itinerario dettagliato arriverà a breve!`;
      }
      
      // This public preview is intentionally not persisted. Checkout performs
      // its own live searches using the trip context selected by the user.
      const itineraryPreview = buildItineraryPreview({
        city: requestData.citta,
        startDate: requestData.date.startDate,
        endDate: requestData.date.endDate,
        people: requestData.persone,
        interests: requestData.interessi,
        budget: requestData.budget,
        content: itineraryContent,
      });
      
      return res.status(200).json({
        success: true,
        itinerary: itineraryPreview,
        aiContent: itineraryContent,
        zapierProcessed: !!zapierResponse,
        message: zapierResponse ? "Itinerario generato con AI" : "Itinerario in elaborazione tramite Zapier"
      });
      
    } catch (error: unknown) {
      console.error("Error generating itinerary", getSafeErrorMetadata(error));
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid itinerary parameters", 
          errors: fromZodError(error).message 
        });
      }
      
      return res.status(500).json({ message: "Failed to generate itinerary" });
    }
  });

  // Register Zapier integration routes
  registerZapierRoutes(app, isAuthenticated, isAdmin);

  // OpenAI Streaming Chat endpoint (with tool calls support)
  app.post("/api/chat/openai-stream", async (req: Request, res: Response) => {
    const parsedRequest = chatStreamRequestSchema.safeParse(req.body);
    if (!parsedRequest.success) {
      return res.status(400).json({ error: "Invalid chat request" });
    }

    const controller = new AbortController();
    let clientDisconnected = false;
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 45_000);
    const handleClose = () => {
      if (!res.writableEnded) {
        clientDisconnected = true;
        controller.abort();
      }
    };
    res.on("close", handleClose);

    try {
      const {
        message,
        selectedDestination,
        tripDetails,
        conversationHistory,
        partyType,
        originCity,
        flights,
      } = parsedRequest.data;

      if (!process.env.OPENAI_API_KEY) {
        return res.status(503).json({
          success: false, 
          error: "Assistant temporarily unavailable",
        });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const originIata = resolveIataCode(originCity) || "";
      const originCityName = originIata ? iataToCity(originIata) : "";

      const { streamOpenAIChatCompletionWithTools } = await import('./services/openai');

      const normalizedFlights = flights
        ? flights.flatMap((f) => {
            const departureAt = f.departure_at || f.departureAt;
            const returnAt = f.return_at || f.returnAt;
            const flightNumber =
              f.flight_number ||
              (typeof f.flightNumber === "number" ? f.flightNumber : undefined);
            if (!f.airline || !departureAt || !returnAt || !flightNumber) {
              return [];
            }
            return [{
              id: typeof f.id === "number" ? f.id : undefined,
              airline: f.airline,
              departure_at: departureAt,
              return_at: returnAt,
              flight_number: flightNumber,
              origin: f.origin,
              destination: f.destination,
              checkoutUrl: f.checkoutUrl,
            }];
          })
        : undefined;

      const context = {
        selectedDestination,
        tripDetails,
        partyType: partyType || 'bachelor',
        origin: originIata,
        originCityName,
        flights: normalizedFlights,
      };

      // Use the new tool-loop streaming function that properly executes tools
      // and feeds results back to OpenAI for natural conversation continuation
      for await (const chunk of streamOpenAIChatCompletionWithTools(
        message,
        context,
        conversationHistory,
        controller.signal,
      )) {
        if (controller.signal.aborted) break;

        if (chunk.type === "content") {
          res.write(`data: ${JSON.stringify({ content: chunk.content })}\n\n`);
        } else if (chunk.type === "tool_call") {
          res.write(`data: ${JSON.stringify({ tool_call: chunk.toolCall })}\n\n`);
        } else if (chunk.type === "tool_result") {
          // Send tool results to frontend for state updates (e.g., showing flight cards)
          res.write(`data: ${JSON.stringify({ tool_result: { name: chunk.name, result: chunk.result } })}\n\n`);
        }
      }

      if (clientDisconnected) return;
      if (timedOut) {
        res.write(`data: ${JSON.stringify({ error: "Assistant request timed out" })}\n\n`);
      } else {
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      }
      res.end();

    } catch (error: unknown) {
      if (controller.signal.aborted || res.writableEnded) return;
      console.error('OpenAI streaming failed', getSafeErrorMetadata(error));
      res.write(`data: ${JSON.stringify({ error: "Assistant temporarily unavailable" })}\n\n`);
      res.end();
    } finally {
      clearTimeout(timeout);
      res.off("close", handleClose);
    }
  });

  // Amadeus Hotels - search endpoint
  app.get("/api/hotels/search", async (req: Request, res: Response) => {
    const parsedQuery = hotelSearchQuerySchema.safeParse(req.query);

    if (!parsedQuery.success) {
      return res.status(400).json({ error: "Invalid hotel search parameters" });
    }

    try {
      const { cityCode, checkInDate, checkOutDate, adults, currency } = parsedQuery.data;

      const hotels = await searchHotels({
        cityCode,
        checkInDate,
        checkOutDate,
        adults,
        currency,
      });

      return res.json({
        cityCode,
        checkInDate,
        checkOutDate,
        adults,
        currency,
        hotels,
      });
    } catch (error: unknown) {
      console.error(
        "Amadeus hotel search error:",
        error instanceof Error ? error.message : "Unknown error",
      );
      if (error instanceof AmadeusTemporaryError) {
        res.setHeader("Retry-After", "5");
        return res.status(503).json({
          error: "Hotel service temporarily unavailable",
          code: error.code,
        });
      }
      return res.status(502).json({ error: "Hotel service temporarily unavailable" });
    }
  });

  // Flights search endpoint con checkoutUrl reali
  app.get("/api/flights/search", async (req: Request, res: Response) => {
    const parsedQuery = flightSearchQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return res.status(400).json({ error: "Invalid flight search parameters" });
    }

    const { origin, destination, departDate, returnDate, passengers, currency } = parsedQuery.data;
    const originIata = resolveIataCode(origin);
    const destIata = resolveIataCode(destination);
    if (!originIata || !destIata) {
      return res.status(400).json({ error: "Unsupported origin or destination" });
    }

    const numAdults = passengers > 9 ? 1 : passengers;

    try {

      const flightResults = await searchFlights({
        originCode: originIata,
        destinationCode: destIata,
        departureDate: departDate,
        returnDate,
        adults: numAdults,
        currency,
      });

      // Transform to match expected client format + add Aviasales checkout URLs
      const flights = flightResults
        .slice(0, 5)
        .map((f, idx) => {
          const checkoutUrl = buildAviasalesUrl({
            originIata,
            destinationIata: destIata,
            departDate,
            returnDate,
            adults: numAdults,
            partnerId: process.env.AVIASALES_PARTNER_ID || "byebi",
          });
          if (!checkoutUrl) return null;

          return {
            flightId: `flight-${idx + 1}`,
            airline: f.airlines.join(", "),
            price: f.price,
            currency: f.currency,
            departureAt: f.outbound[0]?.departure.at,
            returnAt: f.inbound?.[0]?.departure.at,
            stops: f.stops,
            duration: f.totalDuration,
            direct: f.stops === 0,
            bookingFlow: "REDIRECT" as const,
            checkoutUrl,
          };
        })
        .filter((flight): flight is NonNullable<typeof flight> => flight !== null);

      return res.json({
        origin: originIata,
        destination: destIata,
        departDate,
        returnDate,
        passengers,
        currency,
        flights,
      });
    } catch (error: unknown) {
      console.error(
        "Flight search error:",
        error instanceof Error ? error.message : "Unknown error",
      );
      if (error instanceof AmadeusTemporaryError) {
        res.setHeader("Retry-After", "5");
        return res.status(503).json({
          error: "Flight service temporarily unavailable",
          code: error.code,
        });
      }
      return res.status(502).json({ error: "Flight service temporarily unavailable" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
