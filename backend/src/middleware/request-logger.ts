import crypto from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const slowRequestMs = 1000;

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    if (res.statusCode >= 500 || durationMs >= slowRequestMs) {
      console.warn(JSON.stringify({
        event: "http_request",
        requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs,
      }));
    }
  });
  next();
}
