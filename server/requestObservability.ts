import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import { log } from "./vite";

const redactSensitivePath = (path: string): string =>
  path.replace(
    /^\/api\/shared-trips\/[^/]+/,
    "/api/shared-trips/[REDACTED]",
  );

export const requestObservability: RequestHandler = (req, res, next) => {
  const requestId = randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  if (req.path.startsWith("/api")) {
    const startedAt = Date.now();
    res.once("finish", () => {
      log(
        `${req.method} ${redactSensitivePath(req.path)} ${res.statusCode} in ${Date.now() - startedAt}ms request_id=${requestId}`,
      );
    });
  }

  next();
};
