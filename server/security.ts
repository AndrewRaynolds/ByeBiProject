import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { RequestHandler } from "express";

const commonOptions = {
  standardHeaders: "draft-7" as const,
  legacyHeaders: false,
  skip: (req: { method: string }) => req.method === "OPTIONS",
};

export function createConcurrencyLimiter(limit: number): RequestHandler {
  const activeRequests = new Map<string, number>();

  return (req, res, next) => {
    const key = ipKeyGenerator(req.ip ?? req.socket.remoteAddress ?? "unknown");
    const active = activeRequests.get(key) ?? 0;
    if (active >= limit) {
      return res.status(429).json({
        message: "Too many active AI requests. Please wait for one to finish.",
      });
    }

    activeRequests.set(key, active + 1);
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      const remaining = (activeRequests.get(key) ?? 1) - 1;
      if (remaining > 0) activeRequests.set(key, remaining);
      else activeRequests.delete(key);
    };

    res.once("finish", release);
    res.once("close", release);
    next();
  };
}

export const aiConcurrencyLimiter = createConcurrencyLimiter(2);

export const apiLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  limit: 300,
  message: { message: "Too many requests. Please try again later." },
});

export const aiLimiter = rateLimit({
  ...commonOptions,
  windowMs: 10 * 60 * 1000,
  limit: 20,
  message: { message: "AI request limit reached. Please try again later." },
});

export const externalApiLimiter = rateLimit({
  ...commonOptions,
  windowMs: 10 * 60 * 1000,
  limit: 60,
  message: { message: "Search request limit reached. Please try again later." },
});

export const commerceLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  limit: 30,
  message: { message: "Commerce request limit reached. Please try again later." },
});

export const blogSubmissionLimiter = rateLimit({
  ...commonOptions,
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: { message: "Story submission limit reached. Please try again later." },
});

export const webhookLimiter = rateLimit({
  ...commonOptions,
  windowMs: 60 * 1000,
  limit: 120,
  message: { message: "Webhook request limit reached." },
});
