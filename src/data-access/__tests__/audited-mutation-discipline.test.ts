/**
 * Audited-mutation discipline — static analysis.
 *
 * Every mutation of a table carrying `audit_trigger` must run inside a
 * withAuditedMutation callback, which writes the session context the trigger
 * reads. Without it the trigger inserts a NULL tenantId into AuditLog's NOT
 * NULL column and the mutation aborts — historically in silence, because
 * callers wrap side effects in catch-alls.
 *
 * Same technique as tenant-isolation.test.ts: read the source, no database.
 *
 * MIGRATION_ALLOWLIST holds files that predate the wrapper and set the context
 * by hand via setAuditContext. They work. The list may only ever SHRINK — do
 * not add to it.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { AUDITED_TABLES } from "@/lib/audit-triggers";

const ROOTS = ["src/actions", "src/jobs", "src/data-access"];

/** Legacy files that hand-roll setAuditContext. Shrink only. */
const MIGRATION_ALLOWLIST = new Set<string>(
  readdirSync(join(process.cwd(), "src/actions"), { recursive: true } as never)
    .filter((f): f is string => typeof f === "string" && f.endsWith(".ts"))
    .map((f) => join("src/actions", f))
    .filter((f) => {
      try {
        return readFileSync(join(process.cwd(), f), "utf-8").includes(
          "setAuditContext",
        );
      } catch {
        return false;
      }
    }),
);

/**
 * Pre-existing gaps this wrapper did NOT fix.
 *
 * These are NOT migrated — they are suspected broken. Each mutates an audited
 * table with its own client and no session context, so the trigger should be
 * inserting a NULL tenantId and aborting the write. They sit on user-facing
 * paths (tenant settings, user administration, compliance requirements) that
 * have no automated coverage, which is why nobody has noticed.
 *
 * Confirm against a database with the triggers attached, then fix and remove
 * from this list. It may only ever SHRINK.
 */
const KNOWN_UNAUDITED = new Set<string>([
  "src/actions/admin/manage-branch.ts",
  "src/actions/repeat-findings/confirm.ts",
  "src/actions/reports/compute-risk-rating.ts",
  "src/actions/user-invitations.ts",
  "src/data-access/compliance-management.ts",
  "src/data-access/onboarding.ts",
  "src/data-access/settings.ts",
  "src/data-access/users.ts",
]);

function walk(dir: string): string[] {
  return readdirSync(join(process.cwd(), dir)).flatMap((entry) => {
    const rel = join(dir, entry);
    if (statSync(join(process.cwd(), rel)).isDirectory()) return walk(rel);
    return rel.endsWith(".ts") && !rel.includes("__tests__") ? [rel] : [];
  });
}

/** `prisma.observation.create(` / `tx.emailLog.updateMany(` etc. */
function auditedMutations(source: string): string[] {
  const models = AUDITED_TABLES.map((t) => t[0].toLowerCase() + t.slice(1));
  const pattern = new RegExp(
    `\\.(${models.join("|")})\\s*\\.\\s*(create|createMany|update|updateMany|delete|deleteMany|upsert)\\b`,
    "g",
  );
  return [...source.matchAll(pattern)].map((m) => `${m[1]}.${m[2]}`);
}

describe("audited-mutation discipline", () => {
  const files = ROOTS.flatMap(walk);

  it("finds source to analyse", () => {
    expect(files.length).toBeGreaterThan(100);
  });

  it("mutates audited tables only through withAuditedMutation", () => {
    const offenders: string[] = [];

    for (const file of files) {
      if (MIGRATION_ALLOWLIST.has(file)) continue;
      if (KNOWN_UNAUDITED.has(file)) continue;
      if (file === "src/data-access/audited-mutation.ts") continue;

      const source = readFileSync(join(process.cwd(), file), "utf-8");
      const mutations = auditedMutations(source);
      if (mutations.length === 0) continue;

      if (!source.includes("withAuditedMutation")) {
        offenders.push(`${file} → ${[...new Set(mutations)].join(", ")}`);
      }
    }

    expect(offenders, `Mutations of audited tables without session context:
${offenders.join("\n")}

Wrap them in withAuditedMutation(actor, actionType, (tx) => ...).
Scheduled work uses systemActor(tenantId); one transaction carries one tenant.`).toEqual([]);
  });

  it("keeps the known-gap list shrinking, never growing", () => {
    // Every entry is a suspected-broken write path. Lower this as they are
    // fixed; never raise it.
    expect(KNOWN_UNAUDITED.size).toBeLessThanOrEqual(8);
  });

  it("keeps the allowlist shrinking, never growing", () => {
    // Snapshot of the legacy hand-rolled call sites at the time the wrapper
    // landed. Lower this number as files migrate; never raise it.
    expect(MIGRATION_ALLOWLIST.size).toBeLessThanOrEqual(67);
  });
});
