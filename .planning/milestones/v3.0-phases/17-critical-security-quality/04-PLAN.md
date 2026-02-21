# Plan 04: N+1 Queries and Unbounded Fetches — Analytics & Dashboard Performance

---

wave: 2
depends_on: [01, 03]
files_modified:

- src/data-access/analytics.ts
- src/data-access/dashboard.ts
- src/data-access/qa-assessment.ts
- src/data-access/compliance-items.ts
- src/data-access/reports.ts
- src/data-access/exports.ts
- src/data-access/audit-trail.ts
- src/actions/compliance/run-escalation-job.ts
- src/actions/compliance/create-compliance-items.ts
- src/actions/work-program/generate-program.ts
- src/actions/governance/generate-inspection-pack.ts
- src/app/(dashboard)/calendar/page.tsx
  autonomous: true
  requirements: []

---

## Objective

Fix N+1 query patterns and unbounded data fetches that will degrade as data grows. Focus on the analytics page (loaded every session), dashboard fallbacks, and cron jobs that process all open items.

## Context

Research identified 19 issues: 5 N+1 loops, 12 unbounded findMany calls, 1 serial query chain, and 1 raw SQL without LIMIT. The analytics page alone fires 3 unbounded queries loading ALL observations, compliance items, and SMA/NPA entries into memory for in-JS aggregation. This plan prioritizes by impact: analytics page > dashboard fallbacks > cron jobs > report generation.

## Tasks

### Priority 1: Analytics Page (loaded every session)

<task id="4.1">
**Fix getAuditPlanProgress N+1 in analytics.ts**

In `src/data-access/analytics.ts` (~lines 54-98), replace the N+1 loop with a single query using Prisma `include`:

```typescript
// Before: findMany plans, then loop with findMany engagements per plan
// After:
const plans = await db.auditPlan.findMany({
  where: { tenantId },
  include: {
    engagements: {
      select: { id: true, status: true, branchId: true },
    },
  },
  orderBy: { createdAt: "desc" },
  take: 20, // Reasonable limit — last 5 years of quarterly plans
});
```

Then process `plan.engagements` in-memory instead of querying per plan.
</task>

<task id="4.2">
**Fix getFindingTrends unbounded fetch in analytics.ts**

In `src/data-access/analytics.ts` (~lines 150-187), replace in-memory grouping with Prisma `groupBy`:

```typescript
// Before: findMany ALL observations, group by quarter in JS
// After:
const trends = await db.observation.groupBy({
  by: ["severity"],
  where: {
    tenantId,
    createdAt: { gte: twoYearsAgo }, // Limit to last 2 years
  },
  _count: { id: true },
});
```

If quarterly bucketing is needed, use raw SQL with `date_trunc('quarter', "createdAt")` for efficient server-side grouping.
</task>

<task id="4.3">
**Fix getComplianceAging unbounded fetch in analytics.ts**

In `src/data-access/analytics.ts` (~lines 103-145), replace:

```typescript
// Before: findMany ALL non-closed items, bucket in JS
// After: Use groupBy on escalationLevel + count
const aging = await db.complianceItem.groupBy({
  by: ["escalationLevel"],
  where: { tenantId, status: { notIn: ["CLOSED"] } },
  _count: { id: true },
  _avg: { daysOpen: true },
});
```

For the age buckets (0-30, 31-60, etc.), use raw SQL with CASE WHEN for server-side bucketing.
</task>

<task id="4.4">
**Fix getNpaMovement unbounded fetch in analytics.ts**

In `src/data-access/analytics.ts` (~lines 192-243), use groupBy:

```typescript
const movement = await db.smaNpaEntry.groupBy({
  by: ["category"],
  where: {
    tenantId,
    createdAt: { gte: twoYearsAgo },
  },
  _count: { id: true },
  _sum: { accountCount: true, totalAmount: true },
});
```

</task>

### Priority 2: Dashboard Fallbacks

<task id="4.5">
**Fix computeSeverityFallback unbounded fetch in dashboard.ts**

In `src/data-access/dashboard.ts` (~lines 337-359), replace findMany + in-JS counting:

```typescript
// Before: findMany ALL observations, count in JS
// After:
const severity = await db.observation.groupBy({
  by: ["severity", "status"],
  where: { tenantId },
  _count: { id: true },
});
```

</task>

<task id="4.6">
**Fix computeWorkloadFallback unbounded fetch in dashboard.ts**

In `src/data-access/dashboard.ts` (~lines 562-606), replace with groupBy:

```typescript
const workload = await db.observation.groupBy({
  by: ["assignedToId", "severity", "status"],
  where: { tenantId, assignedToId: { not: null } },
  _count: { id: true },
});
```

Then join with user names via a separate `db.user.findMany({ where: { id: { in: userIds } } })`.
</task>

<task id="4.7">
**Fix getBranchRiskData unbounded fetch in dashboard.ts**

In `src/data-access/dashboard.ts` (~lines 837-882), replace with groupBy:

```typescript
const branchRisk = await db.observation.groupBy({
  by: ["branchId", "severity"],
  where: { tenantId, status: { not: "CLOSED" }, branchId: { not: null } },
  _count: { id: true },
});
```

</task>

### Priority 3: Serial Query Chain

<task id="4.8">
**Fix getAuditEffectivenessKpis serial queries in qa-assessment.ts**

In `src/data-access/qa-assessment.ts` (~lines 188-307), wrap the 13 independent count queries in `Promise.all`:

```typescript
const [
  entityCount,
  plannedCount,
  completedCount,
  totalObs,
  closedObs,
  repeatObs,
  avgDaysToClose,
  highCriticalObs,
  qaAssessments,
  totalCompliance,
  overdueCompliance,
  auditorCount,
  zacReviewed,
] = await Promise.all([
  db.auditUniverseEntity.count({ where: { tenantId } }),
  db.auditEngagement.count({ where: { tenantId, status: "PLANNED" } }),
  // ... etc
]);
```

Replace the unbounded `observation.findMany` for avg days-to-close with a raw SQL `AVG()`:

```sql
SELECT AVG(EXTRACT(EPOCH FROM ("updatedAt" - "createdAt")) / 86400)
FROM "Observation"
WHERE "tenantId" = $1 AND "status" = 'CLOSED'
```

</task>

### Priority 4: Cron Jobs and Background Tasks

<task id="4.9">
**Fix updateDaysOpenForOpenItems N+1 in compliance-items.ts**

In `src/data-access/compliance-items.ts` (~lines 131-172), replace the N+1 update loop with a single raw SQL:

```sql
UPDATE "ComplianceItem"
SET "daysOpen" = EXTRACT(EPOCH FROM (NOW() - "createdAt")) / 86400
WHERE "tenantId" = $1 AND "status" NOT IN ('CLOSED')
```

This eliminates N+1 queries entirely — from 501 queries (for 500 items) down to 1.
</task>

<task id="4.10">
**Fix runEscalationJobInternal N+1 in run-escalation-job.ts**

In `src/actions/compliance/run-escalation-job.ts` (~lines 107-191):

1. Pre-fetch all recipients per escalation level before the loop (at most 4 levels)
2. Replace individual `notificationQueue.create` calls with `createMany`
3. Batch `complianceItem.update` calls using `$transaction` array
   </task>

<task id="4.11">
**Fix createComplianceItems N+1 in create-compliance-items.ts**

In `src/actions/compliance/create-compliance-items.ts` (~lines 73-93):

1. Fetch all existing compliance items for the engagement in one query
2. Build a Set of existing `observationId` values
3. Use `createMany` with `skipDuplicates: true` for new items
   </task>

<task id="4.12">
**Fix generateWorkProgram N+1 in generate-program.ts**

In `src/actions/work-program/generate-program.ts` (~lines 100-131):

1. Fetch all existing `workProgramItem` rows for the engagement in one `findMany`
2. Build a Set of existing `testProcedureId` values
3. Use `createMany` with `skipDuplicates: true`
4. Add `take: 500` guard to the testProcedures query (line 76-92)
   </task>

### Priority 5: Report and Export Guards

<task id="4.13">
**Add safety limits to report/export queries**

In `src/data-access/reports.ts` (~line 60):

- Add `take: 1000` to `observation.findMany` in `aggregateReportData`
- The `topFindings` logic only uses first 15 anyway

In `src/data-access/exports.ts` (~lines 65, 103):

- Add `take: 5000` guards to prevent memory explosion on large tenants

In `src/actions/governance/generate-inspection-pack.ts` (~lines 66-120):

- Add status filters to compliance query (exclude CLOSED)
- Replace the overdue count with `db.complianceItem.count({ where: { dueDate: { lt: new Date() }, ... } })`
  </task>

<task id="4.14">
**Fix calendar page default date range**

In `src/app/(dashboard)/calendar/page.tsx` (~line 17):

- Pass current fiscal year dates to `getAuditCalendarEvents`:

```typescript
const fiscalStart = new Date(currentYear, 3, 1); // April 1
const fiscalEnd = new Date(currentYear + 1, 2, 31); // March 31
const events = await getAuditCalendarEvents(tenantId, fiscalStart, fiscalEnd);
```

</task>

<task id="4.15">
**Fix detectAuditGaps raw SQL — add LIMIT**

In `src/data-access/audit-trail.ts` (~lines 187-202):

- Add `LIMIT 100` to the `generate_series` gap detection query
- Or replace with window function approach for O(n) instead of O(max-min)
  </task>

<task id="4.16">
**Verify: TypeScript compiles, queries return correct data**

1. Run `pnpm tsc --noEmit`
2. Verify analytics page still renders all charts with correct data
3. Verify dashboard shows correct KPIs
4. Run `grep -r "findMany" src/data-access/analytics.ts` — verify all have `take` limits or use `groupBy`
   </task>

## Verification Criteria

- [ ] Zero N+1 patterns in analytics.ts, dashboard.ts, compliance-items.ts
- [ ] All analytics queries use `groupBy` or have `take` limits
- [ ] `Promise.all` wraps independent count queries in qa-assessment.ts
- [ ] Calendar page passes default fiscal year date range
- [ ] `pnpm tsc --noEmit` passes
- [ ] Analytics page renders correctly with groupBy data

## must_haves

- getAuditPlanProgress uses single query with include (not N+1 loop)
- getFindingTrends, getComplianceAging, getNpaMovement use groupBy/limited queries
- Dashboard fallbacks use groupBy instead of full table scans
- updateDaysOpenForOpenItems uses single SQL instead of N+1
- All unbounded findMany in analytics/dashboard have take limits or use aggregation
