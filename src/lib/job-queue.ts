import "server-only";
import { PgBoss } from "pg-boss";

// ─── pg-boss Singleton ──────────────────────────────────────────────────────

let boss: PgBoss | null = null;
let started = false;

// ─── Job names ──────────────────────────────────────────────────────────────

export const JOB_NAMES = {
  PROCESS_NOTIFICATIONS: "process-notifications",
  SEND_WEEKLY_DIGEST: "send-weekly-digest",
  DEADLINE_CHECK: "deadline-check",
  GENERATE_BOARD_REPORT: "generate-board-report",
} as const;

/** Default queue options for notification queues */
export const QUEUE_OPTIONS = {
  retryLimit: 3,
  retryDelay: 60,
  retryBackoff: true,
  deleteAfterSeconds: 30 * 24 * 60 * 60, // 30 days
} as const;

/**
 * Get or create the pg-boss instance.
 * Uses the same DATABASE_URL as Prisma (no extra infrastructure).
 */
export function getJobQueue(): PgBoss {
  if (!boss) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required for pg-boss");
    }

    boss = new PgBoss({
      connectionString,
      monitorIntervalSeconds: 300,
    });

    boss.on("error", (error: Error) => {
      console.error("[pg-boss] Error:", error.message);
    });
  }

  return boss;
}

/**
 * Start pg-boss and register all job handlers.
 * Called from instrumentation.ts on server boot.
 */
export async function startWorkers(): Promise<void> {
  if (started) return;

  const queue = getJobQueue();
  await queue.start();
  started = true;

  console.log("[pg-boss] Started successfully");

  // Create queues with retry configuration
  await queue.createQueue(JOB_NAMES.PROCESS_NOTIFICATIONS, QUEUE_OPTIONS);
  await queue.createQueue(JOB_NAMES.DEADLINE_CHECK, QUEUE_OPTIONS);
  await queue.createQueue(JOB_NAMES.SEND_WEEKLY_DIGEST, QUEUE_OPTIONS);
  await queue.createQueue(JOB_NAMES.GENERATE_BOARD_REPORT, QUEUE_OPTIONS);

  // Schedule recurring jobs (IST = UTC+5:30, all cron in UTC)
  await queue.schedule(JOB_NAMES.PROCESS_NOTIFICATIONS, "* * * * *"); // every minute
  await queue.schedule(JOB_NAMES.DEADLINE_CHECK, "30 0 * * *"); // daily 00:30 UTC = 06:00 IST
  await queue.schedule(JOB_NAMES.SEND_WEEKLY_DIGEST, "30 4 * * 1"); // Monday 04:30 UTC = 10:00 IST

  // Placeholder handlers — 08-03 will implement real processing logic
  await queue.work(
    JOB_NAMES.PROCESS_NOTIFICATIONS,
    { batchSize: 50 },
    async (jobs) => {
      console.log(`[pg-boss] Processing ${jobs.length} notification jobs`);
    },
  );

  await queue.work(JOB_NAMES.DEADLINE_CHECK, async () => {
    console.log("[pg-boss] Running deadline check");
  });

  await queue.work(JOB_NAMES.SEND_WEEKLY_DIGEST, async () => {
    console.log("[pg-boss] Sending weekly digest");
  });

  await queue.work(JOB_NAMES.GENERATE_BOARD_REPORT, async (jobs) => {
    for (const job of jobs) {
      console.log("[pg-boss] Generating board report", job.data);
    }
  });
}

/**
 * Stop pg-boss gracefully.
 * Called during server shutdown.
 */
export async function stopWorkers(): Promise<void> {
  if (!boss || !started) return;

  await boss.stop({ graceful: true, timeout: 30000 });
  started = false;
  boss = null;

  console.log("[pg-boss] Stopped gracefully");
}
