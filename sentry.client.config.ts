import * as Sentry from "@sentry/nextjs";

/**
 * Sentry Client-Side Configuration
 *
 * Initializes error tracking in the browser.
 * Only active when NEXT_PUBLIC_SENTRY_DSN is configured.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,

    // Low sample rate to stay within Sentry free tier (5K errors/month)
    tracesSampleRate: 0.1,

    // Capture 100% of sessions with errors, 0% without
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,

    // Filter out noisy browser errors
    ignoreErrors: [
      // Browser extensions
      "ResizeObserver loop",
      // Network errors from user connectivity
      "Failed to fetch",
      "Load failed",
      "NetworkError",
    ],
  });
}
