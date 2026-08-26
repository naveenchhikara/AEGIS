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
  const present = new Set(rows.map((r) => r.relname));
  return AUDITED_TABLES.filter((t) => present.has(t));
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

  for (const table of tables) {
    await db.$executeRawUnsafe(
      `ALTER TABLE "${table}" DISABLE TRIGGER audit_trigger`,
    );
  }

  try {
    return await fn();
  } finally {
    for (const table of tables) {
      await db.$executeRawUnsafe(
        `ALTER TABLE "${table}" ENABLE TRIGGER audit_trigger`,
      );
    }
  }
}
