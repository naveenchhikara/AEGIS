# Integrity and Operations Hardening Implementation Plan (F07–F15)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the nine integrity, operations, and verification findings (F07–F15) from the AEGIS brownfield review by making tenant-relation resolution, workflow locking, evidence binding, RBIA freeze completeness, and notification claiming provably correct, and by turning loose SQL, worker shutdown, and test gating into release behaviour that CI enforces.

**Architecture:** Three layers, applied in order. First, a **verification substrate**: an ordered, idempotent database-object bootstrap plus a Postgres-backed integration test harness, because every correctness fix below is a change to a SQL predicate or a transaction boundary and cannot be honestly tested against a mock. Second, **correctness fixes** (F07–F11), each shipping with a regression test that fails before the fix. Third, **operational gating** (F15, F14) once the suite is worth blocking on.

**Tech Stack:** Next.js 16 (App Router), Prisma 7 + PostgreSQL 16, Vitest 4, Playwright 1.58, pg-boss 12, AWS S3, GitHub Actions.

**Spec:** `/Users/nc/.cursor/projects/Users-nc-Dev-AEGIS/canvases/AEGIS-brownfield-review.canvas.tsx` (findings F07–F15). Project conventions: `CLAUDE.md`; domain vocabulary: `CONTEXT.md`.

## Global Constraints

- **Use `npx -y pnpm@10` for every pnpm invocation.** The Dockerfile pins pnpm 9 and CI pins 10; pnpm 11 ignores the `pnpm.overrides` block in `package.json` and fails `--frozen-lockfile`.
- **Merging to `main` deploys to production.** Coolify auto-deploys and `main` has no branch protection. Every task in this plan ends at a commit on a feature branch, never a merge.
- **SQL migrations do not ride along with a deploy.** Anything added to the bootstrap manifest must be applied by hand to production before the code depending on it merges.
- Every audited write goes through `withAuditedMutation(actor, actionType, fn)` from `src/data-access/audited-mutation.ts`. The discipline test in `src/data-access/__tests__/audited-mutation-discipline.test.ts` fails the build otherwise. Its `MIGRATION_ALLOWLIST` may only ever **shrink**.
- Session GUCs read back as `''`, not NULL, on a pooled connection. Any new SQL reading them must use `NULLIF(current_setting(...), '')`.
- Tenant ID always comes from the authenticated session, never from action input.
- Use `@/*` path aliases; import icons from `@/lib/icons`; compose classes with `cn()`.
- Prisma model/enum additions require `npx -y pnpm@10 db:generate` before typechecking.

## Findings Covered

| ID  | Title                                                          | Task             |
| --- | -------------------------------------------------------------- | ---------------- |
| F12 | Database behaviour depends on manually applied loose SQL       | 1                |
| F13 | Critical behaviour lacks executable regression coverage        | 2, 3, 5, 6, 7, 9 |
| F08 | Workflow optimistic locking is a read-then-write check         | 3                |
| F07 | Cross-tenant relation IDs are not resolved before writes       | 4                |
| F10 | RBIA can freeze a partially scored examination                 | 5                |
| F09 | Evidence confirmation trusts caller-selected keys and metadata | 6                |
| F11 | Notification claiming and batching are not concurrency-safe    | 7                |
| F15 | Worker shutdown and HTTP cron routing are incomplete           | 8                |
| F14 | E2E failures do not gate production-bound merges               | 10               |

## Two Corrections to the Review

Source reading turned up two things the findings understate. Both are folded into the tasks below; an implementer should know they are deliberate, not scope creep.

1. **F12 is worse than "views and guards may be missing."** The `audit_trigger` on all 14 audited tables is created by _Prisma_ migrations (`20260209015123_audit_trigger`, `20260209220425_add_remaining_audit_triggers`), and CI/E2E builds its database with `prisma db push`, which does not run the migrations folder at all. `src/lib/audit-triggers.ts` already says so in a comment: "A database built by `prisma db push` alone has none." So CI exercises the audited-mutation machinery against a database where the audit trigger does not exist. Task 1 fixes the substrate, not just the views.

2. **F15's "documented external cron calls never reach the handler" hides a dead pipeline.** `POST /api/cron/escalation` calls `runEscalationJobInternal`, which drives the **ComplianceItem** escalation pipeline (R39). The pg-boss `deadline-check` job runs `processOverdueEscalation`, which is a _different_ job over **Observations**. Nothing schedules `runEscalationJobInternal`. Because middleware blocks the route, compliance escalation has never run automatically. Task 8 schedules it in pg-boss and deletes the route, rather than exposing a route under a second auth scheme.

## File Structure

**Created**

| Path                                       | Responsibility                                                      |
| ------------------------------------------ | ------------------------------------------------------------------- |
| `prisma/sql/manifest.ts`                   | Ordered, classified list of database objects applied outside Prisma |
| `prisma/sql/020_attach_audit_triggers.sql` | Idempotent attach of `audit_trigger` to the 14 audited tables       |
| `prisma/sql/050_observation_indexes.sql`   | Idempotent re-issue of the observation lifecycle indexes            |
| `prisma/sql/060_tenant_composite_fks.sql`  | Composite `(tenantId, id)` foreign keys Prisma cannot express       |
| `scripts/db-bootstrap.ts`                  | Applies the manifest in order                                       |
| `scripts/db-verify.ts`                     | Asserts required database objects exist; exits non-zero if not      |
| `vitest.integration.config.ts`             | Vitest project for Postgres-backed integration tests                |
| `tests/integration/global-setup.ts`        | Pushes schema, runs bootstrap, verifies, once per run               |
| `tests/integration/harness.ts`             | Tenant/user fixtures, truncation, session mocking helpers           |
| `tests/integration/server-only-stub.ts`    | Empty module aliased over `server-only` for Node-environment tests  |
| `src/data-access/tenant-refs.ts`           | `requireTenantRefs` — resolves referenced IDs under one tenant      |
| `src/data-access/upload-intents.ts`        | Create and consume upload intents                                   |
| `src/lib/rbia-completeness.ts`             | Pure function: which selected leaves are unscored                   |
| `tests/e2e/smoke.spec.ts`                  | Blocking critical-path browser subset                               |

**Modified**

| Path                                                         | Change                                                                                                                                                                |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `prisma/schema.prisma`                                       | `UploadIntent` + `UploadPurpose`; `NotificationQueue.claimId`; `ExaminationResponse.isNotApplicable`/`notApplicableReason`; `@@unique([tenantId, id])` on four models |
| `package.json`                                               | `db:bootstrap`, `db:verify`, `test:integration`, `test:e2e:smoke` scripts                                                                                             |
| `.github/workflows/ci.yml`                                   | Bootstrap + verify steps; `integration-test` job; blocking `e2e-smoke` job                                                                                            |
| `src/actions/observations/transition.ts`                     | Atomic conditional update (F08)                                                                                                                                       |
| `src/actions/audit-execution/create-engagement.ts`           | Tenant-scoped relation resolution (F07)                                                                                                                               |
| `src/actions/audit-execution/assign-team.ts`                 | Tenant-scoped relation resolution (F07)                                                                                                                               |
| `src/actions/rbia/freeze.ts`                                 | Module-selection scoping + completeness gate (F10)                                                                                                                    |
| `src/actions/auditee.ts`                                     | Upload-intent binding (F09)                                                                                                                                           |
| `src/actions/audit-execution/upload-examination-evidence.ts` | Upload-intent binding (F09)                                                                                                                                           |
| `src/jobs/notification-processor.ts`                         | Atomic claim + tenant/recipient batching (F11)                                                                                                                        |
| `src/data-access/notifications.ts`                           | Claim helper; wrap preference writes                                                                                                                                  |
| `src/lib/job-queue.ts`                                       | Compliance escalation queue + schedule; shutdown export                                                                                                               |
| `src/jobs/index.ts`                                          | Compliance escalation handler                                                                                                                                         |
| `src/instrumentation.ts`                                     | SIGTERM/SIGINT → graceful stop (F15)                                                                                                                                  |
| `src/lib/audit-triggers.ts`                                  | Comment correction once triggers are guaranteed                                                                                                                       |
| `tests/e2e/observation-lifecycle.spec.ts`                    | Unskip Group 3; make Group 4 deterministic                                                                                                                            |
| `scripts/seed-full-audit-lifecycle.ts`                       | Add a COMPLIANCE-state fixture                                                                                                                                        |

**Deleted**

| Path                                          | Reason                                                    |
| --------------------------------------------- | --------------------------------------------------------- |
| `src/app/api/cron/escalation/route.ts`        | Unreachable; replaced by a pg-boss schedule               |
| `prisma/migrations/*.sql` (five files, moved) | Superseded — relocated to `prisma/migrations/superseded/` |

---

### Task 1: Database object bootstrap and verification (F12)

Today the database's behaviour depends on a human remembering to run loose `.sql` files. CI never runs them, so a green build proves nothing about triggers, views, or guards. This task makes the set of non-Prisma database objects an ordered, idempotent, verifiable artifact.

**Files:**

- Create: `prisma/sql/manifest.ts`
- Create: `prisma/sql/020_attach_audit_triggers.sql`
- Create: `prisma/sql/050_observation_indexes.sql`
- Create: `scripts/db-bootstrap.ts`
- Create: `scripts/db-verify.ts`
- Create: `prisma/migrations/superseded/README.md`
- Modify: `package.json` (scripts block, lines 6–26)
- Modify: `.github/workflows/ci.yml:269-279`
- Modify: `src/data-access/notifications.ts:74-92,101-150`
- Move: `prisma/migrations/20260209_onboarding_models.sql`, `add_rls_policies.sql`, `add_auditee_portal_schema.sql`, `add_notification_tables.sql`, `add_audit_log_rules.sql` → `prisma/migrations/superseded/`

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces:
  - `prisma/sql/manifest.ts` exports `SQL_MANIFEST: readonly string[]` (repo-relative paths, apply order) and `REQUIRED_OBJECTS: RequiredObjects`.
  - `scripts/db-bootstrap.ts` runnable as `pnpm db:bootstrap`, exits 0 on success.
  - `scripts/db-verify.ts` runnable as `pnpm db:verify`, exits 1 listing every missing object.
  - Both read `DATABASE_URL` from the environment.

**Classification decisions (do not re-litigate these while implementing):**

| File                                   | Disposition    | Why                                                                                                                               |
| -------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `20260826_audit_trigger_null_safe.sql` | **Apply, 1st** | `CREATE OR REPLACE FUNCTION` — idempotent, and the null-safe function must exist before triggers fire                             |
| `020_attach_audit_triggers.sql` (new)  | **Apply, 2nd** | The Prisma migrations that attach the triggers never run under `db push`                                                          |
| `20260209_dashboard_views.sql`         | **Apply, 3rd** | All `CREATE OR REPLACE` — idempotent                                                                                              |
| `20260222_rbia_db_guards.sql`          | **Apply, 4th** | Idempotent by design                                                                                                              |
| `050_observation_indexes.sql` (new)    | **Apply, 5th** | Copy of `add_observation_lifecycle_indexes.sql` minus its non-idempotent `CREATE POLICY` tail                                     |
| `20260209_onboarding_models.sql`       | **Superseded** | `CREATE TYPE "UserStatus"` and bare `ADD COLUMN`s; all of it is now in `schema.prisma`, so it errors on a pushed database         |
| `add_rls_policies.sql`                 | **Superseded** | Creates the `aegis_app` role and enables RLS. `CLAUDE.md`: "Tenant isolation is enforced in application code, not PostgreSQL RLS" |
| `add_auditee_portal_schema.sql`        | **Superseded** | RLS policies + grants to `aegis_app`                                                                                              |
| `add_notification_tables.sql`          | **Superseded** | RLS + grants; its trigger attachments are absorbed into `020_attach_audit_triggers.sql`                                           |
| `add_audit_log_rules.sql`              | **Superseded** | Non-idempotent `CREATE RULE`, grants to `aegis_app`                                                                               |

`020_attach_audit_triggers.sql` deliberately attaches to the **14** tables the two Prisma migrations cover — not to `NotificationPreference` or `BoardReport`. Those two appear in `AUDITED_TABLES` but are only triggered where `add_notification_tables.sql` was applied. Attaching them would make `getNotificationPreferences` and `updateNotificationPreferences` fail, because they write `NotificationPreference` outside `withAuditedMutation`. Step 8 fixes those two call sites so the codebase is correct either way; widening the trigger set is a separate decision.

- [ ] **Step 1: Write the failing verification script test**

Create `src/lib/__tests__/sql-manifest.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { join } from "path";
import { SQL_MANIFEST, REQUIRED_OBJECTS } from "../../../prisma/sql/manifest";

describe("SQL manifest", () => {
  it("lists files that all exist", () => {
    const missing = SQL_MANIFEST.filter(
      (p) => !existsSync(join(process.cwd(), p)),
    );
    expect(missing).toEqual([]);
  });

  it("applies the audit trigger function before attaching triggers", () => {
    const fn = SQL_MANIFEST.findIndex((p) =>
      p.includes("audit_trigger_null_safe"),
    );
    const attach = SQL_MANIFEST.findIndex((p) =>
      p.includes("attach_audit_triggers"),
    );
    expect(fn).toBeGreaterThanOrEqual(0);
    expect(attach).toBeGreaterThan(fn);
  });

  it("requires the audit trigger on every audited table the migrations cover", () => {
    expect(REQUIRED_OBJECTS.triggers).toHaveLength(14);
    expect(REQUIRED_OBJECTS.triggers).toContain("Observation");
    expect(REQUIRED_OBJECTS.triggers).toContain("NotificationQueue");
    expect(REQUIRED_OBJECTS.triggers).not.toContain("NotificationPreference");
  });

  it("names no superseded file", () => {
    const superseded = SQL_MANIFEST.filter((p) => p.includes("superseded"));
    expect(superseded).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx -y pnpm@10 vitest run src/lib/__tests__/sql-manifest.test.ts`
Expected: FAIL — `Cannot find module '../../../prisma/sql/manifest'`.

- [ ] **Step 3: Write the manifest**

Create `prisma/sql/manifest.ts`:

```typescript
/**
 * Database objects that live outside Prisma's schema, in apply order.
 *
 * `prisma db push` creates tables and indexes from schema.prisma and nothing
 * else. Triggers, views, functions, CHECK constraints and composite foreign
 * keys come from here. `pnpm db:bootstrap` applies them; `pnpm db:verify`
 * asserts they landed.
 *
 * Order matters: the audit trigger function must exist before any trigger
 * references it.
 */
export const SQL_MANIFEST = [
  "prisma/migrations/20260826_audit_trigger_null_safe.sql",
  "prisma/sql/020_attach_audit_triggers.sql",
  "prisma/migrations/20260209_dashboard_views.sql",
  "prisma/migrations/20260222_rbia_db_guards.sql",
  "prisma/sql/050_observation_indexes.sql",
] as const;

/** Tables carrying `audit_trigger`, per the two Prisma trigger migrations. */
const AUDIT_TRIGGER_TABLES = [
  "Tenant",
  "User",
  "Branch",
  "AuditArea",
  "AuditPlan",
  "AuditEngagement",
  "Observation",
  "ObservationTimeline",
  "Evidence",
  "ComplianceRequirement",
  "UserBranchAssignment",
  "AuditeeResponse",
  "NotificationQueue",
  "EmailLog",
] as const;

export interface RequiredObjects {
  functions: readonly string[];
  views: readonly string[];
  triggers: readonly string[];
  constraints: readonly string[];
}

export const REQUIRED_OBJECTS: RequiredObjects = {
  functions: [
    "audit_trigger_function",
    "prevent_frozen_score_update",
    "fn_extract_fiscal_year",
    "fn_dashboard_health_score",
  ],
  views: [
    "v_compliance_summary",
    "v_observation_aging",
    "v_observation_severity",
    "v_audit_coverage_branch",
    "v_auditor_workload",
  ],
  triggers: AUDIT_TRIGGER_TABLES,
  constraints: ["examination_node_path_ends_with_code"],
};
```

- [ ] **Step 4: Write the idempotent trigger attachment**

Create `prisma/sql/020_attach_audit_triggers.sql`:

```sql
-- Attach `audit_trigger` to every audited table, idempotently.
--
-- The original attachments live in two Prisma migrations
-- (20260209015123_audit_trigger, 20260209220425_add_remaining_audit_triggers)
-- which `prisma db push` never runs. This file is the single place the
-- attachment is expressed for any database built by push, and it is safe to
-- re-run against a database that already has them.
--
-- Requires audit_trigger_function() to exist — see the null-safe function file
-- earlier in the manifest.

DO $$
DECLARE
  t TEXT;
  audited TEXT[] := ARRAY[
    'Tenant', 'User', 'Branch', 'AuditArea', 'AuditPlan', 'AuditEngagement',
    'Observation', 'ObservationTimeline', 'Evidence', 'ComplianceRequirement',
    'UserBranchAssignment', 'AuditeeResponse', 'NotificationQueue', 'EmailLog'
  ];
BEGIN
  FOREACH t IN ARRAY audited LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_trigger ON %I', t);
    EXECUTE format(
      'CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON %I
         FOR EACH ROW EXECUTE FUNCTION audit_trigger_function()',
      t
    );
  END LOOP;
END
$$;
```

- [ ] **Step 5: Write the idempotent observation indexes**

Create `prisma/sql/050_observation_indexes.sql`:

```sql
-- Observation lifecycle indexes (OBS-09 repeat detection, timeline ordering,
-- optimistic-lock lookups).
--
-- Replaces add_observation_lifecycle_indexes.sql, whose trailing
-- `CREATE POLICY tenant_isolation_obs_rbi` is not idempotent and belongs to
-- the RLS path this project does not use.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_observation_repeat_detection
ON "Observation" ("tenantId", "branchId", "auditAreaId", status)
WHERE status = 'CLOSED';

CREATE INDEX IF NOT EXISTS idx_observation_title_trgm
ON "Observation" USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_timeline_observation_ordered
ON "ObservationTimeline" ("observationId", "createdAt");

CREATE INDEX IF NOT EXISTS idx_observation_version
ON "Observation" (id, version);
```

- [ ] **Step 6: Write the bootstrap and verify scripts**

Create `scripts/db-bootstrap.ts`:

```typescript
/**
 * Apply every non-Prisma database object, in manifest order.
 *
 * Usage: pnpm db:bootstrap
 * Requires DATABASE_URL. Safe to re-run — every file in the manifest is
 * idempotent, which is a precondition for being in the manifest at all.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { Client } from "pg";
import { SQL_MANIFEST } from "../prisma/sql/manifest";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");

  const client = new Client({ connectionString });
  await client.connect();

  try {
    for (const relativePath of SQL_MANIFEST) {
      const sql = readFileSync(join(process.cwd(), relativePath), "utf-8");
      process.stdout.write(`applying ${relativePath} ... `);
      await client.query(sql);
      process.stdout.write("ok\n");
    }
  } finally {
    await client.end();
  }

  console.log(`\n${SQL_MANIFEST.length} SQL files applied.`);
}

main().catch((error) => {
  console.error("\nbootstrap failed:", error);
  process.exit(1);
});
```

Create `scripts/db-verify.ts`:

```typescript
/**
 * Assert every required database object exists.
 *
 * Usage: pnpm db:verify
 * Exits 1 and lists what is missing. Run it after db:bootstrap in CI, and
 * against production after applying SQL by hand.
 */
import { Client } from "pg";
import { REQUIRED_OBJECTS } from "../prisma/sql/manifest";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");

  const client = new Client({ connectionString });
  await client.connect();
  const missing: string[] = [];

  try {
    const functions = await client.query<{ proname: string }>(
      `SELECT p.proname FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'`,
    );
    const haveFunctions = new Set(functions.rows.map((r) => r.proname));
    for (const fn of REQUIRED_OBJECTS.functions) {
      if (!haveFunctions.has(fn)) missing.push(`function ${fn}`);
    }

    const views = await client.query<{ viewname: string }>(
      `SELECT viewname FROM pg_views WHERE schemaname = 'public'`,
    );
    const haveViews = new Set(views.rows.map((r) => r.viewname));
    for (const view of REQUIRED_OBJECTS.views) {
      if (!haveViews.has(view)) missing.push(`view ${view}`);
    }

    const triggers = await client.query<{ relname: string }>(
      `SELECT c.relname FROM pg_trigger t
         JOIN pg_class c ON c.oid = t.tgrelid
        WHERE t.tgname = 'audit_trigger' AND NOT t.tgisinternal`,
    );
    const haveTriggers = new Set(triggers.rows.map((r) => r.relname));
    for (const table of REQUIRED_OBJECTS.triggers) {
      if (!haveTriggers.has(table)) missing.push(`audit_trigger on ${table}`);
    }
    const extra = [...haveTriggers].filter(
      (t) => !REQUIRED_OBJECTS.triggers.includes(t),
    );
    if (extra.length > 0) {
      console.warn(
        `note: audit_trigger also attached to ${extra.join(", ")} — ` +
          `writes to those tables must use withAuditedMutation`,
      );
    }

    const constraints = await client.query<{ conname: string }>(
      `SELECT conname FROM pg_constraint`,
    );
    const haveConstraints = new Set(constraints.rows.map((r) => r.conname));
    for (const c of REQUIRED_OBJECTS.constraints) {
      if (!haveConstraints.has(c)) missing.push(`constraint ${c}`);
    }
  } finally {
    await client.end();
  }

  if (missing.length > 0) {
    console.error("Missing required database objects:");
    for (const m of missing) console.error(`  - ${m}`);
    console.error("\nRun: pnpm db:bootstrap");
    process.exit(1);
  }

  console.log("All required database objects present.");
}

main().catch((error) => {
  console.error("verify failed:", error);
  process.exit(1);
});
```

- [ ] **Step 7: Retire the superseded SQL**

```bash
mkdir -p prisma/migrations/superseded
git mv prisma/migrations/20260209_onboarding_models.sql prisma/migrations/superseded/
git mv prisma/migrations/add_rls_policies.sql prisma/migrations/superseded/
git mv prisma/migrations/add_auditee_portal_schema.sql prisma/migrations/superseded/
git mv prisma/migrations/add_notification_tables.sql prisma/migrations/superseded/
git mv prisma/migrations/add_audit_log_rules.sql prisma/migrations/superseded/
git mv prisma/migrations/add_observation_lifecycle_indexes.sql prisma/migrations/superseded/
```

Create `prisma/migrations/superseded/README.md`:

```markdown
# Superseded SQL

These files are kept for history. **Do not apply them.** The live set of
non-Prisma database objects is `prisma/sql/manifest.ts`, applied by
`pnpm db:bootstrap` and checked by `pnpm db:verify`.

| File                                    | Why it is not applied                                                                                                                                |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20260209_onboarding_models.sql`        | Creates the `UserStatus` enum and adds User/Tenant/ComplianceRequirement columns that `schema.prisma` now owns. Errors against a pushed database.    |
| `add_rls_policies.sql`                  | Creates the `aegis_app` role and enables row-level security. Tenant isolation is enforced in application code, not PostgreSQL RLS (see `CLAUDE.md`). |
| `add_auditee_portal_schema.sql`         | RLS policies and `aegis_app` grants.                                                                                                                 |
| `add_notification_tables.sql`           | RLS policies and grants. Its `audit_trigger` attachments are absorbed into `prisma/sql/020_attach_audit_triggers.sql`.                               |
| `add_audit_log_rules.sql`               | Non-idempotent `CREATE RULE` plus `aegis_app` grants.                                                                                                |
| `add_observation_lifecycle_indexes.sql` | Replaced by `prisma/sql/050_observation_indexes.sql`, which drops the non-idempotent `CREATE POLICY` tail.                                           |
```

- [ ] **Step 8: Wrap the two unaudited NotificationPreference writes**

In `src/data-access/notifications.ts`, replace the body of `getNotificationPreferences` (currently `src/data-access/notifications.ts:74-92`) with:

```typescript
export async function getNotificationPreferences(session: Session) {
  const tenantId = extractTenantId(session);
  const userId = session.user.id;
  const db = prismaForTenant(tenantId);

  const existing = await db.notificationPreference.findUnique({
    where: { userId },
  });

  if (existing) return existing;

  return withAuditedMutation(userActor(session), "notification.queued", (tx) =>
    tx.notificationPreference.create({
      data: {
        userId,
        tenantId,
        emailEnabled: true,
        digestPreference: "immediate",
      },
    }),
  );
}
```

and the final `db.notificationPreference.upsert(...)` in `updateNotificationPreferences` (`src/data-access/notifications.ts:133-149`) with:

```typescript
return withAuditedMutation(userActor(session), "notification.queued", (tx) =>
  tx.notificationPreference.upsert({
    where: { userId },
    update: {
      ...(prefs.emailEnabled !== undefined && {
        emailEnabled: prefs.emailEnabled,
      }),
      ...(prefs.digestPreference !== undefined && {
        digestPreference: prefs.digestPreference,
      }),
    },
    create: {
      userId,
      tenantId,
      emailEnabled: prefs.emailEnabled ?? true,
      digestPreference: prefs.digestPreference ?? "immediate",
    },
  }),
);
```

- [ ] **Step 9: Add the scripts**

In `package.json`, inside `"scripts"`, after `"db:seed"`:

```json
    "db:bootstrap": "tsx scripts/db-bootstrap.ts",
    "db:verify": "tsx scripts/db-verify.ts",
```

- [ ] **Step 10: Wire bootstrap into CI**

In `.github/workflows/ci.yml`, in the `e2e` job, replace the `Push database schema` step (`.github/workflows/ci.yml:269-271`) with:

```yaml
- name: Push database schema
  run: pnpm db:push

- name: Apply non-Prisma database objects
  run: pnpm db:bootstrap

- name: Verify required database objects
  run: pnpm db:verify
```

- [ ] **Step 11: Run the tests**

Run: `npx -y pnpm@10 vitest run src/lib/__tests__/sql-manifest.test.ts`
Expected: PASS, 4 tests.

Run: `npx -y pnpm@10 lint && npx -y pnpm@10 tsc --noEmit`
Expected: clean.

- [ ] **Step 12: Prove the bootstrap works against a real database**

```bash
docker run -d --name aegis-bootstrap-check -e POSTGRES_PASSWORD=test -e POSTGRES_DB=aegis -p 55432:5432 postgres:16-alpine
sleep 5
export DATABASE_URL="postgresql://postgres:test@localhost:55432/aegis"
npx -y pnpm@10 db:push
npx -y pnpm@10 db:verify   # expect exit 1, listing every missing object
npx -y pnpm@10 db:bootstrap
npx -y pnpm@10 db:verify   # expect "All required database objects present."
npx -y pnpm@10 db:bootstrap && npx -y pnpm@10 db:verify   # re-run proves idempotency
docker rm -f aegis-bootstrap-check
```

Expected: the first `db:verify` fails listing 14 missing triggers and 5 missing views; after bootstrap both runs pass.

- [ ] **Step 13: Commit**

```bash
git add prisma/sql scripts/db-bootstrap.ts scripts/db-verify.ts \
        prisma/migrations/superseded src/lib/__tests__/sql-manifest.test.ts \
        src/data-access/notifications.ts package.json .github/workflows/ci.yml
git commit -m "feat(db): ordered, verifiable bootstrap for non-Prisma database objects

CI built its database with db:push, which never runs the migrations folder,
so the audit_trigger on all 14 audited tables was absent from every test run.
Adds an ordered idempotent manifest, a bootstrap script, and a verify script
that fails loudly, and retires five superseded SQL files.

Refs F12"
```

---

### Task 2: Postgres-backed integration test harness (F13)

Every remaining correctness fix is a change to a WHERE predicate or a transaction boundary. Mocked Prisma cannot tell a correct predicate from an incorrect one. This task builds the harness those tests need, so Tasks 3–7 can each be genuine TDD.

**Files:**

- Create: `vitest.integration.config.ts`
- Create: `tests/integration/global-setup.ts`
- Create: `tests/integration/harness.ts`
- Create: `tests/integration/server-only-stub.ts`
- Create: `src/actions/observations/__integration__/harness.test.ts`
- Modify: `package.json` (scripts)
- Modify: `.github/workflows/ci.yml` (new `integration-test` job)

**Interfaces:**

- Consumes: `pnpm db:bootstrap`, `pnpm db:verify` from Task 1.
- Produces, from `tests/integration/harness.ts`:
  - `resetDatabase(): Promise<void>` — truncates all tenant data, leaves schema and objects.
  - `createTenant(name?: string): Promise<{ id: string }>`
  - `createUser(tenantId: string, roles: string[]): Promise<{ id: string; email: string }>`
  - `fakeSession(user: { id: string; tenantId: string; roles: string[] }): AuthSessionLike` where `AuthSessionLike = { user: { id: string; tenantId: string; roles: string[] }; session: { id: string } }`
  - `mockSessionModule(session: AuthSessionLike): void` — sets what `getRequiredSession()` returns.
  - `integrationPrisma: PrismaClient` — a raw client for assertions.

**Constraints that shape the design:**

- Server action files carry `"use server"`. Outside the Next compiler that is an inert string directive, so importing them in Vitest works.
- Actions import `server-only`, which throws in a non-RSC environment. Alias it to a stub.
- Actions call `revalidatePath` from `next/cache`. Mock it.
- pg-boss must never start; nothing imports `instrumentation.ts`, so no action needed, but do not add one.
- Tests share one database, so run single-threaded and truncate between tests.

- [ ] **Step 1: Write the harness self-test first**

Create `src/actions/observations/__integration__/harness.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import {
  resetDatabase,
  createTenant,
  createUser,
  integrationPrisma,
} from "../../../../tests/integration/harness";

describe("integration harness", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("creates an isolated tenant and user", async () => {
    const tenant = await createTenant("Alpha Cooperative Bank");
    const user = await createUser(tenant.id, ["AUDITOR"]);

    const found = await integrationPrisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { tenantId: true, roles: true },
    });

    expect(found.tenantId).toBe(tenant.id);
    expect(found.roles).toEqual(["AUDITOR"]);
  });

  it("truncates between tests", async () => {
    const count = await integrationPrisma.tenant.count();
    expect(count).toBe(0);
  });

  it("has the audit trigger attached", async () => {
    const rows = await integrationPrisma.$queryRawUnsafe<{ relname: string }[]>(
      `SELECT c.relname FROM pg_trigger t
         JOIN pg_class c ON c.oid = t.tgrelid
        WHERE t.tgname = 'audit_trigger' AND NOT t.tgisinternal`,
    );
    expect(rows.map((r) => r.relname)).toContain("Observation");
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx -y pnpm@10 vitest run --config vitest.integration.config.ts`
Expected: FAIL — config file does not exist.

- [ ] **Step 3: Write the integration Vitest config**

Create `vitest.integration.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/__integration__/**/*.test.ts"],
    globalSetup: ["tests/integration/global-setup.ts"],
    // One shared database: no parallelism, and generous timeouts because each
    // test truncates and re-seeds its own fixtures.
    pool: "threads",
    poolOptions: { threads: { singleThread: true } },
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // `server-only` throws outside an RSC environment; the DAL imports it.
      "server-only": path.resolve(
        __dirname,
        "./tests/integration/server-only-stub.ts",
      ),
    },
  },
});
```

Create `tests/integration/server-only-stub.ts`:

```typescript
// Intentionally empty. Aliased in place of the `server-only` package so
// data-access modules can be imported by Node-environment integration tests.
export {};
```

- [ ] **Step 4: Write the global setup**

Create `tests/integration/global-setup.ts`:

```typescript
import { execSync } from "child_process";

/**
 * Prepare the integration database once per run: schema, then the non-Prisma
 * objects, then a hard assertion that they are present. Without the bootstrap
 * the audit trigger is absent and every audited write silently proves nothing.
 */
export default function setup() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required for integration tests. Start one with:\n" +
        "  docker run -d --name aegis-test -e POSTGRES_PASSWORD=test " +
        "-e POSTGRES_DB=aegis_test -p 55432:5432 postgres:16-alpine\n" +
        "  export DATABASE_URL=postgresql://postgres:test@localhost:55432/aegis_test",
    );
  }

  const run = (cmd: string) =>
    execSync(cmd, { stdio: "inherit", env: process.env });

  run("npx prisma db push --skip-generate --force-reset");
  run("npx tsx scripts/db-bootstrap.ts");
  run("npx tsx scripts/db-verify.ts");
}
```

- [ ] **Step 5: Write the harness**

Create `tests/integration/harness.ts`:

```typescript
import { randomUUID } from "crypto";
import { vi } from "vitest";
import { prisma } from "@/lib/prisma";

/**
 * The application's own client, not a second one.
 *
 * This project runs Prisma 7 with the `@prisma/adapter-pg` driver adapter
 * (see `src/lib/prisma.ts`), so a bare `new PrismaClient()` throws. Reusing the
 * singleton also keeps assertions on the same pool as the code under test, so
 * a test cannot read a snapshot the action has not committed yet.
 */
export const integrationPrisma = prisma;

export interface AuthSessionLike {
  user: { id: string; tenantId: string; roles: string[] };
  session: { id: string };
}

/**
 * Tables are truncated rather than dropped: the schema, triggers, views and
 * constraints from global setup must survive between tests.
 */
export async function resetDatabase(): Promise<void> {
  const tables = await integrationPrisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
     WHERE schemaname = 'public' AND tablename NOT LIKE '_prisma%'
  `;
  const quoted = tables.map((t) => `"${t.tablename}"`).join(", ");
  // AuditLog carries no delete rule in this project, so a plain TRUNCATE works.
  await integrationPrisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`,
  );
}

export async function createTenant(name = "Test Cooperative Bank") {
  return integrationPrisma.tenant.create({
    data: { name, shortName: name.slice(0, 12) },
    select: { id: true },
  });
}

export async function createUser(tenantId: string, roles: string[]) {
  const email = `user-${randomUUID()}@example.test`;
  return integrationPrisma.user.create({
    data: {
      email,
      name: "Test User",
      tenantId,
      roles,
      status: "ACTIVE",
      emailVerified: true,
    },
    select: { id: true, email: true },
  });
}

export function fakeSession(user: {
  id: string;
  tenantId: string;
  roles: string[];
}): AuthSessionLike {
  return { user, session: { id: randomUUID() } };
}

/**
 * Point `getRequiredSession()` at a fixture. Call before importing the action
 * under test, or use `vi.resetModules()` between switches of identity.
 */
export function mockSessionModule(session: AuthSessionLike): void {
  vi.doMock("@/data-access/session", () => ({
    getRequiredSession: vi.fn(async () => session),
  }));
  vi.doMock("next/cache", () => ({
    revalidatePath: vi.fn(),
    revalidateTag: vi.fn(),
  }));
}
```

- [ ] **Step 6: Run the harness test**

```bash
docker run -d --name aegis-test -e POSTGRES_PASSWORD=test -e POSTGRES_DB=aegis_test -p 55432:5432 postgres:16-alpine
sleep 5
export DATABASE_URL="postgresql://postgres:test@localhost:55432/aegis_test"
npx -y pnpm@10 vitest run --config vitest.integration.config.ts
```

Expected: PASS, 3 tests. If `createTenant` fails on a required column, read `prisma/schema.prisma`'s `Tenant` model and add the missing required fields to the fixture — do not make them optional in the schema.

- [ ] **Step 7: Add the script**

In `package.json`, after `"test:coverage"`:

```json
    "test:integration": "vitest run --config vitest.integration.config.ts",
```

- [ ] **Step 8: Add the CI job**

In `.github/workflows/ci.yml`, after the `unit-test` job (which ends at `.github/workflows/ci.yml:191`), add:

```yaml
integration-test:
  runs-on: ubuntu-latest
  services:
    postgres:
      image: postgres:16-alpine
      env:
        POSTGRES_USER: test
        POSTGRES_PASSWORD: testpassword
        POSTGRES_DB: aegis_integration
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
      ports:
        - 5432:5432
  env:
    DATABASE_URL: postgresql://test:testpassword@localhost:5432/aegis_integration
    SKIP_ENV_VALIDATION: "1"
    BETTER_AUTH_SECRET: ci-integration-secret-0123456789abcdef0123456789
    BETTER_AUTH_URL: http://localhost:3000
    NEXT_PUBLIC_APP_URL: http://localhost:3000
  steps:
    - name: Checkout code
      uses: actions/checkout@v6

    - name: Install pnpm
      uses: pnpm/action-setup@v4
      with:
        version: 10

    - name: Setup Node.js
      uses: actions/setup-node@v6
      with:
        node-version: 22
        cache: "pnpm"

    - name: Install dependencies
      run: pnpm install --frozen-lockfile

    - name: Generate Prisma Client
      run: pnpm prisma generate

    - name: Run integration tests
      run: pnpm test:integration
```

This job has no `continue-on-error`: it blocks from the day it lands, because it starts with three passing tests.

- [ ] **Step 9: Commit**

```bash
git add vitest.integration.config.ts tests/integration \
        src/actions/observations/__integration__ package.json .github/workflows/ci.yml
git commit -m "test: Postgres-backed integration harness

Server actions are mostly SQL predicates and transaction boundaries, which a
mocked Prisma cannot verify. Adds a real-database Vitest project with schema
bootstrap, truncation between tests, and session mocking, plus a blocking CI
job.

Refs F13"
```

---

### Task 3: Atomic observation transitions (F08)

`transitionObservation` reads `version`, compares it in application code, then updates on `{ id, tenantId }` only. Two concurrent callers can both read version 3, both pass the check, and both write — producing two timeline entries for one transition and a status that depends on commit order.

**Files:**

- Modify: `src/actions/observations/transition.ts:48-146`
- Test: `src/actions/observations/__integration__/transition.test.ts`

**Interfaces:**

- Consumes: `resetDatabase`, `createTenant`, `createUser`, `fakeSession`, `mockSessionModule`, `integrationPrisma` from `tests/integration/harness.ts` (Task 2).
- Produces: `transitionObservation` keeps its existing signature — `(input: TransitionObservationInput) => Promise<{ success: true; data: { id: string; newStatus: string } } | { success: false; error: string }>`. Only its concurrency behaviour changes.

- [ ] **Step 1: Write the failing test**

Create `src/actions/observations/__integration__/transition.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  resetDatabase,
  createTenant,
  createUser,
  fakeSession,
  mockSessionModule,
  integrationPrisma,
} from "../../../../tests/integration/harness";

async function seedObservation(tenantId: string, createdById: string) {
  const branch = await integrationPrisma.branch.create({
    data: { tenantId, code: "BR-001", name: "Main", city: "Pune", state: "MH" },
    select: { id: true },
  });
  return integrationPrisma.observation.create({
    data: {
      tenantId,
      title: "Concurrency probe",
      condition: "c",
      criteria: "c",
      cause: "c",
      effect: "c",
      recommendation: "r",
      severity: "HIGH",
      status: "DRAFT",
      branchId: branch.id,
      createdById,
      version: 1,
    },
    select: { id: true, version: true },
  });
}

describe("transitionObservation concurrency", () => {
  beforeEach(async () => {
    await resetDatabase();
    vi.resetModules();
  });

  it("lets exactly one of two concurrent identical transitions win", async () => {
    const tenant = await createTenant();
    const auditor = await createUser(tenant.id, ["AUDITOR"]);
    const observation = await seedObservation(tenant.id, auditor.id);

    mockSessionModule(
      fakeSession({ id: auditor.id, tenantId: tenant.id, roles: ["AUDITOR"] }),
    );
    const { transitionObservation } = await import("../transition");

    const input = {
      observationId: observation.id,
      targetStatus: "SUBMITTED" as const,
      version: 1,
      comment: "Submitting for review",
    };

    const [a, b] = await Promise.all([
      transitionObservation(input),
      transitionObservation(input),
    ]);

    const winners = [a, b].filter((r) => r.success);
    expect(winners).toHaveLength(1);

    const timeline = await integrationPrisma.observationTimeline.count({
      where: { observationId: observation.id, event: "status_changed" },
    });
    expect(timeline).toBe(1);

    const after = await integrationPrisma.observation.findUniqueOrThrow({
      where: { id: observation.id },
      select: { version: true, status: true },
    });
    expect(after.version).toBe(2);
    expect(after.status).toBe("SUBMITTED");
  });

  it("rejects a stale version with a refresh message", async () => {
    const tenant = await createTenant();
    const auditor = await createUser(tenant.id, ["AUDITOR"]);
    const observation = await seedObservation(tenant.id, auditor.id);

    mockSessionModule(
      fakeSession({ id: auditor.id, tenantId: tenant.id, roles: ["AUDITOR"] }),
    );
    const { transitionObservation } = await import("../transition");

    const result = await transitionObservation({
      observationId: observation.id,
      targetStatus: "SUBMITTED",
      version: 99,
      comment: "Stale",
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/refresh/i);
  });

  it("refuses an observation belonging to another tenant", async () => {
    const owner = await createTenant("Owner Bank");
    const other = await createTenant("Other Bank");
    const ownerUser = await createUser(owner.id, ["AUDITOR"]);
    const otherUser = await createUser(other.id, ["AUDITOR"]);
    const observation = await seedObservation(owner.id, ownerUser.id);

    mockSessionModule(
      fakeSession({ id: otherUser.id, tenantId: other.id, roles: ["AUDITOR"] }),
    );
    const { transitionObservation } = await import("../transition");

    const result = await transitionObservation({
      observationId: observation.id,
      targetStatus: "SUBMITTED",
      version: 1,
      comment: "Cross tenant",
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/not found/i);
  });
});
```

- [ ] **Step 2: Run it to verify the concurrency case fails**

Run: `npx -y pnpm@10 vitest run --config vitest.integration.config.ts src/actions/observations/__integration__/transition.test.ts`
Expected: the stale-version and cross-tenant tests pass; **"lets exactly one of two concurrent identical transitions win" FAILS** with two successes and two timeline rows.

- [ ] **Step 3: Make the update atomic**

In `src/actions/observations/transition.ts`, delete the pre-transaction optimistic-lock block at lines 89–96 (`if (observation.version !== validated.version) { ... }`) and replace the `tx.observation.update(...)` call at lines 127–133 with a conditional `updateMany` plus a row-count assertion. The transaction body becomes:

```typescript
// Step 4: Atomic transaction — the version and status predicates live in
// the UPDATE itself, so two concurrent callers cannot both win. The
// pre-read above is for the state machine only, never for locking.
const outcome = await db.$transaction(async (tx: any) => {
  await setAuditContext(tx, {
    actionType: "observation.status_changed",
    justification: validated.comment,
    userId: session.user.id,
    tenantId,
    sessionId: session.session.id,
  });

  const updateData: Record<string, unknown> = {
    status: targetStatus,
    statusUpdatedAt: new Date(),
    version: { increment: 1 },
  };

  if (targetStatus === "RESPONSE") {
    if (validated.auditeeResponse) {
      updateData.auditeeResponse = validated.auditeeResponse;
    }
    if (validated.actionPlan) {
      updateData.actionPlan = validated.actionPlan;
    }
  }

  const { count } = await tx.observation.updateMany({
    where: {
      id: validated.observationId,
      tenantId,
      version: validated.version,
      status: currentStatus,
    },
    data: updateData,
  });

  if (count !== 1) return { changed: false as const };

  await tx.observationTimeline.create({
    data: {
      observationId: validated.observationId,
      tenantId,
      event: "status_changed",
      oldValue: currentStatus,
      newValue: targetStatus,
      comment: validated.comment,
      createdById: session.user.id,
    },
  });

  return { changed: true as const };
});

if (!outcome.changed) {
  return {
    success: false as const,
    error:
      "Observation was modified by another user. Please refresh and try again.",
  };
}
```

Everything after this point — `revalidatePath`, the `ISSUED` side effects, the return — is unchanged.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx -y pnpm@10 vitest run --config vitest.integration.config.ts src/actions/observations/__integration__/transition.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Check nothing else regressed**

Run: `npx -y pnpm@10 test:unit && npx -y pnpm@10 lint && npx -y pnpm@10 tsc --noEmit`
Expected: clean. The `audited-mutation-discipline` test must still pass — `transition.ts` is in the `MIGRATION_ALLOWLIST` because it uses `setAuditContext`, and this change keeps that.

- [ ] **Step 6: Commit**

```bash
git add src/actions/observations/transition.ts \
        src/actions/observations/__integration__/transition.test.ts
git commit -m "fix(observations): make the status transition lock atomic

The version check ran before the transaction and the UPDATE matched on
id+tenantId alone, so two concurrent transitions could both pass and both
write, producing conflicting timeline history. The version and current status
now live in the UPDATE predicate and the action requires exactly one row.

Refs F08"
```

---

### Task 4: Tenant-scoped resolution of referenced IDs (F07)

`createEngagement` writes `auditPlanId`, `branchId` and `auditAreaId` straight from input, and `assignTeamMember` writes `engagementId` and `userId` the same way. Each row gets the session's `tenantId` while pointing at another tenant's rows. Prisma relations are ID-only, so the database does not object.

**Files:**

- Create: `src/data-access/tenant-refs.ts`
- Create: `prisma/sql/060_tenant_composite_fks.sql`
- Modify: `prisma/schema.prisma` (add `@@unique([tenantId, id])` to `AuditPlan`, `Branch`, `AuditArea`, `AuditEngagement`)
- Modify: `prisma/sql/manifest.ts` (append the new file)
- Modify: `src/actions/audit-execution/create-engagement.ts:50-98`
- Modify: `src/actions/audit-execution/assign-team.ts:60-93`
- Test: `src/actions/audit-execution/__integration__/tenant-refs.test.ts`

**Interfaces:**

- Consumes: the Task 2 harness; `SQL_MANIFEST` from Task 1.
- Produces, from `src/data-access/tenant-refs.ts`:
  - `class TenantRefError extends Error` with `readonly ref: string`.
  - `type TenantRef = "auditPlanId" | "branchId" | "auditAreaId" | "engagementId" | "userId"`
  - `requireTenantRefs(tx: Prisma.TransactionClient, tenantId: string, refs: Partial<Record<TenantRef, string | null | undefined>>): Promise<void>` — throws `TenantRefError` on the first reference that does not resolve under `tenantId`; ignores `null`/`undefined` entries.

- [ ] **Step 1: Write the failing test**

Create `src/actions/audit-execution/__integration__/tenant-refs.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  resetDatabase,
  createTenant,
  createUser,
  fakeSession,
  mockSessionModule,
  integrationPrisma,
} from "../../../../tests/integration/harness";

async function seedPlanAndBranch(tenantId: string) {
  const plan = await integrationPrisma.auditPlan.create({
    data: { tenantId, year: 2026, quarter: 1, status: "PLANNED" },
    select: { id: true },
  });
  const branch = await integrationPrisma.branch.create({
    data: { tenantId, code: "BR-001", name: "Main", city: "Pune", state: "MH" },
    select: { id: true },
  });
  return { planId: plan.id, branchId: branch.id };
}

describe("cross-tenant relation IDs", () => {
  beforeEach(async () => {
    await resetDatabase();
    vi.resetModules();
  });

  it("refuses an engagement that points at another tenant's plan", async () => {
    const attacker = await createTenant("Attacker Bank");
    const victim = await createTenant("Victim Bank");
    const attackerUser = await createUser(attacker.id, ["AUDIT_MANAGER"]);
    const attackerRefs = await seedPlanAndBranch(attacker.id);
    const victimRefs = await seedPlanAndBranch(victim.id);

    mockSessionModule(
      fakeSession({
        id: attackerUser.id,
        tenantId: attacker.id,
        roles: ["AUDIT_MANAGER"],
      }),
    );
    const { createEngagement } = await import("../create-engagement");

    const result = await createEngagement({
      auditPlanId: victimRefs.planId,
      branchId: attackerRefs.branchId,
      auditNumber: "RBIA/2026-27/BR-001/V1",
      auditType: "RBIA",
      visitNumber: 1,
      periodFrom: "2026-04-01",
      periodTo: "2026-06-30",
    });

    expect(result.success).toBe(false);
    const leaked = await integrationPrisma.auditEngagement.count({
      where: { auditPlanId: victimRefs.planId },
    });
    expect(leaked).toBe(0);
  });

  it("refuses a team assignment of another tenant's user", async () => {
    const attacker = await createTenant("Attacker Bank");
    const victim = await createTenant("Victim Bank");
    const manager = await createUser(attacker.id, ["AUDIT_MANAGER"]);
    const victimUser = await createUser(victim.id, ["AUDITOR"]);
    const refs = await seedPlanAndBranch(attacker.id);

    const engagement = await integrationPrisma.auditEngagement.create({
      data: {
        tenantId: attacker.id,
        auditPlanId: refs.planId,
        branchId: refs.branchId,
        auditNumber: "RBIA/2026-27/BR-001/V1",
        periodFrom: new Date("2026-04-01"),
        periodTo: new Date("2026-06-30"),
        status: "PLANNED",
      },
      select: { id: true },
    });

    mockSessionModule(
      fakeSession({
        id: manager.id,
        tenantId: attacker.id,
        roles: ["AUDIT_MANAGER"],
      }),
    );
    const { assignTeamMember } = await import("../assign-team");

    const result = await assignTeamMember({
      engagementId: engagement.id,
      userId: victimUser.id,
      roleInEngagement: "FIELD_AUDITOR",
      assignedSections: ["CASH"],
    });

    expect(result.success).toBe(false);
    const leaked = await integrationPrisma.auditTeamMember.count({
      where: { userId: victimUser.id },
    });
    expect(leaked).toBe(0);
  });

  it("still creates an engagement whose references are all in-tenant", async () => {
    const tenant = await createTenant();
    const manager = await createUser(tenant.id, ["AUDIT_MANAGER"]);
    const refs = await seedPlanAndBranch(tenant.id);

    mockSessionModule(
      fakeSession({
        id: manager.id,
        tenantId: tenant.id,
        roles: ["AUDIT_MANAGER"],
      }),
    );
    const { createEngagement } = await import("../create-engagement");

    const result = await createEngagement({
      auditPlanId: refs.planId,
      branchId: refs.branchId,
      auditNumber: "RBIA/2026-27/BR-001/V1",
      auditType: "RBIA",
      visitNumber: 1,
      periodFrom: "2026-04-01",
      periodTo: "2026-06-30",
    });

    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to confirm the first two fail**

Run: `npx -y pnpm@10 vitest run --config vitest.integration.config.ts src/actions/audit-execution/__integration__/tenant-refs.test.ts`
Expected: the third test passes; the first two FAIL, because both writes succeed today.

- [ ] **Step 3: Write the resolver**

Create `src/data-access/tenant-refs.ts`:

```typescript
import "server-only";
import type { Prisma } from "@/generated/prisma/client";

/**
 * A referenced row does not exist under the acting tenant.
 *
 * Callers surface this as "not found" rather than "wrong tenant": telling a
 * caller that an ID exists somewhere else is itself a cross-tenant disclosure.
 */
export class TenantRefError extends Error {
  constructor(public readonly ref: string) {
    super(`Referenced ${ref} was not found.`);
    this.name = "TenantRefError";
  }
}

export type TenantRef =
  | "auditPlanId"
  | "branchId"
  | "auditAreaId"
  | "engagementId"
  | "userId";

type Resolver = (
  tx: Prisma.TransactionClient,
  id: string,
  tenantId: string,
) => Promise<{ id: string } | null>;

const RESOLVERS: Record<TenantRef, Resolver> = {
  auditPlanId: (tx, id, tenantId) =>
    tx.auditPlan.findFirst({ where: { id, tenantId }, select: { id: true } }),
  branchId: (tx, id, tenantId) =>
    tx.branch.findFirst({ where: { id, tenantId }, select: { id: true } }),
  auditAreaId: (tx, id, tenantId) =>
    tx.auditArea.findFirst({ where: { id, tenantId }, select: { id: true } }),
  engagementId: (tx, id, tenantId) =>
    tx.auditEngagement.findFirst({
      where: { id, tenantId },
      select: { id: true },
    }),
  // User.tenantId is nullable (Better Auth creates the row before the tenant
  // is known), so this cannot be a composite foreign key. Equality still
  // excludes NULL, so an un-tenanted user never resolves.
  userId: (tx, id, tenantId) =>
    tx.user.findFirst({ where: { id, tenantId }, select: { id: true } }),
};

/**
 * Resolve every supplied reference under one tenant, inside the caller's
 * transaction. Absent and null references are skipped; a reference that does
 * not resolve throws, which rolls the transaction back.
 */
export async function requireTenantRefs(
  tx: Prisma.TransactionClient,
  tenantId: string,
  refs: Partial<Record<TenantRef, string | null | undefined>>,
): Promise<void> {
  for (const [key, id] of Object.entries(refs) as Array<
    [TenantRef, string | null | undefined]
  >) {
    if (id == null) continue;
    const found = await RESOLVERS[key](tx, id, tenantId);
    if (!found) throw new TenantRefError(key);
  }
}
```

- [ ] **Step 4: Use it in `createEngagement`**

In `src/actions/audit-execution/create-engagement.ts`, add to the imports:

```typescript
import { requireTenantRefs, TenantRefError } from "@/data-access/tenant-refs";
```

Immediately after the `setAuditContext` call inside the transaction (currently `src/actions/audit-execution/create-engagement.ts:56-61`), insert:

```typescript
await requireTenantRefs(tx, tenantId, {
  auditPlanId: validated.auditPlanId,
  branchId: validated.branchId,
  auditAreaId: validated.auditAreaId,
});
```

Then, in the `catch` block, return the reference error ahead of the generic message:

```typescript
  } catch (error) {
    if (error instanceof TenantRefError) {
      return {
        success: false as const,
        error: "One of the selected records was not found. Please refresh and try again.",
      };
    }

    logger.error(
      { error, action: "create_engagement", tenantId },
      "Failed to create audit engagement",
    );

    return {
      success: false as const,
      error: "Failed to create audit engagement. Please try again.",
    };
  }
```

- [ ] **Step 5: Use it in `assignTeamMember`**

In `src/actions/audit-execution/assign-team.ts`, add the same import, then insert after the `setAuditContext` call inside `assignTeamMember`'s transaction (`src/actions/audit-execution/assign-team.ts:62-67`):

```typescript
await requireTenantRefs(tx, tenantId, {
  engagementId: validated.engagementId,
  userId: validated.userId,
});
```

Update the `catch` block's message selection:

```typescript
const errorMessage =
  error instanceof TenantRefError
    ? "The selected engagement or user was not found."
    : error instanceof Error && error.message.includes("already assigned")
      ? error.message
      : "Failed to assign team member. Please try again.";
```

Apply the same `requireTenantRefs` call inside `removeTeamMember`'s transaction (after `src/actions/audit-execution/assign-team.ts:170-175`) with the same two references, so a removal cannot be aimed at another tenant's engagement.

- [ ] **Step 6: Add the composite unique keys**

In `prisma/schema.prisma`, add `@@unique([tenantId, id])` to four models, beside their existing block attributes:

- `AuditPlan` — beside `@@unique([tenantId, year, quarter])` (around line 753)
- `Branch` — beside `@@unique([tenantId, code])` (around line 687)
- `AuditArea` — beside its existing `@@index([tenantId])`
- `AuditEngagement` — beside its existing `@@index([tenantId])`

Each addition reads exactly:

```prisma
  @@unique([tenantId, id])
```

Then regenerate: `npx -y pnpm@10 db:generate`

- [ ] **Step 7: Add the composite foreign keys**

Create `prisma/sql/060_tenant_composite_fks.sql`:

```sql
-- Composite (tenantId, id) foreign keys.
--
-- Prisma relations are ID-only, so a row can carry one tenantId while
-- referencing another tenant's parent. These constraints make that
-- unrepresentable for the four highest-value relations. The application-level
-- guard in src/data-access/tenant-refs.ts still runs first, so callers get a
-- clean error rather than a constraint violation.
--
-- AuditTeamMember.userId is deliberately absent: User.tenantId is nullable,
-- so no composite key can target it. That reference is application-guarded.
--
-- The (tenantId, id) unique indexes these depend on come from schema.prisma
-- and are created by `prisma db push`.
--
-- Pre-check before first application on an existing database:
--   SELECT e.id FROM "AuditEngagement" e
--     JOIN "AuditPlan" p ON p.id = e."auditPlanId"
--    WHERE p."tenantId" <> e."tenantId";
--   -- and the equivalent for Branch, AuditArea, and AuditTeamMember.
--   -- Each must return zero rows.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'engagement_plan_same_tenant') THEN
    ALTER TABLE "AuditEngagement"
      ADD CONSTRAINT "engagement_plan_same_tenant"
      FOREIGN KEY ("tenantId", "auditPlanId")
      REFERENCES "AuditPlan" ("tenantId", "id") ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'engagement_branch_same_tenant') THEN
    ALTER TABLE "AuditEngagement"
      ADD CONSTRAINT "engagement_branch_same_tenant"
      FOREIGN KEY ("tenantId", "branchId")
      REFERENCES "Branch" ("tenantId", "id");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'engagement_area_same_tenant') THEN
    ALTER TABLE "AuditEngagement"
      ADD CONSTRAINT "engagement_area_same_tenant"
      FOREIGN KEY ("tenantId", "auditAreaId")
      REFERENCES "AuditArea" ("tenantId", "id");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_member_engagement_same_tenant') THEN
    ALTER TABLE "AuditTeamMember"
      ADD CONSTRAINT "team_member_engagement_same_tenant"
      FOREIGN KEY ("tenantId", "engagementId")
      REFERENCES "AuditEngagement" ("tenantId", "id") ON DELETE CASCADE;
  END IF;
END
$$;
```

`branchId` and `auditAreaId` are nullable; PostgreSQL's default `MATCH SIMPLE` skips the check when any column of the key is NULL, which is the behaviour we want.

- [ ] **Step 8: Register the new SQL and require the constraints**

In `prisma/sql/manifest.ts`, append to `SQL_MANIFEST`:

```typescript
  "prisma/sql/060_tenant_composite_fks.sql",
```

and extend `REQUIRED_OBJECTS.constraints`:

```typescript
  constraints: [
    "examination_node_path_ends_with_code",
    "engagement_plan_same_tenant",
    "engagement_branch_same_tenant",
    "engagement_area_same_tenant",
    "team_member_engagement_same_tenant",
  ],
```

- [ ] **Step 9: Run the tests**

Run: `npx -y pnpm@10 vitest run --config vitest.integration.config.ts`
Expected: PASS. The three `tenant-refs` tests, the three harness tests, and the three transition tests.

Run: `npx -y pnpm@10 test:unit && npx -y pnpm@10 lint && npx -y pnpm@10 tsc --noEmit`
Expected: clean.

- [ ] **Step 10: Commit**

```bash
git add src/data-access/tenant-refs.ts prisma/sql/060_tenant_composite_fks.sql \
        prisma/sql/manifest.ts prisma/schema.prisma \
        src/actions/audit-execution/create-engagement.ts \
        src/actions/audit-execution/assign-team.ts \
        src/actions/audit-execution/__integration__/tenant-refs.test.ts
git commit -m "fix(audit-execution): resolve referenced IDs under the acting tenant

Engagement and team writes took foreign IDs from input and paired them with the
session tenantId, so a row could carry one tenant while pointing at another's
plan, branch, or user. Adds requireTenantRefs inside each transaction plus
composite (tenantId, id) foreign keys where the schema permits them.

Refs F07"
```

**Deployment note:** `060_tenant_composite_fks.sql` must be applied to production **before** this code merges, and the pre-check queries in its header must return zero rows first. If any return rows, stop and repair the data — do not weaken the constraint.

---

### Task 5: RBIA freeze completeness (F10)

`freezeRbiaScore` rejects only when the composite score is `null`. Because `computeNodeScore` excludes unscored leaves from the denominator, one scored leaf out of two hundred produces a confident composite that the immutability trigger then protects forever.

There is a second defect in the same function: it loads **every active `ExaminationNode` for the tenant** (`src/actions/rbia/freeze.ts:152-155`) and ignores `EngagementModuleSelection` entirely. The snapshot therefore describes the whole tenant catalogue rather than this engagement's scope. Both are fixed here, because a completeness gate over the wrong node set would be meaningless.

Completeness needs a way to say "deliberately not applicable", which the schema lacks today — a `null` score currently means both "not yet done" and "N/A". This task adds the explicit marker.

**Files:**

- Create: `src/lib/rbia-completeness.ts`
- Create: `src/lib/__tests__/rbia-completeness.test.ts`
- Modify: `prisma/schema.prisma` (`ExaminationResponse`)
- Modify: `src/actions/rbia/freeze.ts:139-235`
- Test: `src/actions/rbia/__integration__/freeze.test.ts`

**Interfaces:**

- Consumes: `ScoredNode` from `@/lib/rbia-scoring-engine`; the Task 2 harness.
- Produces, from `src/lib/rbia-completeness.ts`:
  - `type LeafStatus = { nodeId: string; code: string; scored: boolean; notApplicable: boolean }`
  - `findUnscoredLeaves(modules: ScoredNode[], statuses: Map<string, LeafStatus>): string[]` — returns the codes of active leaves under the given modules that are neither scored nor marked not applicable, in tree order.

- [ ] **Step 1: Write the failing unit test for the pure function**

Create `src/lib/__tests__/rbia-completeness.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { findUnscoredLeaves, type LeafStatus } from "../rbia-completeness";
import type { ScoredNode } from "../rbia-scoring-engine";

function leaf(nodeId: string, code: string): ScoredNode {
  return {
    nodeId,
    code,
    weight: 1,
    isCritical: false,
    isLeaf: true,
    children: [],
  };
}

function group(
  nodeId: string,
  code: string,
  children: ScoredNode[],
): ScoredNode {
  return {
    nodeId,
    code,
    weight: 1,
    isCritical: false,
    isLeaf: false,
    children,
  };
}

function statuses(entries: LeafStatus[]): Map<string, LeafStatus> {
  return new Map(entries.map((e) => [e.nodeId, e]));
}

describe("findUnscoredLeaves", () => {
  const tree = [
    group("m1", "OPS", [leaf("l1", "OPS-001"), leaf("l2", "OPS-002")]),
    group("m2", "CREDIT", [leaf("l3", "CREDIT-001")]),
  ];

  it("returns nothing when every leaf is scored", () => {
    const result = findUnscoredLeaves(
      tree,
      statuses([
        { nodeId: "l1", code: "OPS-001", scored: true, notApplicable: false },
        { nodeId: "l2", code: "OPS-002", scored: true, notApplicable: false },
        {
          nodeId: "l3",
          code: "CREDIT-001",
          scored: true,
          notApplicable: false,
        },
      ]),
    );
    expect(result).toEqual([]);
  });

  it("accepts an explicit not-applicable marker in place of a score", () => {
    const result = findUnscoredLeaves(
      tree,
      statuses([
        { nodeId: "l1", code: "OPS-001", scored: true, notApplicable: false },
        { nodeId: "l2", code: "OPS-002", scored: false, notApplicable: true },
        {
          nodeId: "l3",
          code: "CREDIT-001",
          scored: true,
          notApplicable: false,
        },
      ]),
    );
    expect(result).toEqual([]);
  });

  it("reports leaves with no response at all", () => {
    const result = findUnscoredLeaves(
      tree,
      statuses([
        { nodeId: "l1", code: "OPS-001", scored: true, notApplicable: false },
      ]),
    );
    expect(result).toEqual(["OPS-002", "CREDIT-001"]);
  });

  it("reports a response row that carries neither a score nor an N/A mark", () => {
    const result = findUnscoredLeaves(
      [group("m1", "OPS", [leaf("l1", "OPS-001")])],
      statuses([
        { nodeId: "l1", code: "OPS-001", scored: false, notApplicable: false },
      ]),
    );
    expect(result).toEqual(["OPS-001"]);
  });

  it("ignores non-leaf nodes", () => {
    const result = findUnscoredLeaves(
      [
        group("m1", "OPS", [
          group("s1", "OPS-SUB", [leaf("l1", "OPS-SUB-001")]),
        ]),
      ],
      statuses([
        {
          nodeId: "l1",
          code: "OPS-SUB-001",
          scored: true,
          notApplicable: false,
        },
      ]),
    );
    expect(result).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx -y pnpm@10 vitest run src/lib/__tests__/rbia-completeness.test.ts`
Expected: FAIL — `Cannot find module '../rbia-completeness'`.

- [ ] **Step 3: Write the pure function**

Create `src/lib/rbia-completeness.ts`:

```typescript
/**
 * Freeze completeness for RBIA examinations — pure, no I/O.
 *
 * A composite score computed over a partly-scored tree is not wrong so much as
 * misleading: `computeNodeScore` excludes unscored leaves from the denominator,
 * so one scored item out of two hundred yields a confident-looking number. The
 * freeze is irreversible (the BranchRbiaScore immutability trigger), so the
 * gate belongs before it, not after.
 *
 * "Not applicable" must be recorded deliberately. An absent score cannot mean
 * both "not done yet" and "does not apply to this branch".
 */
import type { ScoredNode } from "./rbia-scoring-engine";

export type LeafStatus = {
  nodeId: string;
  code: string;
  scored: boolean;
  notApplicable: boolean;
};

/**
 * Codes of leaves under `modules` that are neither scored nor marked not
 * applicable, in tree order. Empty means the examination may be frozen.
 */
export function findUnscoredLeaves(
  modules: ScoredNode[],
  statuses: Map<string, LeafStatus>,
): string[] {
  const outstanding: string[] = [];

  function walk(node: ScoredNode): void {
    if (node.isLeaf) {
      const status = statuses.get(node.nodeId);
      if (!status || (!status.scored && !status.notApplicable)) {
        outstanding.push(node.code);
      }
      return;
    }
    for (const child of node.children) walk(child);
  }

  for (const module of modules) walk(module);
  return outstanding;
}
```

- [ ] **Step 4: Run the unit test to verify it passes**

Run: `npx -y pnpm@10 vitest run src/lib/__tests__/rbia-completeness.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Add the not-applicable marker to the schema**

In `prisma/schema.prisma`, in `model ExaminationResponse`, after the `scoreLabel` field (around line 2147):

```prisma
  // Explicit N/A. A null score means "not yet examined"; this means "examined
  // and does not apply to this branch". The freeze gate distinguishes them.
  isNotApplicable      Boolean @default(false)
  notApplicableReason  String? @db.Text
```

Regenerate: `npx -y pnpm@10 db:generate`

- [ ] **Step 6: Write the failing integration test**

Create `src/actions/rbia/__integration__/freeze.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  resetDatabase,
  createTenant,
  createUser,
  fakeSession,
  mockSessionModule,
  integrationPrisma,
} from "../../../../tests/integration/harness";

/**
 * One module, two leaves, plus a second module that is NOT selected for this
 * engagement. The unselected module exists to prove the freeze scopes to
 * EngagementModuleSelection rather than the whole tenant catalogue.
 */
async function seedExamination(tenantId: string, userId: string) {
  const plan = await integrationPrisma.auditPlan.create({
    data: { tenantId, year: 2026, quarter: 1, status: "PLANNED" },
    select: { id: true },
  });
  const branch = await integrationPrisma.branch.create({
    data: { tenantId, code: "BR-001", name: "Main", city: "Pune", state: "MH" },
    select: { id: true },
  });
  const engagement = await integrationPrisma.auditEngagement.create({
    data: {
      tenantId,
      auditPlanId: plan.id,
      branchId: branch.id,
      auditNumber: "RBIA/2026-27/BR-001/V1",
      periodFrom: new Date("2026-04-01"),
      periodTo: new Date("2026-06-30"),
      status: "IN_PROGRESS",
    },
    select: { id: true },
  });

  const node = (
    code: string,
    path: string,
    depth: number,
    isLeaf: boolean,
    parentId: string | null,
  ) =>
    integrationPrisma.examinationNode.create({
      data: {
        tenantId,
        code,
        name: code,
        path,
        depth,
        isLeaf,
        parentId,
        weight: 1,
        isActive: true,
      },
      select: { id: true, code: true },
    });

  const root = await node("ROOT", "ROOT", 0, false, null);
  const ops = await node("OPS", "ROOT/OPS", 1, false, root.id);
  const opsA = await node("OPS-001", "ROOT/OPS/OPS-001", 2, true, ops.id);
  const opsB = await node("OPS-002", "ROOT/OPS/OPS-002", 2, true, ops.id);
  const credit = await node("CREDIT", "ROOT/CREDIT", 1, false, root.id);
  await node("CREDIT-001", "ROOT/CREDIT/CREDIT-001", 2, true, credit.id);

  // Only OPS is in scope for this engagement.
  await integrationPrisma.engagementModuleSelection.create({
    data: { tenantId, engagementId: engagement.id, moduleNodeId: ops.id },
  });

  return { engagementId: engagement.id, opsA, opsB, userId };
}

async function score(
  tenantId: string,
  engagementId: string,
  nodeId: string,
  label: "FULLY_COMPLIANT" | null,
  notApplicable = false,
) {
  await integrationPrisma.examinationResponse.create({
    data: {
      tenantId,
      engagementId,
      nodeId,
      score: label ? 1.0 : null,
      scoreLabel: label,
      isNotApplicable: notApplicable,
    },
  });
}

describe("freezeRbiaScore completeness", () => {
  beforeEach(async () => {
    await resetDatabase();
    vi.resetModules();
  });

  it("refuses to freeze while a selected leaf is unscored", async () => {
    const tenant = await createTenant();
    const cae = await createUser(tenant.id, ["CAE"]);
    const seed = await seedExamination(tenant.id, cae.id);
    await score(tenant.id, seed.engagementId, seed.opsA.id, "FULLY_COMPLIANT");

    mockSessionModule(
      fakeSession({ id: cae.id, tenantId: tenant.id, roles: ["CAE"] }),
    );
    const { freezeRbiaScore } = await import("../freeze");

    const result = await freezeRbiaScore({ engagementId: seed.engagementId });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.code).toBe("INCOMPLETE_EXAMINATION");
      expect(result.error).toContain("OPS-002");
    }

    const frozen = await integrationPrisma.branchRbiaScore.count({
      where: { engagementId: seed.engagementId },
    });
    expect(frozen).toBe(0);
  });

  it("freezes once every selected leaf is scored or marked not applicable", async () => {
    const tenant = await createTenant();
    const cae = await createUser(tenant.id, ["CAE"]);
    const seed = await seedExamination(tenant.id, cae.id);
    await score(tenant.id, seed.engagementId, seed.opsA.id, "FULLY_COMPLIANT");
    await score(tenant.id, seed.engagementId, seed.opsB.id, null, true);

    mockSessionModule(
      fakeSession({ id: cae.id, tenantId: tenant.id, roles: ["CAE"] }),
    );
    const { freezeRbiaScore } = await import("../freeze");

    const result = await freezeRbiaScore({ engagementId: seed.engagementId });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.compositeScore).toBe(1);
  });

  it("does not require leaves of modules outside the engagement's selection", async () => {
    const tenant = await createTenant();
    const cae = await createUser(tenant.id, ["CAE"]);
    const seed = await seedExamination(tenant.id, cae.id);
    await score(tenant.id, seed.engagementId, seed.opsA.id, "FULLY_COMPLIANT");
    await score(tenant.id, seed.engagementId, seed.opsB.id, "FULLY_COMPLIANT");

    mockSessionModule(
      fakeSession({ id: cae.id, tenantId: tenant.id, roles: ["CAE"] }),
    );
    const { freezeRbiaScore } = await import("../freeze");

    // CREDIT-001 is unscored, but CREDIT is not selected for this engagement.
    const result = await freezeRbiaScore({ engagementId: seed.engagementId });
    expect(result.success).toBe(true);

    const snapshot = await integrationPrisma.branchRbiaScore.findUniqueOrThrow({
      where: { engagementId: seed.engagementId },
      select: { moduleScores: true },
    });
    expect(Object.keys(snapshot.moduleScores as object)).toEqual(["OPS"]);
  });

  it("refuses an engagement with no module selection", async () => {
    const tenant = await createTenant();
    const cae = await createUser(tenant.id, ["CAE"]);
    const seed = await seedExamination(tenant.id, cae.id);
    await integrationPrisma.engagementModuleSelection.deleteMany({
      where: { engagementId: seed.engagementId },
    });

    mockSessionModule(
      fakeSession({ id: cae.id, tenantId: tenant.id, roles: ["CAE"] }),
    );
    const { freezeRbiaScore } = await import("../freeze");

    const result = await freezeRbiaScore({ engagementId: seed.engagementId });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.code).toBe("INCOMPLETE_EXAMINATION");
  });
});
```

- [ ] **Step 7: Run it to confirm it fails**

Run: `npx -y pnpm@10 vitest run --config vitest.integration.config.ts src/actions/rbia/__integration__/freeze.test.ts`
Expected: all four FAIL — today the first freezes anyway, and the third snapshots both modules.

- [ ] **Step 8: Scope the tree and gate the freeze**

In `src/actions/rbia/freeze.ts`, add to the imports:

```typescript
import { findUnscoredLeaves, type LeafStatus } from "@/lib/rbia-completeness";
```

Replace Step 1's response query (`src/actions/rbia/freeze.ts:139-148`) so it is tenant-scoped and carries the N/A marker:

```typescript
currentStep = "loading_responses";
const responses = await tx.examinationResponse.findMany({
  where: { engagementId: validated.engagementId, tenantId },
  select: {
    id: true,
    nodeId: true,
    score: true,
    scoreLabel: true,
    isNotApplicable: true,
  },
});
```

Replace the module-collection block (`src/actions/rbia/freeze.ts:204-213`) so modules come from the engagement's selection rather than every depth-1 node in the tenant:

```typescript
// Link children -> parents. Modules in scope come from the engagement's
// selection, not from every depth-1 node in the tenant catalogue: the
// snapshot must describe this engagement, not the whole product.
const selections = await tx.engagementModuleSelection.findMany({
  where: { engagementId: validated.engagementId, tenantId },
  select: { moduleNodeId: true },
});
const selectedIds = new Set(selections.map((s) => s.moduleNodeId));

for (const node of nodeMap.values()) {
  if (node.parentId) {
    const parent = nodeMap.get(node.parentId);
    if (parent) parent.children.push(node);
  }
}

const moduleNodes: ScoredNode[] = [];
for (const id of selectedIds) {
  const module = nodeMap.get(id);
  if (module) moduleNodes.push(module);
}

if (moduleNodes.length === 0) {
  throw Object.assign(
    new Error(
      "Cannot freeze: no examination modules are selected for this engagement",
    ),
    { code: "INCOMPLETE_EXAMINATION" },
  );
}

// ── Completeness gate ──
currentStep = "checking_completeness";
const leafStatuses = new Map<string, LeafStatus>();
for (const r of responses) {
  const node = nodeMap.get(r.nodeId);
  if (!node) continue;
  leafStatuses.set(r.nodeId, {
    nodeId: r.nodeId,
    code: node.code,
    scored: r.scoreLabel != null,
    notApplicable: r.isNotApplicable,
  });
}

const outstanding = findUnscoredLeaves(moduleNodes, leafStatuses);
if (outstanding.length > 0) {
  const shown = outstanding.slice(0, 10).join(", ");
  const more =
    outstanding.length > 10 ? ` and ${outstanding.length - 10} more` : "";
  throw Object.assign(
    new Error(
      `Cannot freeze: ${outstanding.length} examination item(s) are neither ` +
        `scored nor marked not applicable — ${shown}${more}`,
    ),
    { code: "INCOMPLETE_EXAMINATION" },
  );
}
```

Note the old loop assigned `moduleNodes` by `depth === 1` _and_ skipped linking those nodes to parents; the replacement links every node with a parent and then picks modules by selection, which is why the `else` branch is gone.

- [ ] **Step 9: Surface the new error code**

In the same file's `catch` block, extend the step messages and the code selection. Add to `stepMessages` (`src/actions/rbia/freeze.ts:330-341`):

```typescript
      checking_completeness: "Examination is not complete",
```

and replace the code/message selection (`src/actions/rbia/freeze.ts:343-348`) with:

```typescript
const errorCode =
  error instanceof Error && (error as any).code
    ? ((error as any).code as string)
    : "INTERNAL_ERROR";
const isKnown =
  errorCode === "SCORE_FROZEN" || errorCode === "INCOMPLETE_EXAMINATION";
const userMessage = isKnown
  ? (error as Error).message
  : (stepMessages[currentStep] ?? "Status transition blocked");
```

Confirm `ActionResult`'s `code` union in `src/actions/rbia/schemas.ts` includes `"INCOMPLETE_EXAMINATION"`; add it if the type enumerates codes.

- [ ] **Step 10: Run the tests**

Run: `npx -y pnpm@10 vitest run --config vitest.integration.config.ts src/actions/rbia/__integration__/freeze.test.ts`
Expected: PASS, 4 tests.

Run: `npx -y pnpm@10 test:unit && npx -y pnpm@10 lint && npx -y pnpm@10 tsc --noEmit`
Expected: clean. `src/lib/__tests__/rbia-scoring-engine.test.ts` must still pass untouched — the scoring engine did not change.

- [ ] **Step 11: Commit**

```bash
git add src/lib/rbia-completeness.ts src/lib/__tests__/rbia-completeness.test.ts \
        src/actions/rbia/freeze.ts src/actions/rbia/schemas.ts prisma/schema.prisma \
        src/actions/rbia/__integration__/freeze.test.ts
git commit -m "fix(rbia): gate freeze on a complete, in-scope examination

Freeze rejected only a null composite, and unscored leaves are excluded from
the denominator, so one scored item could produce a confident final score
protected forever by the immutability trigger. It also scored every active node
in the tenant instead of the engagement's selected modules. Adds an explicit
not-applicable marker, scopes scoring to EngagementModuleSelection, and refuses
to freeze while any selected leaf is unresolved.

Refs F10"
```

**Follow-up for the UI (not in this task):** the examination response form needs a control that sets `isNotApplicable` with a reason, or auditors will hit an ungateable freeze. Raise this as a separate issue before merging to `main`.

---

### Task 6: Bind evidence confirmation to an upload intent (F09)

Both confirmation actions accept a caller-supplied `s3Key`, `fileSize` and `contentType`, prove only that _something_ exists at that key, and persist the caller's claims. An existing object can be rebound to a different record with falsified metadata.

**Files:**

- Create: `src/data-access/upload-intents.ts`
- Modify: `prisma/schema.prisma` (`UploadIntent` model, `UploadPurpose` enum, `Tenant` back-reference)
- Modify: `src/actions/auditee.ts` (request path around lines 290–316; `confirmEvidenceUpload` at 340–419)
- Modify: `src/actions/audit-execution/upload-examination-evidence.ts:98-110,137-213`
- Test: `src/actions/audit-execution/__integration__/upload-intent.test.ts`

**Interfaces:**

- Consumes: `generateS3Key`, `generateUploadUrl`, `verifyUpload` from `@/lib/s3`; the Task 2 harness.
- Produces, from `src/data-access/upload-intents.ts`:
  - `type UploadPurposeName = "OBSERVATION_EVIDENCE" | "EXAMINATION_EVIDENCE"`
  - `recordUploadIntent(session, params: { s3Key: string; purpose: UploadPurposeName; parentId: string; contentType: string; maxFileSize: number }): Promise<void>`
  - `consumeUploadIntent(tx: Prisma.TransactionClient, params: { tenantId: string; s3Key: string; purpose: UploadPurposeName; parentId: string }): Promise<{ contentType: string; maxFileSize: number }>` — throws `UploadIntentError` if absent, expired, already consumed, or bound to a different parent.
  - `class UploadIntentError extends Error`
  - `const UPLOAD_INTENT_TTL_MS = 15 * 60 * 1000`

- [ ] **Step 1: Add the schema**

In `prisma/schema.prisma`, add near the `Evidence` model:

```prisma
enum UploadPurpose {
  OBSERVATION_EVIDENCE
  EXAMINATION_EVIDENCE
}

/// A server-issued permission to upload one object to one key for one parent
/// record. Confirmation resolves the intent instead of trusting the caller's
/// key and metadata, so an existing object cannot be rebound elsewhere.
model UploadIntent {
  id       String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId String @db.Uuid
  tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  s3Key       String        @unique
  purpose     UploadPurpose
  parentId    String        @db.Uuid
  contentType String
  maxFileSize Int

  createdById String    @db.Uuid
  expiresAt   DateTime
  consumedAt  DateTime?

  createdAt DateTime @default(now())

  @@index([tenantId])
  @@index([expiresAt])
}
```

Add the back-reference inside `model Tenant`:

```prisma
  uploadIntents UploadIntent[]
```

`UploadIntent` is deliberately **not** added to `AUDITED_TABLES`: it is a short-lived permission slip, and the audited record of an upload is the `Evidence` row.

Regenerate: `npx -y pnpm@10 db:generate`

- [ ] **Step 2: Write the failing test**

Create `src/actions/audit-execution/__integration__/upload-intent.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  resetDatabase,
  createTenant,
  createUser,
  fakeSession,
  mockSessionModule,
  integrationPrisma,
} from "../../../../tests/integration/harness";

/**
 * S3 is stubbed: these tests are about the binding between an intent, a key,
 * and a parent record, not about AWS. `verifyUpload` reports an object that is
 * larger and of a different type than the intent allowed.
 */
function mockS3(
  overrides: { contentLength?: number; contentType?: string } = {},
) {
  vi.doMock("@/lib/s3", async () => {
    const actual = await vi.importActual<typeof import("@/lib/s3")>("@/lib/s3");
    return {
      ...actual,
      generateUploadUrl: vi.fn(async () => "https://s3.test/upload"),
      verifyUpload: vi.fn(async () => ({
        exists: true,
        contentLength: overrides.contentLength ?? 1024,
        contentType: overrides.contentType ?? "application/pdf",
      })),
    };
  });
}

async function seedResponse(tenantId: string) {
  const plan = await integrationPrisma.auditPlan.create({
    data: { tenantId, year: 2026, quarter: 1, status: "PLANNED" },
    select: { id: true },
  });
  const engagement = await integrationPrisma.auditEngagement.create({
    data: {
      tenantId,
      auditPlanId: plan.id,
      auditNumber: "RBIA/2026-27/BR-001/V1",
      periodFrom: new Date("2026-04-01"),
      periodTo: new Date("2026-06-30"),
      status: "IN_PROGRESS",
    },
    select: { id: true },
  });
  const item = await integrationPrisma.examinationItem.create({
    data: { tenantId, code: "ITEM-1", description: "Check cash" },
    select: { id: true },
  });
  const response = await integrationPrisma.auditExaminationResponse.create({
    data: {
      tenantId,
      engagementId: engagement.id,
      itemId: item.id,
      status: "PENDING",
    },
    select: { id: true },
  });
  return { engagementId: engagement.id, responseId: response.id };
}

describe("evidence confirmation binds to an upload intent", () => {
  beforeEach(async () => {
    await resetDatabase();
    vi.resetModules();
  });

  it("refuses a key that was never issued", async () => {
    mockS3();
    const tenant = await createTenant();
    const auditor = await createUser(tenant.id, ["AUDITOR"]);
    const seed = await seedResponse(tenant.id);

    mockSessionModule(
      fakeSession({ id: auditor.id, tenantId: tenant.id, roles: ["AUDITOR"] }),
    );
    const { confirmExaminationEvidenceUpload } =
      await import("../upload-examination-evidence");

    const result = await confirmExaminationEvidenceUpload({
      engagementId: seed.engagementId,
      responseId: seed.responseId,
      s3Key: `${tenant.id}/evidence/${seed.responseId}/forged.pdf`,
      filename: "forged.pdf",
      fileSize: 1024,
      contentType: "application/pdf",
    });

    expect(result.success).toBe(false);
    expect(await integrationPrisma.evidence.count()).toBe(0);
  });

  it("persists S3's metadata, not the caller's claims", async () => {
    mockS3({ contentLength: 2048, contentType: "application/pdf" });
    const tenant = await createTenant();
    const auditor = await createUser(tenant.id, ["AUDITOR"]);
    const seed = await seedResponse(tenant.id);

    mockSessionModule(
      fakeSession({ id: auditor.id, tenantId: tenant.id, roles: ["AUDITOR"] }),
    );
    const mod = await import("../upload-examination-evidence");

    const requested = await mod.requestExaminationEvidenceUpload({
      engagementId: seed.engagementId,
      responseId: seed.responseId,
      filename: "report.pdf",
      fileSize: 2048,
      // "%PDF-1.7" base64 — magic bytes for validateFileType
      fileHeader: Buffer.from("%PDF-1.7\n").toString("base64"),
    });
    expect(requested.success).toBe(true);
    if (!requested.success) return;

    const result = await mod.confirmExaminationEvidenceUpload({
      engagementId: seed.engagementId,
      responseId: seed.responseId,
      s3Key: requested.data.s3Key,
      filename: "report.pdf",
      fileSize: 1, // a lie
      contentType: "text/html", // also a lie
    });

    expect(result.success).toBe(true);
    const evidence = await integrationPrisma.evidence.findFirstOrThrow({
      select: { fileSize: true, contentType: true, s3Key: true },
    });
    expect(evidence.fileSize).toBe(2048);
    expect(evidence.contentType).toBe("application/pdf");
    expect(evidence.s3Key).toBe(requested.data.s3Key);
  });

  it("refuses to consume the same intent twice", async () => {
    mockS3();
    const tenant = await createTenant();
    const auditor = await createUser(tenant.id, ["AUDITOR"]);
    const seed = await seedResponse(tenant.id);

    mockSessionModule(
      fakeSession({ id: auditor.id, tenantId: tenant.id, roles: ["AUDITOR"] }),
    );
    const mod = await import("../upload-examination-evidence");

    const requested = await mod.requestExaminationEvidenceUpload({
      engagementId: seed.engagementId,
      responseId: seed.responseId,
      filename: "report.pdf",
      fileSize: 1024,
      fileHeader: Buffer.from("%PDF-1.7\n").toString("base64"),
    });
    if (!requested.success) throw new Error("setup failed");

    const input = {
      engagementId: seed.engagementId,
      responseId: seed.responseId,
      s3Key: requested.data.s3Key,
      filename: "report.pdf",
      fileSize: 1024,
      contentType: "application/pdf",
    };

    expect((await mod.confirmExaminationEvidenceUpload(input)).success).toBe(
      true,
    );
    expect((await mod.confirmExaminationEvidenceUpload(input)).success).toBe(
      false,
    );
    expect(await integrationPrisma.evidence.count()).toBe(1);
  });
});
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `npx -y pnpm@10 vitest run --config vitest.integration.config.ts src/actions/audit-execution/__integration__/upload-intent.test.ts`
Expected: all three FAIL — today an unissued key is accepted, caller metadata is persisted verbatim, and the same key can be bound twice.

- [ ] **Step 4: Write the intent data access**

Create `src/data-access/upload-intents.ts`:

```typescript
import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prismaForTenant } from "@/lib/prisma";
import type { AuthSession as Session } from "@/lib/auth";

/** How long a presigned upload may sit unconfirmed. */
export const UPLOAD_INTENT_TTL_MS = 15 * 60 * 1000;

export type UploadPurposeName = "OBSERVATION_EVIDENCE" | "EXAMINATION_EVIDENCE";

export class UploadIntentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadIntentError";
  }
}

/**
 * Record what the server just authorised: this key, for this parent, of this
 * type, up to this size. Written when the presigned URL is issued.
 */
export async function recordUploadIntent(
  session: Session,
  params: {
    s3Key: string;
    purpose: UploadPurposeName;
    parentId: string;
    contentType: string;
    maxFileSize: number;
  },
): Promise<void> {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  await db.uploadIntent.create({
    data: {
      tenantId,
      s3Key: params.s3Key,
      purpose: params.purpose,
      parentId: params.parentId,
      contentType: params.contentType,
      maxFileSize: params.maxFileSize,
      createdById: session.user.id,
      expiresAt: new Date(Date.now() + UPLOAD_INTENT_TTL_MS),
    },
  });
}

/**
 * Claim the intent for this key, inside the caller's transaction.
 *
 * The consume is a conditional update requiring exactly one row, so two
 * concurrent confirmations cannot both bind the same object.
 */
export async function consumeUploadIntent(
  tx: Prisma.TransactionClient,
  params: {
    tenantId: string;
    s3Key: string;
    purpose: UploadPurposeName;
    parentId: string;
  },
): Promise<{ contentType: string; maxFileSize: number }> {
  const intent = await tx.uploadIntent.findFirst({
    where: {
      s3Key: params.s3Key,
      tenantId: params.tenantId,
      purpose: params.purpose,
      parentId: params.parentId,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true, contentType: true, maxFileSize: true },
  });

  if (!intent) {
    throw new UploadIntentError(
      "This upload was not recognised. Please start the upload again.",
    );
  }

  const { count } = await tx.uploadIntent.updateMany({
    where: { id: intent.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  if (count !== 1) {
    throw new UploadIntentError("This upload has already been recorded.");
  }

  return { contentType: intent.contentType, maxFileSize: intent.maxFileSize };
}
```

- [ ] **Step 5: Record the intent when issuing examination upload URLs**

In `src/actions/audit-execution/upload-examination-evidence.ts`, add to the imports:

```typescript
import {
  recordUploadIntent,
  consumeUploadIntent,
  UploadIntentError,
} from "@/data-access/upload-intents";
```

After `generateUploadUrl` succeeds (`src/actions/audit-execution/upload-examination-evidence.ts:102-106`), and before the return, insert:

```typescript
await recordUploadIntent(session, {
  s3Key,
  purpose: "EXAMINATION_EVIDENCE",
  parentId: validated.responseId,
  contentType: mimeType,
  maxFileSize: validated.fileSize,
});
```

- [ ] **Step 6: Bind the examination confirmation to the intent**

In the same file, replace the body of `confirmExaminationEvidenceUpload` from the `verifyUpload` call through the transaction (`src/actions/audit-execution/upload-examination-evidence.ts:161-213`) with:

```typescript
try {
  // Trust the object, not the caller. HeadObject supplies the size and type
  // that get persisted; the intent supplies the key/parent binding.
  const uploadResult = await verifyUpload(validated.s3Key ?? "");
  if (!uploadResult.exists) {
    return {
      success: false as const,
      error: "Upload verification failed. File not found in S3.",
    };
  }

  const response = await db.auditExaminationResponse.findFirst({
    where: {
      id: validated.responseId,
      tenantId,
      engagementId: validated.engagementId,
    },
    select: { id: true },
  });

  if (!response) {
    return {
      success: false as const,
      error: "Examination response not found.",
    };
  }

  const result = await db.$transaction(async (tx: any) => {
    await setAuditContext(tx, {
      actionType: AUDIT_ACTION_TYPES.EVIDENCE.UPLOADED,
      userId: session.user.id,
      tenantId,
      sessionId: session.session.id,
    });

    const intent = await consumeUploadIntent(tx, {
      tenantId,
      s3Key: validated.s3Key ?? "",
      purpose: "EXAMINATION_EVIDENCE",
      parentId: validated.responseId,
    });

    if (uploadResult.contentType !== intent.contentType) {
      throw new UploadIntentError(
        "The uploaded file's type does not match the authorised upload.",
      );
    }
    if (
      uploadResult.contentLength <= 0 ||
      uploadResult.contentLength > intent.maxFileSize
    ) {
      throw new UploadIntentError(
        "The uploaded file's size does not match the authorised upload.",
      );
    }

    return tx.evidence.create({
      data: {
        tenantId,
        examinationResponseId: validated.responseId,
        filename: validated.filename,
        s3Key: validated.s3Key,
        fileSize: uploadResult.contentLength,
        contentType: uploadResult.contentType,
        description: validated.description ?? null,
        uploadedById: session.user.id,
      },
    });
  });

  revalidatePath("/audit-execution");

  return { success: true as const, data: { evidenceId: result.id } };
} catch (error) {
  if (error instanceof UploadIntentError) {
    return { success: false as const, error: error.message };
  }

  logger.error(
    { error, responseId: validated.responseId, tenantId },
    "Failed to confirm examination evidence upload",
  );

  return {
    success: false as const,
    error: "Failed to save evidence record. Please try again.",
  };
}
```

- [ ] **Step 7: Apply the same binding to the auditee path**

In `src/actions/auditee.ts`, add the same three imports. After `generateUploadUrl` in the request action (around `src/actions/auditee.ts:302-308`), insert:

```typescript
await recordUploadIntent(session, {
  s3Key,
  purpose: "OBSERVATION_EVIDENCE",
  parentId: observationId,
  contentType: fileTypeResult.mimeType,
  maxFileSize: fileSize,
});
```

In `confirmEvidenceUpload`, inside the transaction and immediately after `setAuditContext` (`src/actions/auditee.ts:391-397`), insert:

```typescript
const intent = await consumeUploadIntent(tx, {
  tenantId,
  s3Key,
  purpose: "OBSERVATION_EVIDENCE",
  parentId: observationId,
});

if (verifyResult.contentType !== intent.contentType) {
  throw new UploadIntentError(
    "The uploaded file's type does not match the authorised upload.",
  );
}
if (
  verifyResult.contentLength <= 0 ||
  verifyResult.contentLength > intent.maxFileSize
) {
  throw new UploadIntentError(
    "The uploaded file's size does not match the authorised upload.",
  );
}
```

and change the `tx.evidence.create` data (`src/actions/auditee.ts:407-418`) to use the verified values:

```typescript
          fileSize: verifyResult.contentLength,
          contentType: verifyResult.contentType,
```

leaving `filename`, `description`, `observationId`, `tenantId` and `uploadedById` as they are. Add an `UploadIntentError` branch to that action's `catch` that returns `error.message`, ahead of the existing `EVIDENCE_LIMIT_REACHED` handling.

- [ ] **Step 8: Run the tests**

Run: `npx -y pnpm@10 vitest run --config vitest.integration.config.ts src/actions/audit-execution/__integration__/upload-intent.test.ts`
Expected: PASS, 3 tests. If `seedResponse` fails on `ExaminationItem`'s required columns, read the model in `prisma/schema.prisma` and supply them.

Run: `npx -y pnpm@10 test:unit && npx -y pnpm@10 lint && npx -y pnpm@10 tsc --noEmit`
Expected: clean.

- [ ] **Step 9: Commit**

```bash
git add prisma/schema.prisma src/data-access/upload-intents.ts \
        src/actions/auditee.ts \
        src/actions/audit-execution/upload-examination-evidence.ts \
        src/actions/audit-execution/__integration__/upload-intent.test.ts
git commit -m "fix(evidence): bind upload confirmation to a server-issued intent

Confirmation proved only that some object existed at a caller-supplied key and
then persisted the caller's size and content type, so an existing object could
be rebound to another record with falsified metadata. Adds an UploadIntent
recorded when the presigned URL is issued and consumed exactly once at
confirmation, with size and type taken from HeadObject.

Refs F09"
```

---

### Task 7: Concurrency-safe notification claiming and batching (F11)

The claim is `updateMany({ where: { id: { in: ids } } })` with no status predicate and no count check, so two overlapping workers both "claim" the same rows and both send. Batching groups by `batchKey` alone across every tenant and recipient in the run, so a reused key mixes recipients — and `processBatchedNotifications` then sends the whole group to `notifications[0].recipient`.

**Files:**

- Modify: `prisma/schema.prisma` (`NotificationQueue.claimId`)
- Modify: `src/data-access/notifications.ts` (add `claimNotifications`)
- Modify: `src/jobs/notification-processor.ts:66-143,192-229`
- Test: `src/jobs/__integration__/notification-processor.test.ts`

**Interfaces:**

- Consumes: `withAuditedMutation`, `systemActor`; the Task 2 harness.
- Produces, from `src/data-access/notifications.ts`:
  - `claimNotifications(tenantId: string, ids: string[], claimId: string): Promise<Array<PendingNotification>>` where `PendingNotification` is the element type of `getPendingNotifications`'s result. Returns only rows this call actually moved from `PENDING` to `PROCESSING`.

- [ ] **Step 1: Add the claim column**

In `prisma/schema.prisma`, in `model NotificationQueue`, after `processedAt` (around line 1919):

```prisma
  /// Identifies the worker pass that moved this row out of PENDING. Two
  /// overlapping workers cannot share one, so the claimant can re-read exactly
  /// the rows it won.
  claimId String? @db.Uuid
```

and add to the index block:

```prisma
  @@index([claimId])
```

Regenerate: `npx -y pnpm@10 db:generate`

- [ ] **Step 2: Write the failing test**

Create `src/jobs/__integration__/notification-processor.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  resetDatabase,
  createTenant,
  createUser,
  integrationPrisma,
} from "../../../tests/integration/harness";

const sent: Array<{ to: string; subject: string }> = [];

function mockEmail() {
  sent.length = 0;
  vi.doMock("@/lib/ses-client", () => ({
    sendEmail: vi.fn(async (msg: { to: string; subject: string }) => {
      sent.push({ to: msg.to, subject: msg.subject });
      return { success: true, messageId: `ses-${sent.length}` };
    }),
  }));
  vi.doMock("@/emails/render", () => ({
    renderEmailTemplate: vi.fn(async () => ({
      subject: "Test subject",
      html: "<p>test</p>",
      text: "test",
    })),
  }));
}

async function queue(
  tenantId: string,
  recipientId: string,
  batchKey: string | null,
) {
  return integrationPrisma.notificationQueue.create({
    data: {
      tenantId,
      recipientId,
      type: "OBSERVATION_ASSIGNED",
      status: "PENDING",
      batchKey,
      sendAfter: new Date(Date.now() - 1000),
      payload: { observationTitle: "Probe" },
    },
    select: { id: true },
  });
}

describe("processNotifications", () => {
  beforeEach(async () => {
    await resetDatabase();
    vi.resetModules();
    mockEmail();
  });

  it("sends each notification once when two workers overlap", async () => {
    const tenant = await createTenant();
    const user = await createUser(tenant.id, ["AUDITEE"]);
    for (let i = 0; i < 5; i++) await queue(tenant.id, user.id, null);

    const { processNotifications } = await import("../notification-processor");
    await Promise.all([processNotifications(), processNotifications()]);

    expect(sent).toHaveLength(5);
    const states = await integrationPrisma.notificationQueue.groupBy({
      by: ["status"],
      _count: true,
    });
    expect(states).toEqual([{ status: "SENT", _count: 5 }]);
  });

  it("never batches across recipients that share a batchKey", async () => {
    const tenant = await createTenant();
    const alice = await createUser(tenant.id, ["AUDITEE"]);
    const bob = await createUser(tenant.id, ["AUDITEE"]);
    await queue(tenant.id, alice.id, "weekly");
    await queue(tenant.id, alice.id, "weekly");
    await queue(tenant.id, bob.id, "weekly");

    const { processNotifications } = await import("../notification-processor");
    await processNotifications();

    // One digest per recipient, never one digest to the wrong person.
    expect(sent).toHaveLength(2);
    const recipients = await integrationPrisma.user.findMany({
      where: { id: { in: [alice.id, bob.id] } },
      select: { email: true },
    });
    expect(new Set(sent.map((s) => s.to))).toEqual(
      new Set(recipients.map((r) => r.email)),
    );
  });

  it("never batches across tenants that share a batchKey", async () => {
    const one = await createTenant("Bank One");
    const two = await createTenant("Bank Two");
    const userOne = await createUser(one.id, ["AUDITEE"]);
    const userTwo = await createUser(two.id, ["AUDITEE"]);
    await queue(one.id, userOne.id, "weekly");
    await queue(two.id, userTwo.id, "weekly");

    const { processNotifications } = await import("../notification-processor");
    await processNotifications();

    expect(sent).toHaveLength(2);
    const logs = await integrationPrisma.emailLog.findMany({
      select: { tenantId: true },
    });
    expect(new Set(logs.map((l) => l.tenantId))).toEqual(
      new Set([one.id, two.id]),
    );
  });
});
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `npx -y pnpm@10 vitest run --config vitest.integration.config.ts src/jobs/__integration__/notification-processor.test.ts`
Expected: the overlap test FAILS with 10 sends; the cross-recipient test FAILS with one digest to one address.

- [ ] **Step 4: Add the claim helper**

In `src/data-access/notifications.ts`, after `getPendingNotifications`, add:

```typescript
// ─── claimNotifications ────────────────────────────────────────────────────

/**
 * Move PENDING rows to PROCESSING for one tenant and return exactly the rows
 * this call won.
 *
 * The status predicate lives in the UPDATE, so an overlapping worker's rows
 * are not re-claimed; the claimId lets us re-read our own winners rather than
 * assuming the ids we asked for.
 */
export async function claimNotifications(
  tenantId: string,
  ids: string[],
  claimId: string,
) {
  const { prisma } = await import("@/lib/prisma");

  await withAuditedMutation(
    systemActor(tenantId),
    "notification.claimed",
    (tx) =>
      tx.notificationQueue.updateMany({
        where: { id: { in: ids }, tenantId, status: "PENDING" },
        data: { status: "PROCESSING", claimId },
      }),
  );

  return prisma.notificationQueue.findMany({
    where: { claimId },
    include: { recipient: { select: { id: true, name: true, email: true } } },
  });
}
```

- [ ] **Step 5: Rewrite the claim and batching in the processor**

In `src/jobs/notification-processor.ts`, replace everything from the `idsByTenant` map through the batching loop (`src/jobs/notification-processor.ts:79-144`) with:

```typescript
// The queue is read across tenants, but a session context carries exactly
// one tenant, so claim one tenant at a time. A failed claim must not strand
// the tenants already claimed: later runs only select PENDING rows, so
// anything left PROCESSING but unsent would sit there for good.
const idsByTenant = new Map<string, string[]>();
for (const n of notifications) {
  const ids = idsByTenant.get(n.tenantId) ?? [];
  ids.push(n.id);
  idsByTenant.set(n.tenantId, ids);
}

const claimedNotifications: typeof notifications = [];

for (const [tenantId, ids] of idsByTenant) {
  try {
    const won = await claimNotifications(tenantId, ids, randomUUID());
    claimedNotifications.push(...won);
  } catch (error) {
    logger.error(
      {
        action: "notification_claim_failed",
        tenantId,
        stranded: ids.length,
        message: error instanceof Error ? error.message : "Unknown claim error",
      },
      "Failed to claim notifications; left PENDING for the next run",
    );
  }
}

if (claimedNotifications.length === 0) return;

const individual = claimedNotifications.filter((n) => !n.batchKey);

// A batch is one email to one person. Grouping by batchKey alone would let a
// reused key merge two tenants' or two recipients' notifications into a
// single send addressed to whichever row happened to be first.
const batched = new Map<string, typeof notifications>();
for (const n of claimedNotifications.filter((n) => n.batchKey)) {
  const key = `${n.tenantId}::${n.recipientId}::${n.batchKey}`;
  if (!batched.has(key)) batched.set(key, []);
  batched.get(key)!.push(n);
}

for (const notification of individual) {
  await processOneNotification(notification);
}

for (const [groupKey, group] of batched) {
  await processBatchedNotifications(groupKey, group);
}
```

Update the imports at the top of the file:

```typescript
import { randomUUID } from "crypto";
import {
  getPendingNotifications,
  claimNotifications,
  markNotificationSent,
  markNotificationFailed,
} from "@/data-access/notifications";
```

`withAuditedMutation` and `systemActor` are no longer used directly here — remove that import block (`src/jobs/notification-processor.ts:3-6`), since the claim now lives in the DAL.

- [ ] **Step 6: Make the batch send defend its own invariant**

Replace the opening of `processBatchedNotifications` (`src/jobs/notification-processor.ts:192-201`) with:

```typescript
async function processBatchedNotifications(
  groupKey: string,
  notifications: Awaited<ReturnType<typeof getPendingNotifications>>,
): Promise<void> {
  if (notifications.length === 0) return;

  const recipient = notifications[0].recipient;
  const tenantId = notifications[0].tenantId;

  // The grouping key already guarantees this; assert it anyway, because the
  // failure mode is one bank's findings emailed to another bank's manager.
  const mixed = notifications.some(
    (n) => n.tenantId !== tenantId || n.recipient.id !== recipient.id,
  );
  if (mixed) {
    logger.error(
      { action: "notification_batch_mixed", groupKey },
      "Refusing to send a batch spanning tenants or recipients",
    );
    for (const n of notifications) {
      await markNotificationFailed(n.id, "Batch spanned tenants or recipients");
    }
    return;
  }
```

and rename the `_batchKey` reference in that function's `catch` logging to `groupKey`.

- [ ] **Step 7: Run the tests**

Run: `npx -y pnpm@10 vitest run --config vitest.integration.config.ts src/jobs/__integration__/notification-processor.test.ts`
Expected: PASS, 3 tests.

Run: `npx -y pnpm@10 test:unit && npx -y pnpm@10 lint && npx -y pnpm@10 tsc --noEmit`
Expected: clean. The `audited-mutation-discipline` test must still pass — the `notificationQueue.updateMany` moved into `src/data-access/notifications.ts`, which uses `withAuditedMutation`.

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma src/data-access/notifications.ts \
        src/jobs/notification-processor.ts \
        src/jobs/__integration__/notification-processor.test.ts
git commit -m "fix(notifications): claim atomically and batch per tenant and recipient

Claiming updated by id with no status predicate and no count check, so two
overlapping workers both sent. Batching grouped by batchKey alone across the
whole run, so a reused key merged recipients into one email addressed to the
first row. Adds a claimId, a PENDING-predicated claim, tenant+recipient
grouping, and a refusal to send a mixed batch.

Refs F11"
```

---

### Task 8: Graceful shutdown and a real schedule for compliance escalation (F15)

`stopWorkers` has no caller, so a Coolify redeploy kills the process mid-job and pg-boss re-delivers work that had already taken effect. Separately, `POST /api/cron/escalation` is unreachable — middleware demands a session cookie before the route's Bearer check runs — and it is the only automated trigger for the ComplianceItem escalation pipeline. That pipeline has therefore never run on a schedule.

The fix is not to punch a hole in middleware for a second auth scheme. pg-boss already owns scheduled work; compliance escalation joins it, and the route goes.

**Files:**

- Modify: `src/instrumentation.ts`
- Modify: `src/lib/job-queue.ts:12-18,56-81`
- Modify: `src/jobs/index.ts`
- Delete: `src/app/api/cron/escalation/route.ts`
- Modify: `tests/TEST-PLAN.md:195-196`
- Test: `src/jobs/__integration__/compliance-escalation.test.ts`

**Interfaces:**

- Consumes: `runEscalationJobInternal` from `@/actions/compliance/run-escalation-job`; the Task 2 harness.
- Produces:
  - `JOB_NAMES.COMPLIANCE_ESCALATION = "compliance-escalation"` in `src/lib/job-queue.ts`.
  - `processComplianceEscalation(): Promise<void>` exported from `src/jobs/compliance-escalation.ts`.

- [ ] **Step 1: Write the failing test**

Create `src/jobs/__integration__/compliance-escalation.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  resetDatabase,
  createTenant,
  createUser,
  integrationPrisma,
} from "../../../tests/integration/harness";

describe("processComplianceEscalation", () => {
  beforeEach(async () => {
    await resetDatabase();
    vi.resetModules();
  });

  it("runs across every tenant and survives one tenant failing", async () => {
    const one = await createTenant("Bank One");
    const two = await createTenant("Bank Two");
    await createUser(one.id, ["CAE"]);
    await createUser(two.id, ["CAE"]);

    const seen: string[] = [];
    vi.doMock("@/actions/compliance/run-escalation-job", () => ({
      runEscalationJobInternal: vi.fn(async (tenantId: string) => {
        seen.push(tenantId);
        if (tenantId === one.id) throw new Error("simulated tenant failure");
        return { success: true, data: { escalated: 0 } };
      }),
    }));

    const { processComplianceEscalation } =
      await import("../compliance-escalation");
    await processComplianceEscalation();

    expect(new Set(seen)).toEqual(new Set([one.id, two.id]));
  });

  it("does nothing when there are no tenants", async () => {
    const { processComplianceEscalation } =
      await import("../compliance-escalation");
    await expect(processComplianceEscalation()).resolves.toBeUndefined();
    expect(await integrationPrisma.tenant.count()).toBe(0);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx -y pnpm@10 vitest run --config vitest.integration.config.ts src/jobs/__integration__/compliance-escalation.test.ts`
Expected: FAIL — `Cannot find module '../compliance-escalation'`.

- [ ] **Step 3: Write the job**

Create `src/jobs/compliance-escalation.ts`:

```typescript
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

/**
 * Daily ComplianceItem escalation (R39) across every tenant.
 *
 * This pipeline previously had no scheduled trigger at all: its only caller was
 * POST /api/cron/escalation, which middleware blocked because it requires a
 * session cookie before any route-level Bearer check. Scheduling it here puts
 * it alongside the other recurring work, with no second auth scheme and no
 * externally reachable endpoint.
 *
 * Distinct from processOverdueEscalation, which escalates Observations.
 */
export async function processComplianceEscalation(): Promise<void> {
  const { runEscalationJobInternal } =
    await import("@/actions/compliance/run-escalation-job");

  const tenants = await prisma.tenant.findMany({
    select: { id: true, shortName: true },
  });

  let succeeded = 0;
  let failed = 0;

  for (const tenant of tenants) {
    try {
      await runEscalationJobInternal(tenant.id);
      succeeded++;
    } catch (error) {
      failed++;
      logger.error(
        {
          action: "compliance_escalation_tenant_failed",
          tenantId: tenant.id,
          name: tenant.shortName,
          message: error instanceof Error ? error.message : "Unknown error",
        },
        "Compliance escalation failed for tenant",
      );
    }
  }

  logger.info(
    {
      action: "compliance_escalation_complete",
      tenants: tenants.length,
      succeeded,
      failed,
    },
    "Compliance escalation completed",
  );
}
```

- [ ] **Step 4: Schedule it**

In `src/lib/job-queue.ts`, add to `JOB_NAMES` (`src/lib/job-queue.ts:12-18`):

```typescript
  COMPLIANCE_ESCALATION: "compliance-escalation",
```

In `startWorkers`, add a queue after the others (`src/lib/job-queue.ts:71`):

```typescript
await queue.createQueue(JOB_NAMES.COMPLIANCE_ESCALATION, QUEUE_OPTIONS);
```

and a schedule after the others (`src/lib/job-queue.ts:76`):

```typescript
await queue.schedule(JOB_NAMES.COMPLIANCE_ESCALATION, "0 1 * * *"); // daily 01:00 UTC = 06:30 IST
```

In `src/jobs/index.ts`, add the import and the mirrored job name and handler:

```typescript
import { processComplianceEscalation } from "./compliance-escalation";
```

```typescript
  COMPLIANCE_ESCALATION: "compliance-escalation",
```

```typescript
// Daily ComplianceItem escalation (06:30 IST), after deadline-check
await boss.work(JOBS.COMPLIANCE_ESCALATION, async () => {
  await processComplianceEscalation();
});
```

- [ ] **Step 5: Wire graceful shutdown**

Replace `src/instrumentation.ts` entirely:

```typescript
/**
 * Next.js instrumentation hook.
 *
 * Runs once on server start. Initializes:
 * - Sentry error tracking (server/edge runtimes)
 * - pg-boss job queue and scheduled workers
 * - Signal handlers that stop those workers before the process exits
 */

/** Module-level so dev-server hot reloads do not stack handlers. */
let shutdownRegistered = false;

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
    const { startWorkers, stopWorkers } = await import("./lib/job-queue");
    await startWorkers();

    if (!shutdownRegistered) {
      shutdownRegistered = true;

      // Coolify stops a container with SIGTERM. Without this, in-flight jobs
      // are killed mid-transaction and pg-boss re-delivers work whose side
      // effects already happened.
      const shutdown = async (signal: NodeJS.Signals) => {
        try {
          await stopWorkers();
        } catch {
          // Nothing useful to do at this point; the process is going away.
        } finally {
          process.exit(signal === "SIGTERM" ? 0 : 130);
        }
      };

      process.once("SIGTERM", () => void shutdown("SIGTERM"));
      process.once("SIGINT", () => void shutdown("SIGINT"));
    }
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}
```

- [ ] **Step 6: Delete the dead route**

```bash
git rm src/app/api/cron/escalation/route.ts
rmdir src/app/api/cron/escalation src/app/api/cron
```

In `tests/TEST-PLAN.md`, replace lines 195–196 with:

```markdown
- [ ] **T094** — The `compliance-escalation` pg-boss job runs daily and escalates open ComplianceItems per tenant
- [ ] **T095** — A tenant failing escalation does not stop the remaining tenants
```

- [ ] **Step 7: Run the tests**

Run: `npx -y pnpm@10 vitest run --config vitest.integration.config.ts src/jobs/__integration__/compliance-escalation.test.ts`
Expected: PASS, 2 tests.

Run: `npx -y pnpm@10 test:unit && npx -y pnpm@10 lint && npx -y pnpm@10 tsc --noEmit && npx -y pnpm@10 build`
Expected: clean. The build must be run here specifically: deleting a route changes the App Router manifest.

- [ ] **Step 8: Verify shutdown by hand**

```bash
npx -y pnpm@10 build && npx -y pnpm@10 start &
sleep 20
kill -TERM %1
```

Expected: the log shows `pg-boss stopped gracefully` before the process exits. Without the change, it exits with no such line.

- [ ] **Step 9: Commit**

```bash
git add src/instrumentation.ts src/lib/job-queue.ts src/jobs/index.ts \
        src/jobs/compliance-escalation.ts \
        src/jobs/__integration__/compliance-escalation.test.ts tests/TEST-PLAN.md
git commit -m "fix(jobs): stop workers on SIGTERM and schedule compliance escalation

stopWorkers had no caller, so a redeploy killed jobs mid-transaction and
pg-boss re-delivered work whose side effects had already landed. Separately,
POST /api/cron/escalation was unreachable behind session middleware and was the
only automated trigger for the ComplianceItem escalation pipeline, which has
therefore never run. Schedules that pipeline in pg-boss and deletes the route.

Refs F15"
```

---

### Task 9: Regression coverage for the remaining named gaps (F13)

Tasks 3–8 covered `transitionObservation`, `freezeRbiaScore`, `processNotifications` and the escalation job. The finding also names `saveAccountExamResponse`, and `runEscalationJobInternal` deserves a test of its own logic rather than only of the loop around it.

`saveAccountExamResponse` has an authorization defect of its own (F06: it accepts `audit_execution:read` for a write). **That fix belongs to the F01–F06 plan, not this one.** These tests characterise what the action does today and assert the tenant-scoping it already claims, so that the F06 fix has a safety net to land against. Do not change the action here.

**Files:**

- Create: `src/actions/account-examination/__integration__/save-response.test.ts`
- Create: `src/actions/compliance/__integration__/run-escalation-job.test.ts`

**Interfaces:**

- Consumes: the Task 2 harness. Adds no production exports.

- [ ] **Step 1: Write the account-examination characterisation test**

`saveAccountExamResponse` takes `{ engagementId, loanAccountId, questionId, status, note? }` where `status` is `"COMPLIANT" | "VIOLATION"`, and returns `ActionResult<{ id, status }>`. It enforces: engagement in-tenant, engagement status in `IN_PROGRESS | OPENING_MEETING | EXIT_MEETING | REPORT_DRAFT`, and loan account in-tenant, in-engagement, and `isSampled`. It does **not** check the question's tenant or module — that is the F06 gap, and the last test below pins it as a named target rather than pretending it is already closed.

Create `src/actions/account-examination/__integration__/save-response.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { randomUUID } from "crypto";
import {
  resetDatabase,
  createTenant,
  createUser,
  fakeSession,
  mockSessionModule,
  integrationPrisma,
} from "../../../../tests/integration/harness";

/**
 * Characterisation tests: they describe what this action does today, so the
 * F06 authorization fix (require examination:respond, an audit-team
 * assignment, and a tenant/module-scoped question) has a net to land against.
 */
async function seedEngagement(tenantId: string, status = "IN_PROGRESS") {
  const plan = await integrationPrisma.auditPlan.create({
    data: { tenantId, year: 2026, quarter: 1, status: "PLANNED" },
    select: { id: true },
  });
  const engagement = await integrationPrisma.auditEngagement.create({
    data: {
      tenantId,
      auditPlanId: plan.id,
      auditNumber: `RBIA/2026-27/${randomUUID().slice(0, 8)}/V1`,
      periodFrom: new Date("2026-04-01"),
      periodTo: new Date("2026-06-30"),
      status,
    },
    select: { id: true },
  });
  return engagement;
}

async function seedLoanAccount(
  tenantId: string,
  engagementId: string,
  isSampled: boolean,
) {
  return integrationPrisma.loanAccount.create({
    data: {
      tenantId,
      engagementId,
      accountNumber: `LN-${randomUUID().slice(0, 8)}`,
      isSampled,
    },
    select: { id: true },
  });
}

async function seedQuestion(tenantId: string, moduleCode = "CRD-HLN") {
  return integrationPrisma.examinationQuestion.create({
    data: {
      tenantId,
      moduleCode,
      text: `Is the documentation complete? ${randomUUID()}`,
    },
    select: { id: true },
  });
}

describe("saveAccountExamResponse", () => {
  beforeEach(async () => {
    await resetDatabase();
    vi.resetModules();
  });

  it("saves a response for a sampled account in the acting tenant", async () => {
    const tenant = await createTenant();
    const auditor = await createUser(tenant.id, ["AUDITOR"]);
    const engagement = await seedEngagement(tenant.id);
    const account = await seedLoanAccount(tenant.id, engagement.id, true);
    const question = await seedQuestion(tenant.id);

    mockSessionModule(
      fakeSession({ id: auditor.id, tenantId: tenant.id, roles: ["AUDITOR"] }),
    );
    const { saveAccountExamResponse } = await import("../save-response");

    const result = await saveAccountExamResponse({
      engagementId: engagement.id,
      loanAccountId: account.id,
      questionId: question.id,
      status: "VIOLATION",
      note: "Sanction letter missing",
    });

    expect(result.success).toBe(true);
    expect(await integrationPrisma.accountExamResponse.count()).toBe(1);
  });

  it("upserts rather than duplicating on re-save", async () => {
    const tenant = await createTenant();
    const auditor = await createUser(tenant.id, ["AUDITOR"]);
    const engagement = await seedEngagement(tenant.id);
    const account = await seedLoanAccount(tenant.id, engagement.id, true);
    const question = await seedQuestion(tenant.id);

    mockSessionModule(
      fakeSession({ id: auditor.id, tenantId: tenant.id, roles: ["AUDITOR"] }),
    );
    const { saveAccountExamResponse } = await import("../save-response");

    const input = {
      engagementId: engagement.id,
      loanAccountId: account.id,
      questionId: question.id,
      status: "COMPLIANT" as const,
    };
    await saveAccountExamResponse(input);
    await saveAccountExamResponse({ ...input, status: "VIOLATION" });

    const rows = await integrationPrisma.accountExamResponse.findMany({
      select: { status: true },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("VIOLATION");
  });

  it("refuses an engagement belonging to another tenant", async () => {
    const attacker = await createTenant("Attacker Bank");
    const victim = await createTenant("Victim Bank");
    const attackerUser = await createUser(attacker.id, ["AUDITOR"]);
    const victimEngagement = await seedEngagement(victim.id);
    const victimAccount = await seedLoanAccount(
      victim.id,
      victimEngagement.id,
      true,
    );
    const victimQuestion = await seedQuestion(victim.id);

    mockSessionModule(
      fakeSession({
        id: attackerUser.id,
        tenantId: attacker.id,
        roles: ["AUDITOR"],
      }),
    );
    const { saveAccountExamResponse } = await import("../save-response");

    const result = await saveAccountExamResponse({
      engagementId: victimEngagement.id,
      loanAccountId: victimAccount.id,
      questionId: victimQuestion.id,
      status: "VIOLATION",
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/not found/i);
    expect(await integrationPrisma.accountExamResponse.count()).toBe(0);
  });

  it("refuses an account that is not in the sample", async () => {
    const tenant = await createTenant();
    const auditor = await createUser(tenant.id, ["AUDITOR"]);
    const engagement = await seedEngagement(tenant.id);
    const account = await seedLoanAccount(tenant.id, engagement.id, false);
    const question = await seedQuestion(tenant.id);

    mockSessionModule(
      fakeSession({ id: auditor.id, tenantId: tenant.id, roles: ["AUDITOR"] }),
    );
    const { saveAccountExamResponse } = await import("../save-response");

    const result = await saveAccountExamResponse({
      engagementId: engagement.id,
      loanAccountId: account.id,
      questionId: question.id,
      status: "COMPLIANT",
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/sample/i);
  });

  it("refuses an engagement that is not in a scoring-allowed status", async () => {
    const tenant = await createTenant();
    const auditor = await createUser(tenant.id, ["AUDITOR"]);
    const engagement = await seedEngagement(tenant.id, "COMPLETED");
    const account = await seedLoanAccount(tenant.id, engagement.id, true);
    const question = await seedQuestion(tenant.id);

    mockSessionModule(
      fakeSession({ id: auditor.id, tenantId: tenant.id, roles: ["AUDITOR"] }),
    );
    const { saveAccountExamResponse } = await import("../save-response");

    const result = await saveAccountExamResponse({
      engagementId: engagement.id,
      loanAccountId: account.id,
      questionId: question.id,
      status: "COMPLIANT",
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/COMPLETED/);
  });

  // F06 target. The action never checks the question's tenant, so a question
  // from another bank can be attached to a sampled account. This test asserts
  // the CURRENT behaviour on purpose: when F06 lands, invert it to expect
  // `success: false` and delete this comment.
  it("currently accepts a question from another tenant (F06 gap)", async () => {
    const tenant = await createTenant("Acting Bank");
    const other = await createTenant("Other Bank");
    const auditor = await createUser(tenant.id, ["AUDITOR"]);
    const engagement = await seedEngagement(tenant.id);
    const account = await seedLoanAccount(tenant.id, engagement.id, true);
    const foreignQuestion = await seedQuestion(other.id);

    mockSessionModule(
      fakeSession({ id: auditor.id, tenantId: tenant.id, roles: ["AUDITOR"] }),
    );
    const { saveAccountExamResponse } = await import("../save-response");

    const result = await saveAccountExamResponse({
      engagementId: engagement.id,
      loanAccountId: account.id,
      questionId: foreignQuestion.id,
      status: "VIOLATION",
    });

    expect(result.success).toBe(true);
  });
});
```

If `seedLoanAccount` fails on a required column, read `model LoanAccount` in `prisma/schema.prisma` and supply what it needs — do not relax the schema.

- [ ] **Step 2: Write the escalation job test**

Create `src/actions/compliance/__integration__/run-escalation-job.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  resetDatabase,
  createTenant,
  createUser,
  integrationPrisma,
} from "../../../../tests/integration/harness";

async function seedOverdueComplianceItem(
  tenantId: string,
  daysOverdue: number,
) {
  const branch = await integrationPrisma.branch.create({
    data: { tenantId, code: "BR-001", name: "Main", city: "Pune", state: "MH" },
    select: { id: true },
  });
  const user = await createUser(tenantId, ["AUDITOR"]);
  const observation = await integrationPrisma.observation.create({
    data: {
      tenantId,
      title: "Overdue item",
      condition: "c",
      criteria: "c",
      cause: "c",
      effect: "c",
      recommendation: "r",
      severity: "HIGH",
      status: "ISSUED",
      branchId: branch.id,
      createdById: user.id,
    },
    select: { id: true },
  });
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() - daysOverdue);

  return integrationPrisma.complianceItem.create({
    data: {
      tenantId,
      observationId: observation.id,
      branchId: branch.id,
      status: "OPEN",
      dueDate,
      escalationLevel: 0,
      daysOpen: daysOverdue,
    },
    select: { id: true },
  });
}

describe("runEscalationJobInternal", () => {
  beforeEach(async () => {
    await resetDatabase();
    vi.resetModules();
  });

  it("raises the escalation level of an overdue item", async () => {
    const tenant = await createTenant();
    const item = await seedOverdueComplianceItem(tenant.id, 45);

    const { runEscalationJobInternal } = await import("../run-escalation-job");
    const result = await runEscalationJobInternal(tenant.id);

    expect(result.success).toBe(true);
    const after = await integrationPrisma.complianceItem.findUniqueOrThrow({
      where: { id: item.id },
      select: { escalationLevel: true },
    });
    expect(after.escalationLevel).toBeGreaterThan(0);
  });

  it("touches no other tenant's items", async () => {
    const one = await createTenant("Bank One");
    const two = await createTenant("Bank Two");
    await seedOverdueComplianceItem(one.id, 45);
    const untouched = await seedOverdueComplianceItem(two.id, 45);

    const { runEscalationJobInternal } = await import("../run-escalation-job");
    await runEscalationJobInternal(one.id);

    const after = await integrationPrisma.complianceItem.findUniqueOrThrow({
      where: { id: untouched.id },
      select: { escalationLevel: true },
    });
    expect(after.escalationLevel).toBe(0);
  });

  it("is a no-op for a tenant with no open items", async () => {
    const tenant = await createTenant();
    const { runEscalationJobInternal } = await import("../run-escalation-job");
    const result = await runEscalationJobInternal(tenant.id);
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 3: Run them**

Run: `npx -y pnpm@10 vitest run --config vitest.integration.config.ts`
Expected: the whole integration suite passes. If a characterisation test fails because the action's real behaviour differs from the assertion, **change the test to match the action** and note the discrepancy in the commit message — these tests describe today, not the desired end state.

- [ ] **Step 4: Commit**

```bash
git add src/actions/account-examination/__integration__ \
        src/actions/compliance/__integration__
git commit -m "test: cover account examination writes and the escalation job

Completes the set of behaviours F13 named as untested. The account-examination
tests are characterisation only: they lock in the tenant scoping that exists
today so the F06 authorization fix has a net to land against.

Refs F13"
```

---

### Task 10: A blocking browser smoke subset (F14)

The `e2e` job is `if: github.event_name == 'pull_request'` and `continue-on-error: true`, so a known browser regression merges with every required check green — and merging to `main` deploys. The answer is not to make a 40-minute flaky suite blocking; it is to carve out a small, deterministic critical path that does block, and leave the rest advisory.

**Files:**

- Create: `tests/e2e/smoke.spec.ts`
- Modify: `tests/e2e/observation-lifecycle.spec.ts:160-192,199-224`
- Modify: `scripts/seed-full-audit-lifecycle.ts`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml:222-287`

**Interfaces:**

- Consumes: existing Playwright auth states in `playwright/.auth/*.json` (see `tests/auth.setup.ts`); the bootstrap scripts from Task 1.
- Produces: `pnpm test:e2e:smoke` runs only tests tagged `@smoke`.

- [ ] **Step 1: Write the smoke suite**

Create `tests/e2e/smoke.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

/**
 * The blocking subset. Every test here must be deterministic against a freshly
 * seeded database — no conditional assertions, no `if (count > 0)`. If a test
 * cannot meet that bar it belongs in the advisory suite, not here.
 *
 * Tagged @smoke; run with `pnpm test:e2e:smoke`.
 */

test.describe("@smoke critical paths", () => {
  test("an unauthenticated visitor is redirected to login @smoke", async ({
    page,
  }) => {
    await page.context().clearCookies();
    await page.goto("/findings");
    await expect(page).toHaveURL(/\/login/);
  });

  test("the health endpoint reports ok @smoke", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("ok");
  });

  test.describe("as an auditor", () => {
    test.use({ storageState: "playwright/.auth/auditor.json" });

    test("the findings list renders seeded observations @smoke", async ({
      page,
    }) => {
      await page.goto("/findings");
      await expect(
        page.getByRole("heading", { name: /findings/i }),
      ).toBeVisible();
      await expect(page.getByRole("table")).toBeVisible();
      await expect(page.locator("tbody tr").first()).toBeVisible();
    });

    test("the dashboard renders without a server error @smoke", async ({
      page,
    }) => {
      const response = await page.goto("/dashboard");
      expect(response?.status()).toBeLessThan(400);
      await expect(
        page.getByRole("heading", { name: /dashboard/i }),
      ).toBeVisible();
    });

    test("an observation can be created and opened @smoke", async ({
      page,
    }) => {
      await page.goto("/findings/new");
      await page.getByLabel(/^title/i).fill("Smoke: cash retention breach");
      await page.getByLabel(/condition/i).fill("Cash held above the limit");
      await page.getByLabel(/criteria/i).fill("RBI cash retention limit");
      await page.getByLabel(/cause/i).fill("Manual reconciliation gap");
      await page.getByLabel(/effect/i).fill("Elevated operational risk");
      await page
        .getByLabel(/recommendation/i)
        .fill("Automate the daily reconciliation");

      await page.getByRole("combobox", { name: /severity/i }).click();
      await page
        .getByRole("option", { name: /^high$/i })
        .first()
        .click();
      await page.getByRole("combobox", { name: /^branch$/i }).click();
      await page.getByRole("option").first().click();
      await page.getByRole("combobox", { name: /audit area/i }).click();
      await page.getByRole("option").first().click();

      await page.getByRole("button", { name: /create observation/i }).click();
      await expect(page).toHaveURL(/\/findings\/[a-f0-9-]+/);
      await expect(page.getByText(/created/i).first()).toBeVisible();
    });
  });

  test.describe("as an auditee", () => {
    test.use({ storageState: "playwright/.auth/auditee.json" });

    test("an auditee cannot reach the admin area @smoke", async ({ page }) => {
      await page.goto("/admin/users");
      await expect(
        page.getByText(/permission|not authori[sz]ed|forbidden/i),
      ).toBeVisible();
    });
  });
});
```

- [ ] **Step 2: Add a COMPLIANCE-state fixture to the lifecycle seed**

In `scripts/seed-full-audit-lifecycle.ts`, add one observation in `COMPLIANCE` state with a stable, greppable title. Place it beside the existing observation creation, following the file's own helper style:

```typescript
// A LOW-severity observation parked in COMPLIANCE, so the E2E suite can
// exercise the COMPLIANCE → CLOSED transition deterministically. The title is
// matched verbatim by tests/e2e/observation-lifecycle.spec.ts.
await prisma.observation.create({
  data: {
    tenantId,
    title: "E2E fixture: low severity awaiting closure",
    condition: "Register not initialled for two days",
    criteria: "Branch operations manual, clause 4.2",
    cause: "Officer on leave without a delegate",
    effect: "Minor control lapse",
    recommendation: "Nominate a standing delegate",
    severity: "LOW",
    status: "COMPLIANCE",
    branchId,
    auditAreaId,
    createdById: auditorId,
    version: 1,
  },
});
```

Use the `tenantId`, `branchId`, `auditAreaId` and `auditorId` bindings already in scope at that point in the script.

- [ ] **Step 3: Unskip and make Group 3 deterministic**

In `tests/e2e/observation-lifecycle.spec.ts`, replace the whole of Test Group 3 (lines 156–192) with a serial group that drives the lifecycle itself instead of hunting for an ISSUED row:

```typescript
// ═══════════════════════════════════════════════════════════════════════════
// Test Group 3: Auditee Response (OBS-02)
// ═══════════════════════════════════════════════════════════════════════════

test.describe.serial("Test Group 3: Auditee Response", () => {
  // Drives its own fixture: an auditor creates and submits, a manager approves
  // and issues, then the auditee responds. Previously skipped because it
  // assumed an ISSUED observation existed in the seed.
  test.use({ storageState: "playwright/.auth/auditor.json" });

  let observationUrl: string;

  test("auditor creates and submits an observation", async ({ page }) => {
    await createObservation(page, { title: "Auditee response test finding" });
    observationUrl = page.url();

    await page.getByRole("button", { name: /submit for review/i }).click();
    await page
      .getByPlaceholder(/reason for this transition/i)
      .fill("Submitting for review");
    await page.getByRole("button", { name: /^confirm$/i }).click();
    await expect(page.getByText(/submitted/i).first()).toBeVisible();
  });

  test("manager approves and issues it", async ({ browser }) => {
    const managerCtx = await browser.newContext({
      storageState: "playwright/.auth/manager.json",
    });
    const page = await managerCtx.newPage();
    await page.goto(observationUrl);

    await page.getByRole("button", { name: /approve/i }).click();
    await page
      .getByPlaceholder(/reason for this transition/i)
      .fill("Approved for issuance");
    await page.getByRole("button", { name: /^confirm$/i }).click();
    await expect(page.getByText(/reviewed/i).first()).toBeVisible();

    await page.getByRole("button", { name: /issue to auditee/i }).click();
    await page
      .getByPlaceholder(/reason for this transition/i)
      .fill("Issuing to branch manager");
    await page.getByRole("button", { name: /^confirm$/i }).click();
    await expect(page.getByText(/issued/i).first()).toBeVisible();

    await managerCtx.close();
  });

  test("auditee submits a response", async ({ browser }) => {
    const auditeeCtx = await browser.newContext({
      storageState: "playwright/.auth/auditee.json",
    });
    const page = await auditeeCtx.newPage();
    await page.goto(observationUrl);

    await page.getByRole("button", { name: /submit response/i }).click();
    await page
      .getByLabel(/response/i)
      .fill("We have implemented corrective actions");
    await page
      .getByLabel(/action plan/i)
      .fill("Completed documentation review training for all staff");
    await page.getByRole("button", { name: /^submit$/i }).click();

    await expect(page.getByText(/response/i).first()).toBeVisible();

    await auditeeCtx.close();
  });
});
```

- [ ] **Step 4: Convert the Group 4 fixme to a seeded selection**

Replace the `test.fixme("manager can close LOW/MEDIUM observations", ...)` block (lines 199–224, including its explanatory comment) with:

```typescript
// Uses the COMPLIANCE-state fixture from scripts/seed-full-audit-lifecycle.ts,
// selected by its exact title. The previous version searched the list for a
// row matching /low|medium/ and "Compliance", which collided with an
// AuditArea named "Compliance" and could never be made reliable.
test("manager can close LOW/MEDIUM observations", async ({ page }) => {
  await page.goto("/findings");

  await page
    .getByRole("row")
    .filter({ hasText: "E2E fixture: low severity awaiting closure" })
    .first()
    .click();

  await expect(page).toHaveURL(/\/findings\/[a-f0-9-]+/);
  await expect(
    page.getByRole("button", { name: /close observation/i }),
  ).toBeVisible();
});
```

Leave Test Group 7 (repeat finding detection) as `test.skip`. It needs a CLOSED observation plus a matching new one to trigger similarity detection, which is a fixture of its own; do not fake it here.

- [ ] **Step 5: Add the smoke script**

In `package.json`, after `"test:e2e"`:

```json
    "test:e2e:smoke": "playwright test --grep @smoke",
```

- [ ] **Step 6: Split the CI jobs**

In `.github/workflows/ci.yml`, replace the single `e2e` job (`.github/workflows/ci.yml:222-287`) with two. The smoke job runs on PRs **and** on pushes to `main`, and blocks; the full suite stays advisory:

```yaml
# Blocking browser subset. Small, deterministic, and gates the merge that
# deploys — the full suite below stays advisory because it is slow and has
# known flaky scenarios.
e2e-smoke:
  runs-on: ubuntu-latest
  services:
    postgres:
      image: postgres:16-alpine
      env:
        POSTGRES_USER: test
        POSTGRES_PASSWORD: testpassword
        POSTGRES_DB: aegis_test
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
      ports:
        - 5432:5432
  env:
    DATABASE_URL: postgresql://test:testpassword@localhost:5432/aegis_test
    BETTER_AUTH_SECRET: e2e-test-secret-0123456789abcdef0123456789abcdef
    BETTER_AUTH_URL: http://localhost:3000
    NEXT_PUBLIC_APP_URL: http://localhost:3000
    SKIP_ENV_VALIDATION: "1"
  steps:
    - name: Checkout code
      uses: actions/checkout@v6

    - name: Install pnpm
      uses: pnpm/action-setup@v4
      with:
        version: 10

    - name: Setup Node.js
      uses: actions/setup-node@v6
      with:
        node-version: 22
        cache: "pnpm"

    - name: Install dependencies
      run: pnpm install --frozen-lockfile

    - name: Generate Prisma Client
      run: pnpm prisma generate

    - name: Push database schema
      run: pnpm db:push

    - name: Apply non-Prisma database objects
      run: pnpm db:bootstrap

    - name: Verify required database objects
      run: pnpm db:verify

    - name: Seed database
      run: pnpm db:seed

    - name: Seed audit lifecycle fixtures
      run: pnpm seed:lifecycle

    - name: Install Playwright browsers
      run: npx playwright install --with-deps chromium

    - name: Run smoke tests
      run: pnpm test:e2e:smoke

    - name: Upload test report
      uses: actions/upload-artifact@v6
      if: failure()
      with:
        name: playwright-report-smoke
        path: playwright-report/
        retention-days: 3

# Full browser suite — advisory. Quarantine individual flaky scenarios with
# test.skip and a reason; do not restore continue-on-error to e2e-smoke.
e2e:
  if: github.event_name == 'pull_request'
  runs-on: ubuntu-latest
  continue-on-error: true
  services:
    postgres:
      image: postgres:16-alpine
      env:
        POSTGRES_USER: test
        POSTGRES_PASSWORD: testpassword
        POSTGRES_DB: aegis_test
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
      ports:
        - 5432:5432
  env:
    DATABASE_URL: postgresql://test:testpassword@localhost:5432/aegis_test
    BETTER_AUTH_SECRET: e2e-test-secret-0123456789abcdef0123456789abcdef
    BETTER_AUTH_URL: http://localhost:3000
    NEXT_PUBLIC_APP_URL: http://localhost:3000
    SKIP_ENV_VALIDATION: "1"
  steps:
    - name: Checkout code
      uses: actions/checkout@v6

    - name: Install pnpm
      uses: pnpm/action-setup@v4
      with:
        version: 10

    - name: Setup Node.js
      uses: actions/setup-node@v6
      with:
        node-version: 22
        cache: "pnpm"

    - name: Install dependencies
      run: pnpm install --frozen-lockfile

    - name: Generate Prisma Client
      run: pnpm prisma generate

    - name: Push database schema
      run: pnpm db:push

    - name: Apply non-Prisma database objects
      run: pnpm db:bootstrap

    - name: Verify required database objects
      run: pnpm db:verify

    - name: Seed database
      run: pnpm db:seed

    - name: Seed audit lifecycle fixtures
      run: pnpm seed:lifecycle

    - name: Install Playwright browsers
      run: npx playwright install --with-deps chromium

    - name: Run E2E tests
      run: pnpm test:e2e

    - name: Upload test report
      uses: actions/upload-artifact@v6
      if: failure()
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 3
```

- [ ] **Step 7: Run the suites locally**

```bash
export DATABASE_URL="postgresql://postgres:test@localhost:55432/aegis_test"
npx -y pnpm@10 db:push && npx -y pnpm@10 db:bootstrap && npx -y pnpm@10 db:verify
npx -y pnpm@10 db:seed && npx -y pnpm@10 seed:lifecycle
npx -y pnpm@10 test:e2e:smoke
```

Expected: 6 smoke tests pass. Run the smoke suite three times in a row — if any test is not stable across all three, move it out of `@smoke` rather than making the gate flaky.

Then: `npx -y pnpm@10 test:e2e`
Expected: Groups 3 and 4 now pass; Group 7 remains skipped.

- [ ] **Step 8: Commit**

```bash
git add tests/e2e/smoke.spec.ts tests/e2e/observation-lifecycle.spec.ts \
        scripts/seed-full-audit-lifecycle.ts package.json .github/workflows/ci.yml
git commit -m "ci: gate merges on a deterministic browser smoke subset

The only browser job was PR-only and continue-on-error, so a known regression
merged with every required check green — and merging deploys. Adds a small
blocking @smoke suite that also runs on pushes to main, keeps the slow suite
advisory, and replaces two conditional lifecycle tests with seeded fixtures.

Refs F14, F13"
```

---

## Verification

After all ten tasks, on the feature branch:

```bash
npx -y pnpm@10 lint
npx -y pnpm@10 tsc --noEmit
npx -y pnpm@10 test:unit
npx -y pnpm@10 test:integration
npx -y pnpm@10 test:e2e:smoke
npx -y pnpm@10 build
```

All six must pass before opening the PR. CI runs on the **merge ref**, so a green check reflects branch + `main` at that moment, not the branch alone.

## Production Rollout Order

**Nothing in the deploy touches the database.** The container runs `node server.js`; `pnpm start` is `next start`. There is no `prisma migrate deploy` and no `db push`, so _every_ database change here is applied by hand — including Task 5's, 6's and 7's ordinary columns and tables. Merging first would deploy code that queries `UploadIntent`, `NotificationQueue.claimId` and `ExaminationResponse.isNotApplicable` against a database that has none of them, and `/api/health` (a `SELECT 1` plus a pgboss row count) would stay green throughout.

Apply in this order, **before** merging:

1. `prisma/migrations/20260904_f07_f15_schema_additions.sql` — the enum, table, columns and `(tenantId, id)` unique indexes from Tasks 5–7. Idempotent. **This must precede step 3:** the manifest includes `060_tenant_composite_fks.sql`, whose composite FKs reference those unique indexes, so bootstrapping first fails with _no unique constraint matching given keys_.
2. The pre-check queries in `prisma/sql/060_tenant_composite_fks.sql`'s header. Each must return zero rows. If any returns rows there is existing cross-tenant data: stop and repair it. Do not weaken the constraint.
3. `pnpm db:bootstrap` — the whole manifest, idempotent, safe on the current database.
4. Merge. Coolify deploys automatically.
5. `pnpm db:verify` — asserts every required object landed.

```bash
ssh vps 'sudo docker exec -i ii2dkkgiwrf76iesksuhv5iq psql -U aegis -d aegis' < prisma/migrations/20260904_f07_f15_schema_additions.sql
DATABASE_URL=... pnpm db:bootstrap && DATABASE_URL=... pnpm db:verify
curl -fsS https://aegis.nexlyadvisory.com/api/health | jq
```

## Out of Scope

- **F01–F06** (identity and authorization) — a separate plan. Task 9 deliberately characterises `saveAccountExamResponse`'s current behaviour rather than fixing its F06 permission defect.
- **A UI control for `isNotApplicable`** — Task 5 adds the field and the gate; the examination response form needs a matching control or auditors will be unable to satisfy the gate. Raise as a follow-up issue before Task 5 merges.
- ~~**Widening `audit_trigger` to `NotificationPreference` and `BoardReport`**~~ — resolved rather than deferred. Leaving them unattached meant board reports and notification preferences were silently unaudited in production while `AUDITED_TABLES`, `prisma/migrations/superseded/README.md` and `db:verify` all said otherwise. Every write site already carries audit context (`withAuditedMutation` or `setAuditContext`), so `020_attach_audit_triggers.sql` now attaches all 16, and a manifest test asserts the three lists agree.
- **Test Group 7 (repeat finding detection)** in the E2E suite — needs its own CLOSED-observation fixture.
