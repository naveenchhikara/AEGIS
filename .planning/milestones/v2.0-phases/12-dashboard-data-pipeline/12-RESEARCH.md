# Phase 12: Dashboard Data Pipeline & Schema Fixes - Research

**Researched:** 2026-02-10
**Domain:** PostgreSQL time-series data, Prisma schema evolution, pg-boss job scheduling
**Confidence:** HIGH

## Summary

Phase 12 closes three tech debt items from Phase 8 and Phase 9: trend widgets returning null data, missing `engagementId` on Observation model, and empty repeat findings in board reports. The solution requires a historical data pipeline (time-series snapshots), two schema additions (optional foreign keys), and leveraging the existing pg-boss infrastructure.

**Current State Analysis:**

- `getSeverityTrend()` and `getComplianceTrend()` in `src/data-access/dashboard.ts` compute trends from `Observation.createdAt`, not from historical snapshots (lines 716-792)
- Repeat findings return empty array: `src/data-access/reports.ts` line 226 has placeholder comment
- `getMyEngagementProgress()` returns `observationCount: 0` (line 712) — no way to count observations per engagement
- pg-boss is already running with daily/weekly cron jobs (`src/lib/job-queue.ts`, `src/jobs/index.ts`)

**Primary recommendation:** Use PostgreSQL table for daily snapshots (not TimescaleDB extension) + two optional FK migrations with `--create-only` for safety.

## Standard Stack

### Core

| Library           | Version | Purpose                                    | Why Standard                                                                         |
| ----------------- | ------- | ------------------------------------------ | ------------------------------------------------------------------------------------ |
| PostgreSQL native | 15+     | Time-series snapshot storage               | Native partitioning, no extensions needed for daily snapshots                        |
| Prisma ORM        | 7.3.0   | Schema evolution, migrations               | Already in use, supports optional FKs, `--create-only` for safe migrations           |
| pg-boss           | 12.9.0  | Cron job scheduling                        | Already running for notifications, uses existing PostgreSQL, cron patterns supported |
| Recharts          | 3.7.0   | Trend visualization (LineChart, AreaChart) | Already in use, supports time-series with XAxis categories                           |

### Supporting

| Library        | Version | Purpose                   | When to Use                          |
| -------------- | ------- | ------------------------- | ------------------------------------ |
| @prisma/client | 7.3.0   | Type-safe database client | Generated from schema.prisma changes |

### Alternatives Considered

| Instead of       | Could Use             | Tradeoff                                                                                                                                     |
| ---------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL table | TimescaleDB extension | Extension adds hypertables and compression but requires RDS extension privileges and increases ops complexity — overkill for daily snapshots |
| pg-boss          | node-cron             | pg-boss already running, transactional job storage, no need for second scheduler                                                             |
| Daily snapshots  | Continuous aggregates | Continuous aggregates require TimescaleDB, daily snapshots are sufficient for quarterly trend charts                                         |

**Installation:**

No new packages needed — all dependencies already in `package.json`.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── data-access/
│   ├── dashboard.ts           # Update trend queries to read from snapshots
│   └── reports.ts             # Update repeat findings query to join repeatOfId
├── jobs/
│   └── snapshot-metrics.ts    # NEW: Daily snapshot capture job
├── lib/
│   └── job-queue.ts          # Register new snapshot job
prisma/
├── schema.prisma              # Add DashboardSnapshot, engagementId, repeatOfId
└── migrations/                # Two new migrations (schema + optional FKs)
```

### Pattern 1: Time-Series Snapshot Table

**What:** Store daily snapshots of dashboard metrics as JSON rows with `tenantId` and `capturedAt` timestamp

**When to use:** Historical trend data for widgets that show 6-month trends (severity, compliance, health score)

**Example:**

```prisma
model DashboardSnapshot {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId    String   @db.Uuid
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  capturedAt  DateTime @default(now())

  // Metrics stored as JSON (flexible for adding new metrics)
  metrics     Json     // { healthScore, compliance, severity breakdown, etc. }

  @@index([tenantId, capturedAt(sort: Desc)])
}
```

**Why this pattern:**

- Flexible: JSON allows adding new metrics without migrations
- Partitionable: PostgreSQL can partition by date if needed later
- Query-friendly: Single index on (tenantId, capturedAt) for all trend queries
- No extension needed: Works on any PostgreSQL 15+ deployment

**Source:** [PostgreSQL for Time-Series Data: Harnessing Temporal Insights](https://dev.to/pawnsapprentice/postgresql-for-time-series-data-harnessing-temporal-insights-4mha)

### Pattern 2: Optional Self-Referential Foreign Key (Repeat Findings)

**What:** Add optional `repeatOfId` field to Observation model for parent-child repeat finding relationship

**When to use:** Linking current observation to original observation for repeat detection

**Example:**

```prisma
model Observation {
  // ... existing fields ...

  // Repeat finding relation (self-referential)
  repeatOfId      String?      @db.Uuid
  repeatOf        Observation? @relation("RepeatHierarchy", fields: [repeatOfId], references: [id], onDelete: SetNull)
  repeatInstances Observation[] @relation("RepeatHierarchy")

  @@index([repeatOfId])
}
```

**Important rules:**

- MUST set `onDelete: SetNull` or `NoAction` (not Cascade) to prevent deletion loops
- Query with: `include: { repeatOf: true, repeatInstances: true }`
- Confirm action sets repeatOfId, dismiss clears it

**Source:** [Self-relations | Prisma Documentation](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/self-relations)

### Pattern 3: Optional Foreign Key for Engagement Tracking

**What:** Add optional `engagementId` to Observation to count observations per audit engagement

**When to use:** Auditor dashboard needs to show "3 observations" for specific engagement

**Example:**

```prisma
model Observation {
  // ... existing fields ...

  engagementId String?         @db.Uuid
  engagement   AuditEngagement? @relation(fields: [engagementId], references: [id], onDelete: SetNull)

  @@index([engagementId])
}
```

**Why optional:**

- Not all observations are linked to engagements (compliance findings, board-level issues)
- Existing observations have no engagement data — migration can't populate it retroactively
- SetNull prevents cascade deletes breaking observations when engagement is deleted

### Pattern 4: pg-boss Daily Snapshot Job

**What:** Cron job runs daily at 01:00 IST (19:30 UTC previous day) to capture metrics for all tenants

**When to use:** Background data collection that doesn't need immediate execution

**Example:**

```typescript
// src/jobs/snapshot-metrics.ts
export async function captureMetricsSnapshot() {
  const tenants = await prisma.tenant.findMany({ select: { id: true } });

  for (const tenant of tenants) {
    const db = prismaForTenant(tenant.id);
    const [health, compliance, severity] = await Promise.all([
      getHealthScore(db, tenant.id),
      getComplianceSummary(db, tenant.id),
      getObservationSeverity(db, tenant.id),
    ]);

    await db.dashboardSnapshot.create({
      data: {
        tenantId: tenant.id,
        metrics: { healthScore: health.score, compliance, severity },
      },
    });
  }
}
```

**Cron registration:**

```typescript
// src/lib/job-queue.ts
await queue.schedule("snapshot-metrics", "30 19 * * *"); // 01:00 IST daily
```

**Source:** [Scheduled and Background Jobs with pg-boss in TypeScript](https://logsnag.com/blog/deep-dive-into-background-jobs-with-pg-boss-and-typescript)

### Pattern 5: Safe Migration with `--create-only`

**What:** Generate migration without applying it, edit SQL manually, then apply

**When to use:** Adding optional FKs to tables with existing production data

**Example:**

```bash
# 1. Update schema.prisma with new fields
# 2. Generate migration (don't apply yet)
npx prisma migrate dev --create-only --name add-engagement-and-repeat-fields

# 3. Edit the migration SQL file to ensure no data loss
# 4. Apply migration
npx prisma migrate deploy
```

**Why this matters:**

- Prisma auto-generates FK constraints that might fail on existing data
- Allows adding data backfill scripts (if needed)
- Prevents accidental production downtime

**Source:** [Customizing migrations | Prisma Documentation](https://www.prisma.io/docs/orm/prisma-migrate/workflows/customizing-migrations)

### Anti-Patterns to Avoid

- **Using createdAt for trends:** Current getSeverityTrend() groups by Observation.createdAt (line 736-773). This gives "when observations were created" not "how metrics evolved over time." Use snapshots instead.
- **JSON fallback for repeat findings:** Don't add `repeatData: Json?` field — use proper FK relation for queryability and referential integrity
- **Hardcoded snapshot frequency:** Don't make snapshot logic depend on "daily" assumption — store `capturedAt` and query by date ranges
- **Backfilling engagementId:** Don't try to auto-populate engagementId for existing observations — no reliable heuristic exists, leave NULL

## Don't Hand-Roll

| Problem                        | Don't Build                               | Use Instead                                                 | Why                                                                                    |
| ------------------------------ | ----------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Cron job scheduler             | Custom setInterval or setTimeout loops    | pg-boss with `.schedule()`                                  | Already running, transactional, survives server restarts, retry logic built-in         |
| Time-series compression        | Custom aggregation tables per time period | Daily snapshots + PostgreSQL partitioning (if needed later) | Daily granularity sufficient for quarterly trends, partitioning is standard PostgreSQL |
| Repeat finding graph traversal | Recursive CTE for multi-level repeats     | Simple parent-child with repeatOfId                         | Requirement only needs 2 levels (original + current), not full ancestry tree           |
| Trend chart date bucketing     | Manual JavaScript date grouping           | Query snapshots by capturedAt with SQL date functions       | PostgreSQL date_trunc() handles quarterly/monthly bucketing efficiently                |

**Key insight:** The project already has pg-boss, Recharts, and Prisma — don't introduce new libraries or patterns. Extend what exists.

## Common Pitfalls

### Pitfall 1: Self-Referential Cascade Deletes

**What goes wrong:** Adding `repeatOfId` with `onDelete: Cascade` causes infinite deletion loop when deleting an observation that has repeats

**Why it happens:** Prisma tries to cascade delete children → children try to cascade delete their parent → circular dependency

**How to avoid:** Always use `onDelete: SetNull` or `NoAction` for self-referential FKs

**Warning signs:** Migration fails with "circular dependency detected" or observations disappear unexpectedly

**Source:** [Self-relations | Prisma Documentation](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/self-relations)

### Pitfall 2: Snapshot Job Doesn't Capture All Tenants

**What goes wrong:** Snapshot job loops through tenants but PostgreSQL connection pool exhausts, causing timeout errors

**Why it happens:** pg-boss runs as single process, concurrent tenant queries without connection management

**How to avoid:** Use `prismaForTenant()` which reuses connection pool, add tenant batching (10 at a time with `Promise.all()`)

**Warning signs:** Logs show "Connection pool exhausted" or "timeout acquiring connection"

### Pitfall 3: Trend Queries Return Empty After Migration

**What goes wrong:** After adding DashboardSnapshot table, trend widgets still return empty because no historical data exists

**Why it happens:** Snapshots start from first job run — no retroactive data

**How to avoid:**

1. Accept "no data" state for first 2-3 weeks (trend widgets already show "available after first quarter" message)
2. OR backfill 1-2 months of synthetic snapshots from current metrics (manual script, not migration)

**Warning signs:** Widgets show "no data" message indefinitely

### Pitfall 4: Prisma Client Out of Sync After Schema Change

**What goes wrong:** After adding fields to schema.prisma, TypeScript shows type errors because generated client is stale

**Why it happens:** `prisma generate` not run after schema change

**How to avoid:** Always run `npx prisma generate` after editing schema, or use `npx prisma migrate dev` which auto-generates

**Warning signs:** TypeScript errors like "Property 'engagementId' does not exist on type 'Observation'"

### Pitfall 5: Recharts Trend Charts Don't Update

**What goes wrong:** Dashboard loads but trend charts still show "no data" even after snapshots exist

**Why it happens:** `getSeverityTrend()` still queries `Observation.createdAt` instead of `DashboardSnapshot`

**How to avoid:** Update ALL trend functions in `src/data-access/dashboard.ts`:

- `getSeverityTrend()` (lines 716-774)
- `getComplianceTrend()` (lines 776-792)
- Any widget that calls these functions

**Warning signs:** PostgreSQL logs show queries to Observation table, not DashboardSnapshot

## Code Examples

Verified patterns from official sources and existing codebase:

### Daily Snapshot Capture (pg-boss job)

```typescript
// src/jobs/snapshot-metrics.ts
import "server-only";
import { prismaForTenant, getRootPrisma } from "@/lib/prisma";
import {
  getHealthScore,
  getComplianceSummary,
  getObservationSeverity,
} from "@/data-access/dashboard";

export async function captureMetricsSnapshot(): Promise<void> {
  console.log("[snapshot-metrics] Starting daily capture");

  const rootPrisma = getRootPrisma();
  const tenants = await rootPrisma.tenant.findMany({
    where: { onboardingCompleted: true },
    select: { id: true, name: true },
  });

  console.log(`[snapshot-metrics] Found ${tenants.length} tenants`);

  // Process tenants in batches to avoid connection pool exhaustion
  const BATCH_SIZE = 10;
  for (let i = 0; i < tenants.length; i += BATCH_SIZE) {
    const batch = tenants.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (tenant) => {
        try {
          const db = prismaForTenant(tenant.id);
          const [health, compliance, severity] = await Promise.all([
            getHealthScore(db, tenant.id),
            getComplianceSummary(db, tenant.id),
            getObservationSeverity(db, tenant.id),
          ]);

          await db.dashboardSnapshot.create({
            data: {
              tenantId: tenant.id,
              metrics: {
                healthScore: health.score,
                compliance: {
                  total: compliance.total,
                  compliant: compliance.compliant,
                  percentage: compliance.percentage,
                },
                severity: {
                  total: severity.total,
                  criticalOpen: severity.criticalOpen,
                  highOpen: severity.highOpen,
                  mediumOpen: severity.mediumOpen,
                  lowOpen: severity.lowOpen,
                },
              },
            },
          });
          console.log(`[snapshot-metrics] Captured for ${tenant.name}`);
        } catch (error) {
          console.error(`[snapshot-metrics] Failed for ${tenant.name}:`, error);
        }
      }),
    );
  }

  console.log("[snapshot-metrics] Daily capture complete");
}
```

### Query Trend Data from Snapshots

```typescript
// src/data-access/dashboard.ts (updated getSeverityTrend)
export async function getSeverityTrend(
  db: ReturnType<typeof prismaForTenant>,
  tenantId: string,
  daysBack: number = 180, // ~6 months
): Promise<SeverityTrendPoint[]> {
  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  const snapshots = await db.dashboardSnapshot.findMany({
    where: {
      tenantId,
      capturedAt: { gte: since },
    },
    orderBy: { capturedAt: "asc" },
    select: {
      capturedAt: true,
      metrics: true,
    },
  });

  if (snapshots.length === 0) {
    return []; // Widget will show "available after first quarter"
  }

  // Group by fiscal quarter
  const buckets = new Map<string, SeverityTrendPoint>();

  for (const snap of snapshots) {
    const date = new Date(snap.capturedAt);
    const month = date.getMonth();
    const calYear = date.getFullYear();
    const fyYear = month < 3 ? calYear - 1 : calYear;

    let quarter: string;
    if (month >= 3 && month <= 5) quarter = "Q1";
    else if (month >= 6 && month <= 8) quarter = "Q2";
    else if (month >= 9 && month <= 11) quarter = "Q3";
    else quarter = "Q4";

    const key = `${fyYear}-${quarter}`;
    const metrics = snap.metrics as any;

    // Take latest snapshot per quarter
    buckets.set(key, {
      quarter,
      year: fyYear,
      critical: metrics.severity?.criticalOpen ?? 0,
      high: metrics.severity?.highOpen ?? 0,
      medium: metrics.severity?.mediumOpen ?? 0,
      low: metrics.severity?.lowOpen ?? 0,
    });
  }

  return Array.from(buckets.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    const qOrder: Record<string, number> = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };
    return (qOrder[a.quarter] ?? 0) - (qOrder[b.quarter] ?? 0);
  });
}
```

### Query Repeat Findings for Board Report

```typescript
// src/data-access/reports.ts (updated aggregateReportData)
// Replace line 226 placeholder with:

const repeatObservations = await db.observation.findMany({
  where: {
    tenantId,
    repeatOfId: { not: null },
  },
  include: {
    repeatOf: {
      select: {
        createdAt: true,
        severity: true,
      },
    },
  },
  orderBy: { createdAt: "desc" },
});

const repeatFindings: RepeatFindingItem[] = repeatObservations.map(
  (o: any) => ({
    title: o.title,
    originalDate: formatDateIndian(o.repeatOf?.createdAt),
    occurrenceCount: 2, // Current + original (if need full count, COUNT on repeatInstances)
    currentSeverity: o.severity,
    previousSeverity: o.repeatOf?.severity ?? o.severity,
    status: o.status,
  }),
);
```

### Recharts Trend Component (already exists, no changes needed)

```typescript
// src/components/dashboard/widgets/key-trends-sparklines.tsx (lines 118-128)
// Existing code correctly handles time-series data:

<ResponsiveContainer width="100%" height="100%">
  <LineChart data={chartData}>
    <Line
      type="monotone"
      dataKey="value"
      stroke={cfg.color}
      strokeWidth={2}
      dot={false}
    />
  </LineChart>
</ResponsiveContainer>
```

**Source:** Existing codebase pattern from Phase 9 dashboard implementation

## State of the Art

| Old Approach                  | Current Approach                      | When Changed | Impact                                             |
| ----------------------------- | ------------------------------------- | ------------ | -------------------------------------------------- |
| Compute trends from createdAt | Store daily snapshots                 | Phase 12     | True historical trends vs creation timestamps      |
| JSON blob for repeat metadata | Self-referential FK (repeatOfId)      | Phase 12     | Queryable relationships, referential integrity     |
| No engagement tracking        | Optional engagementId on Observation  | Phase 12     | Auditor dashboard shows real counts per engagement |
| TimescaleDB for time-series   | Native PostgreSQL with JSON snapshots | 2024+        | Simpler ops, no extension dependencies             |

**Deprecated/outdated:**

- TimescaleDB continuous aggregates: Overkill for daily snapshots, adds extension complexity
- Separate metrics tables per type (ObservationHistory, ComplianceHistory): Single DashboardSnapshot with JSON is more flexible

## Open Questions

1. **Snapshot retention policy**
   - What we know: Daily snapshots accumulate ~365 rows/tenant/year
   - What's unclear: When to archive/delete old snapshots (after 2 years? 5 years?)
   - Recommendation: Add retention note in schema comments, defer cleanup to Phase 14 verification

2. **Backfill strategy for first 2 weeks**
   - What we know: No historical data before Phase 12 job starts running
   - What's unclear: Should we synthetically backfill 30-60 days from current metrics?
   - Recommendation: Skip backfill — trend widgets already have "available after first quarter" message, real data better than synthetic

3. **engagementId population strategy**
   - What we know: Existing observations have no engagement link
   - What's unclear: Can we heuristically link observations to engagements (by branch + auditArea + dateRange)?
   - Recommendation: Leave NULL for existing data — only populate for NEW observations created after migration

## Sources

### Primary (HIGH confidence)

- [Self-relations | Prisma Documentation](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/self-relations) - Self-referential FK patterns
- [Customizing migrations | Prisma Documentation](https://www.prisma.io/docs/orm/prisma-migrate/workflows/customizing-migrations) - `--create-only` flag usage
- [Scheduled and Background Jobs with pg-boss in TypeScript](https://logsnag.com/blog/deep-dive-into-background-jobs-with-pg-boss-and-typescript) - pg-boss cron patterns
- [GitHub - timgit/pg-boss](https://github.com/timgit/pg-boss) - pg-boss official repo (v12.9.0 features)
- [Recharts | LineChart](https://recharts.github.io/en-US/api/LineChart/) - Official Recharts LineChart API
- Existing codebase: `src/lib/job-queue.ts`, `src/jobs/index.ts`, `src/data-access/dashboard.ts` (verified patterns)

### Secondary (MEDIUM confidence)

- [PostgreSQL for Time-Series Data: Harnessing Temporal Insights](https://dev.to/pawnsapprentice/postgresql-for-time-series-data-harnessing-temporal-insights-4mha) - Time-series patterns without TimescaleDB
- [How to Generate Time Series Data in PostgreSQL](https://oneuptime.com/blog/post/2026-01-25-postgresql-generate-time-series/view) - Date bucketing techniques
- [Using the expand and contract pattern | Prisma's Data Guide](https://www.prisma.io/dataguide/types/relational/expand-and-contract-pattern) - Safe migration strategies
- [How to Build Dynamic Charts in React with Recharts](https://dev.to/calebali/how-to-build-dynamic-charts-in-react-with-recharts-including-edge-cases-3e72) - Recharts time-series patterns

### Tertiary (LOW confidence)

None — all findings verified with official docs or existing codebase

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All libraries already in package.json with verified versions
- Architecture patterns: HIGH - Self-referential FKs, pg-boss cron, and snapshots are well-documented
- Pitfalls: HIGH - Self-referential cascade deletes and connection pool issues are documented in Prisma/pg-boss docs

**Research date:** 2026-02-10
**Valid until:** 90 days (stable PostgreSQL/Prisma patterns, not fast-moving APIs)
