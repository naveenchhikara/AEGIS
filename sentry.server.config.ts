import * as Sentry from "@sentry/nextjs";

/**
 * Sentry Server-Side Configuration
 *
 * Initializes error tracking for Node.js server runtime.
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
