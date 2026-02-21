import * as Sentry from "@sentry/nextjs";

/**
 * Sentry Edge Runtime Configuration
 *
 * Initializes error tracking for Edge Runtime (middleware).
 * Only active when SENTRY_DSN is configured.
 */
const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,

    // Low sample rate to stay within Sentry free tier
    tracesSampleRate: 0.1,
  });
}
