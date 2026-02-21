/**
 * Next.js instrumentation hook.
 *
 * Runs once on server start. Initializes:
 * - Sentry error tracking (server/edge runtimes)
 * - pg-boss job queue and scheduled workers
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
    const { startWorkers } = await import("./lib/job-queue");
    await startWorkers();
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}
