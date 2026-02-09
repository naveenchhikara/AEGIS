/**
 * Next.js instrumentation hook.
 *
 * Runs once on server start. Initializes pg-boss job queue
 * and registers scheduled workers for notifications, digests,
 * deadline checks, and report generation.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startWorkers } = await import("./lib/job-queue");
    await startWorkers();
  }
}
