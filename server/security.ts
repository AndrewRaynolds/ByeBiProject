import rateLimit from "express-rate-limit";

const commonOptions = {
  standardHeaders: "draft-7" as const,
  legacyHeaders: false,
};

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

export const webhookLimiter = rateLimit({
  ...commonOptions,
  windowMs: 60 * 1000,
  limit: 120,
  message: { message: "Webhook request limit reached." },
});
