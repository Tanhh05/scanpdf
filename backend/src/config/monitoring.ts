import * as Sentry from "@sentry/node";
import { env } from "./env.js";

export function initMonitoring() {
  if (!env.SENTRY_DSN) return;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
    environment: env.NODE_ENV,
  });
}

export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (!env.SENTRY_DSN) return;
  Sentry.captureException(error, { extra: context });
}
