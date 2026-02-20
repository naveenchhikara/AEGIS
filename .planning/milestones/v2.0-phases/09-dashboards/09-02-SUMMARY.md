# 09-02 Summary: Dashboard Data Access Layer

## Status: COMPLETE

- **Commit:** `a094917`
- **Files:** 1 created (1,085 lines)
- **TypeScript:** Clean (0 errors in dashboard.ts)
- **Build:** Passes (`pnpm build` — 21 routes)

## Files Created

| File                           | Lines | Purpose                                                       |
| ------------------------------ | ----- | ------------------------------------------------------------- |
| `src/data-access/dashboard.ts` | 1,085 | All dashboard query functions + getDashboardData orchestrator |

## Query Functions (15 total)

### Aggregate Queries (PostgreSQL views with Prisma fallback)

| #   | Function               | View / Source             | Returns                                                                   |
| --- | ---------------------- | ------------------------- | ------------------------------------------------------------------------- |
| 1   | getHealthScore         | fn_dashboard_health_score | Score 0–100 (formula: compliance×0.40 + findingRes×0.35 + auditCov×0.25)  |
| 2   | getComplianceSummary   | v_compliance_summary      | total, compliant, partial, nonCompliant, pending, percentage              |
| 3   | getObservationSeverity | v_observation_severity    | total, totalOpen, criticalOpen, highOpen, mediumOpen, lowOpen, closed     |
| 4   | getObservationAging    | v_observation_aging       | totalOpen + 5 aging buckets (0-30, 31-60, 61-90, 90+, current)            |
| 5   | getAuditCoverage       | v_audit_coverage_branch   | branches array with coverage status, coveredCount, totalCount, percentage |
| 6   | getAuditorWorkload     | v_auditor_workload        | Array of auditor name, assigned, open, highCritical counts                |

### User-Scoped Queries (Prisma ORM)

| #   | Function                  | Purpose                                           |
| --- | ------------------------- | ------------------------------------------------- |
| 7   | getMyAssignedObservations | Open observations assigned to user (limit 10)     |
| 8   | getMyPendingReviews       | SUBMITTED observations awaiting review (limit 10) |
| 9   | getMyEngagementProgress   | User's current FY engagements with status         |

### Trend & Analytics Queries

| #   | Function                | Purpose                                             |
| --- | ----------------------- | --------------------------------------------------- |
| 10  | getSeverityTrend        | Quarterly severity distribution (last N quarters)   |
| 11  | getComplianceTrend      | Current compliance % (no historical snapshots yet)  |
| 12  | getBranchRiskData       | Branches ranked by severity-weighted risk score     |
| 13  | getBoardReportReadiness | 6-item checklist for board report data availability |
| 14  | getRegulatoryCalendar   | Upcoming compliance deadlines (next 30 days)        |
| 15  | getDashboardData        | Orchestrator — widget-based conditional fetching    |

## Must-Have Verification

| Requirement                                              | Status                                                     |
| -------------------------------------------------------- | ---------------------------------------------------------- |
| getDashboardData fetches only data for user's widgets    | Done — Set-based conditional fetching with Promise.all     |
| All queries use prismaForTenant with WHERE tenantId      | Done — 22 usages of prismaForTenant                        |
| Aggregate queries use $queryRaw against PostgreSQL views | Done — 6 raw SQL queries with try/catch fallback to Prisma |
| User-scoped queries filter by userId AND tenantId        | Done — belt-and-suspenders via RLS + explicit WHERE        |
| Trend queries return quarterly data for charts           | Done — getSeverityTrend groups by fiscal quarter           |
| `import "server-only"` at top                            | Done                                                       |

## Architecture Notes

- **Resilient fallback pattern**: Each view-based query wraps raw SQL in try/catch; if view doesn't exist (09-01 migration not run), falls back to equivalent Prisma ORM query
- **Inline fiscal year helper**: `getCurrentFiscalYearRange()` defined locally to avoid import dependency on 09-01's `fiscal-year.ts`
- **bigint handling**: All PostgreSQL COUNT results wrapped with `Number()` for JSON serialization
- **Health score formula**: (Compliance%×0.40) + (FindingResolution%×0.35) + (AuditCoverage%×0.25) - severity penalties (Critical=-15, High=-8, Medium=-3, Low=-1), clamped to 0–100
- **Schema limitations**: Observation model lacks `engagementId` field — getMyEngagementProgress returns `observationCount: 0` with comment
