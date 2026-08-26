/**
 * The tables carrying `audit_trigger`, and the sanctioned way to suspend it.
 *
 * Kept free of `server-only` so seed scripts (which run under tsx, outside the
 * Next.js runtime) can import it.
 */

/**
 * Tables with an AFTER INSERT/UPDATE/DELETE `audit_trigger`.
 *
 * Source of truth: prisma/migrations/20260209015123_audit_trigger (10 tables)
 * and 20260209220425_add_remaining_audit_triggers (4 more). Keep in step with
 * those migrations — the discipline test reads this list.
 */
export const AUDITED_TABLES = [
  "AuditArea",
  "AuditEngagement",
  "AuditPlan",
  "AuditeeResponse",
  "Branch",
  "ComplianceRequirement",
  "EmailLog",
  "Evidence",
  "NotificationQueue",
  "Observation",
  "ObservationTimeline",
  "Tenant",
  "User",
  "UserBranchAssignment",
  // Attached only where add_notification_tables.sql has been applied, but
  // included so the discipline test covers them everywhere.
  "NotificationPreference",
  "BoardReport",
] as const;

export type AuditedTable = (typeof AUDITED_TABLES)[number];

interface UnsafeRawExecutor {
  $executeRawUnsafe(query: string): Promise<unknown>;
  $queryRawUnsafe<T = unknown>(query: string): Promise<T>;
}

/**
 * Which audited tables actually carry the trigger right now.
 *
 * A database built by `prisma db push` alone has none: the triggers come from
 * the non-Prisma migration SQL applied by hand. Detaching what is not attached
 * would fail, so ask first.
 */
async function attachedTables(db: UnsafeRawExecutor): Promise<string[]> {
  const rows = await db.$queryRawUnsafe<{ relname: string }[]>(
    `SELECT c.relname
       FROM pg_trigger t
       JOIN pg_class c ON c.oid = t.tgrelid
      WHERE t.tgname = 'audit_trigger' AND NOT t.tgisinternal`,
  );
  // Deliberately NOT filtered through AUDITED_TABLES: databases initialised
  // with add_notification_tables.sql also carry audit_trigger on
  // NotificationPreference and BoardReport. Detach whatever is actually there.
  return rows.map((r) => r.relname);
}

/**
 * Run `fn` with the audit triggers suspended, then restore them.
 *
 * For seeding only. Seeded rows carry no audit history by design: fabricating
 * a trail for demo data would be dishonest in a product sold on audit
 * integrity, and the seed has no Actor to attribute rows to.
 *
 * Uses ALTER TABLE ... DISABLE TRIGGER, which the table owner may run.
 * `session_replication_role` (used by scripts/seed-full-audit-lifecycle.ts)
 * requires superuser, and dropping the trigger loses it outright if the
 * process dies mid-seed; this restores in a `finally`.
 *
 * Table names come from the AUDITED_TABLES constant, never from input.
 */
export async function withTriggersDetached<T>(
  db: UnsafeRawExecutor,
  fn: () => Promise<T>,
): Promise<T> {
  const tables = await attachedTables(db);

  // Track what was actually detached, and cover the detach loop itself: a
  // failure partway through (lock timeout, permissions) would otherwise leave
  // the earlier tables silently unaudited for good.
  const detached: string[] = [];

  try {
    for (const table of tables) {
      await db.$executeRawUnsafe(
        `ALTER TABLE "${table}" DISABLE TRIGGER audit_trigger`,
      );
      detached.push(table);
    }

    return await fn();
  } finally {
    let restoreError: unknown;
    for (const table of detached) {
      try {
        await db.$executeRawUnsafe(
          `ALTER TABLE "${table}" ENABLE TRIGGER audit_trigger`,
        );
      } catch (err) {
        // Keep restoring the rest: a table left unaudited is worse than a
        // lost error. Re-thrown once the loop finishes.
        restoreError ??= err;
      }
    }
    if (restoreError) throw restoreError;
  }
}
