# Phase 9: Dashboards

## Overview

**Goal:** Five role-based dashboards aggregate real-time observation data to show audit coverage, compliance posture, and risk indicators.

**Requirements:** DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06

**Dependencies:** Phase 5 (database schema, auth, RBAC), Phase 6 (observation lifecycle), Phase 7 (auditee portal, evidence), Phase 8 (notifications, reports)

---

## Research Findings

### 1. Routing Architecture: Single Adaptive Route

**Decision: Keep single `/dashboard` route with role-based widget composition.**

**Rationale:**

- AEGIS already has a `/dashboard` route — extending it preserves URL simplicity
- Multi-role users (e.g., CAE + CCO) see the **union** of both dashboards' widgets on a single page — no need to navigate between two separate dashboard URLs
- All 5 roles view audit/compliance data at different aggregation levels — same domain, different lenses
- Phase 5 RBAC (05-04-PLAN.md) already defines `dashboard:auditor`, `dashboard:manager`, `dashboard:cae`, `dashboard:cco`, `dashboard:ceo` permissions
- Server component determines which widget set to render based on `session.user.roles`

**Implementation pattern:**

```
/dashboard (single route)
  → Server component reads session.user.roles
  → Calls getDashboardWidgets(roles) → returns ordered widget config
  → Multi-role user (CAE+CCO) sees union of both widget sets, deduplicated
  → Each widget is a server component fetching its own data
```

**Rejected alternative:** Separate routes (`/dashboard/auditor`, `/dashboard/cae`, etc.) — creates confusion for multi-role users who would need to switch between URLs. The sidebar already has a single "Dashboard" link.

### 2. Data Aggregation Strategy: Hybrid (Views + Live Queries)

**Database views (CREATE VIEW, not materialized)** for:

- Compliance health summary (compliant/partial/non-compliant counts)
- Observation severity distribution (open critical/high/medium/low)
- Audit coverage by branch and area
- Finding aging buckets (0-30, 31-60, 61-90, 90+ days overdue)

**Why regular views instead of materialized views:**

- UCB data volumes are small (Tier III/IV banks: <500 observations, <100 compliance items, <50 branches)
- Regular views always return fresh data — no refresh lag
- Materialized views add operational complexity (refresh scheduling, stale data risk)
- PostgreSQL can optimize view queries with proper indexes (already planned in Phase 5)
- If performance becomes an issue with larger banks, upgrade to materialized views later

**Live queries** for:

- User-specific data (my assigned observations, my pending reviews)
- Recent activity feed (last 10 actions)
- Real-time notification counts

**PostgreSQL functions** for complex aggregations:

- `fn_dashboard_health_score(tenant_id)` — weighted health score
- `fn_observation_aging(tenant_id)` — aging bucket distribution
- `fn_audit_coverage(tenant_id, fiscal_year)` — branch + area coverage

### 3. Health Score Formula

**Weighted composite score (0-100):**

```
Health Score = (Compliance Score * 0.40) + (Finding Resolution Score * 0.35) + (Audit Coverage Score * 0.25)
```

**Component calculations:**

| Component                | Formula                                              | Weight |
| ------------------------ | ---------------------------------------------------- | ------ |
| Compliance Score         | (compliant_count / total_requirements) \* 100        | 40%    |
| Finding Resolution Score | 100 - (weighted_open_findings_penalty)               | 35%    |
| Audit Coverage Score     | (completed_engagements / planned_engagements) \* 100 | 25%    |

**Finding Resolution penalty weights:**

- Each open Critical finding: -15 points
- Each open High finding: -8 points
- Each open Medium finding: -3 points
- Each open Low finding: -1 point
- Cap at 0 (score cannot go negative)

**Rationale for weights:**

- Compliance (40%): RBI's primary concern — are regulations being met?
- Finding Resolution (35%): Are identified issues being addressed?
- Audit Coverage (25%): Is the bank being adequately audited?

**Edge cases:**

- 0 compliance requirements → Compliance Score = 0 (not 100) — bank hasn't set up compliance yet
- 0 observations → Finding Resolution Score = 100 — no problems found
- 0 audit plans → Audit Coverage Score = 0 — no auditing happening
- New bank with nothing set up → Score shows 0 with "Complete onboarding to see your health score" message

### 4. Finding Aging Buckets

| Bucket     | Days Overdue       | Color    | Severity   |
| ---------- | ------------------ | -------- | ---------- |
| Current    | Not yet due        | Green    | normal     |
| 0-30 days  | 1-30 days overdue  | Amber    | warning    |
| 31-60 days | 31-60 days overdue | Orange   | danger     |
| 61-90 days | 61-90 days overdue | Red      | critical   |
| 90+ days   | >90 days overdue   | Dark Red | escalation |

**SQL pattern:**

```sql
CREATE VIEW observation_aging AS
SELECT
  tenant_id,
  COUNT(*) FILTER (WHERE status != 'CLOSED' AND due_date >= CURRENT_DATE) AS current_count,
  COUNT(*) FILTER (WHERE status != 'CLOSED' AND CURRENT_DATE - due_date BETWEEN 1 AND 30) AS bucket_0_30,
  COUNT(*) FILTER (WHERE status != 'CLOSED' AND CURRENT_DATE - due_date BETWEEN 31 AND 60) AS bucket_31_60,
  COUNT(*) FILTER (WHERE status != 'CLOSED' AND CURRENT_DATE - due_date BETWEEN 61 AND 90) AS bucket_61_90,
  COUNT(*) FILTER (WHERE status != 'CLOSED' AND CURRENT_DATE - due_date > 90) AS bucket_90_plus
FROM "Observation"
WHERE due_date IS NOT NULL
GROUP BY tenant_id;
```

### 5. Audit Coverage Metrics

**Branch coverage:** Branches with at least one completed engagement in the current fiscal year / Total active branches

**Area coverage:** Audit areas with at least one completed engagement in the current fiscal year / Total audit areas

**RBI requirements for UCBs:**

- 100% branch coverage annually (all branches must be audited at least once per FY)
- All critical risk areas (credit, operations, IT, compliance) must be covered
- Concurrent audit for branches with advances >Rs 10 Crore

**Coverage view:**

```sql
CREATE VIEW audit_coverage_by_branch AS
SELECT
  b.tenant_id,
  b.id AS branch_id,
  b.name AS branch_name,
  COUNT(DISTINCT ae.id) FILTER (WHERE ae.status = 'COMPLETED') AS completed_engagements,
  BOOL_OR(ae.status = 'COMPLETED') AS is_covered
FROM "Branch" b
LEFT JOIN "AuditEngagement" ae ON ae.branch_id = b.id
  AND ae.audit_plan_id IN (
    SELECT id FROM "AuditPlan" WHERE year = extract_fiscal_year(CURRENT_DATE)
  )
GROUP BY b.tenant_id, b.id, b.name;
```

### 6. Performance Strategy

**Server Components + React Query polling:**

- Initial dashboard load: Next.js server component (SSR) — fast first paint
- Subsequent updates: React Query with 60-second polling interval
- Loading states: Skeleton cards matching widget dimensions
- Stale-while-revalidate: Show cached data while fetching fresh data

**Polling intervals by data type:**
| Data Type | Interval | Rationale |
|-----------|----------|-----------|
| Health score | 5 minutes | Changes infrequently |
| Observation counts | 60 seconds | May change during active audit |
| Finding aging | 5 minutes | Changes daily |
| Audit coverage | 5 minutes | Changes when engagements complete |
| My assigned items | 30 seconds | User needs to see new assignments quickly |
| Recent activity | 30 seconds | User expects near-real-time feed |

**Caching layers:**

1. PostgreSQL view caching (query planner optimizes repeated view queries)
2. Next.js `unstable_cache` or `fetch` cache for server components (30-second revalidation)
3. React Query client-side cache (staleTime: 30s, cacheTime: 5min)

### 7. Indian Fiscal Year Handling

**All dashboard period filters and calculations use Indian FY (April-March):**

- Current date: Feb 9, 2026 → FY 2025-26, Q4 (Jan-Mar)
- Quarter labels: Q1 (Apr-Jun), Q2 (Jul-Sep), Q3 (Oct-Dec), Q4 (Jan-Mar)
- Matches Prisma `Quarter` enum: `Q1_APR_JUN`, `Q2_JUL_SEP`, `Q3_OCT_DEC`, `Q4_JAN_MAR`

**Utility functions needed:**

```typescript
function getCurrentFiscalYear(): { year: number; label: string };
// Feb 2026 → { year: 2025, label: "2025-26" }
// May 2026 → { year: 2026, label: "2026-27" }

function getCurrentQuarter(): Quarter;
// Feb 2026 → Q4_JAN_MAR

function getFiscalYearDateRange(startYear: number): { start: Date; end: Date };
// 2025 → { start: 2025-04-01, end: 2026-03-31 }
```

---

## Dashboard Architecture

### Widget Inventory Per Role

#### 1. Auditor Dashboard (DASH-01)

| Widget                             | Type           | Data Source                                                       | Size       |
| ---------------------------------- | -------------- | ----------------------------------------------------------------- | ---------- |
| My Assigned Observations           | Table (top 10) | Observation WHERE assignedToId = currentUser AND status != CLOSED | Full width |
| Current Engagement Progress        | Progress bars  | AuditEngagement WHERE assignedToId = currentUser                  | Half width |
| Pending Auditee Responses          | Count + list   | Observation WHERE status = ISSUED AND assignedToId = currentUser  | Half width |
| My Observation Status Distribution | Donut chart    | Observation grouped by status WHERE createdById = currentUser     | Half width |
| Quick Actions                      | Button group   | Links to: New Observation, View Assigned, View Engagements        | Full width |

**Key insight:** Auditor dashboard is personal — all widgets scoped to the logged-in user's data.

#### 2. Audit Manager Dashboard (DASH-02)

| Widget                     | Type                  | Data Source                                                    | Size       |
| -------------------------- | --------------------- | -------------------------------------------------------------- | ---------- |
| Team Workload              | Bar chart             | Observation COUNT grouped by assignedToId WHERE role=AUDITOR   | Half width |
| Finding Aging              | Stacked bar           | observation_aging view grouped by aging bucket                 | Half width |
| Audit Plan Progress        | Progress bar per plan | AuditPlan with engagement completion %                         | Full width |
| Pending Reviews            | Table (top 10)        | Observation WHERE status = SUBMITTED (awaiting manager review) | Full width |
| Observation Severity Trend | Line chart            | Observation COUNT by severity over last 4 quarters             | Half width |
| Overdue Items              | Count card            | Observation WHERE dueDate < today AND status != CLOSED         | Half width |

**Key insight:** Manager sees team-level data — workload distribution, review queue, aging trends.

#### 3. CAE Dashboard (DASH-03)

| Widget                 | Type                 | Data Source                                                          | Size            |
| ---------------------- | -------------------- | -------------------------------------------------------------------- | --------------- |
| Health Score           | Radial gauge         | fn_dashboard_health_score()                                          | One-third width |
| Audit Coverage         | Donut chart          | audit_coverage view (covered/uncovered branches)                     | One-third width |
| Compliance Posture     | Stacked bar          | ComplianceRequirement by status                                      | One-third width |
| High/Critical Trend    | Area chart           | Observation WHERE severity IN (HIGH, CRITICAL) over 6 months         | Half width      |
| Board Report Readiness | Checklist            | Required sections status (data availability check)                   | Half width      |
| Branch Risk Heatmap    | Table with color     | Branches ranked by open observation count + severity                 | Full width      |
| DAKSH Score            | Gauge (if available) | Tenant.dakshScore                                                    | One-third width |
| Key Metrics Row        | KPI cards            | Total observations, closure rate, avg resolution days, overdue count | Full width      |

**Key insight:** CAE sees the macro picture — overall health, coverage gaps, trends, and board report readiness.

#### 4. CCO Dashboard (DASH-04)

| Widget                     | Type          | Data Source                                         | Size       |
| -------------------------- | ------------- | --------------------------------------------------- | ---------- |
| Compliance Registry Status | Donut chart   | ComplianceRequirement by status                     | Half width |
| Regulatory Calendar        | Timeline/list | ComplianceRequirement sorted by nextReviewDate      | Half width |
| Compliance Task Progress   | Progress bars | ComplianceRequirement by category with completion % | Full width |
| Non-Compliant Items        | Table         | ComplianceRequirement WHERE status = NON_COMPLIANT  | Full width |
| Compliance Trend           | Line chart    | Compliance status changes over last 4 quarters      | Half width |
| RBI Circular Impact        | Table         | Recent RbiCirculars with linked requirement counts  | Half width |

**Key insight:** CCO focuses on compliance status, upcoming deadlines, and regulatory tracking.

#### 5. CEO Dashboard (DASH-05)

| Widget                     | Type                   | Data Source                                                      | Size            |
| -------------------------- | ---------------------- | ---------------------------------------------------------------- | --------------- |
| Health Score               | Radial gauge (large)   | fn_dashboard_health_score()                                      | One-third width |
| Risk Indicators            | Card with status       | Critical findings count, overdue count, non-compliant count      | One-third width |
| DAKSH Score                | Gauge (if available)   | Tenant.dakshScore with "Not yet assessed" fallback               | One-third width |
| Executive KPIs             | KPI cards row          | Total observations, closure rate, compliance %, audit coverage % | Full width      |
| Severity Distribution      | Pie chart              | Open observations by severity                                    | Half width      |
| Audit Coverage             | Donut chart            | Branch coverage % for current FY                                 | Half width      |
| Compliance Posture Summary | Stacked horizontal bar | Compliant/Partial/Non-compliant/Pending                          | Full width      |
| PCA Status                 | Status badge           | Tenant.pcaStatus with explanatory text                           | Half width      |
| Key Trends                 | Sparklines             | Health score, compliance %, finding count — 6-month trend        | Half width      |

**Key insight:** CEO sees read-only executive summary — no drill-down into individual observations. Focus on KPIs, health, and risk indicators.

### Shared Widgets

These widgets appear across multiple dashboards (DRY implementation):

| Widget                    | Used By           | Notes                                |
| ------------------------- | ----------------- | ------------------------------------ |
| HealthScoreGauge          | CAE, CEO          | Same component, different sizes      |
| ComplianceStatusChart     | CAE, CCO, CEO     | Donut chart of compliance statuses   |
| AuditCoverageChart        | CAE, CEO, Manager | Branch/area coverage donut           |
| ObservationSeverityCards  | Manager, CAE, CEO | Critical/High/Medium/Low count cards |
| FiscalYearQuarterSelector | All               | Period filter for date-based widgets |
| DashboardSkeleton         | All               | Loading state for each widget type   |
| EmptyStateCard            | All               | "No data yet" with helpful guidance  |

---

## Component Design

### File Structure

```
src/
├── app/(dashboard)/dashboard/
│   └── page.tsx                         # Server component: role detection + widget composition
├── components/dashboard/
│   ├── widgets/                          # Individual widget components
│   │   ├── health-score-gauge.tsx        # Shared: radial gauge for health score
│   │   ├── compliance-status-chart.tsx   # Shared: compliance donut chart
│   │   ├── audit-coverage-chart.tsx      # Shared: branch/area coverage
│   │   ├── observation-severity-cards.tsx # Shared: severity count cards
│   │   ├── finding-aging-chart.tsx       # Manager, CAE: aging bucket bars
│   │   ├── team-workload-chart.tsx       # Manager: per-auditor workload
│   │   ├── pending-reviews-table.tsx     # Manager: observations awaiting review
│   │   ├── my-observations-table.tsx     # Auditor: assigned observations list
│   │   ├── engagement-progress.tsx       # Auditor: current engagement status
│   │   ├── pending-responses.tsx         # Auditor: awaiting auditee response
│   │   ├── branch-risk-heatmap.tsx       # CAE: branches ranked by risk
│   │   ├── board-report-readiness.tsx    # CAE: report section checklist
│   │   ├── regulatory-calendar.tsx       # CCO: upcoming compliance deadlines
│   │   ├── compliance-tasks.tsx          # CCO: progress by category
│   │   ├── rbi-circular-impact.tsx       # CCO: recent circulars impact
│   │   ├── executive-kpis.tsx            # CEO: KPI cards row
│   │   ├── risk-indicators.tsx           # CEO: risk status card
│   │   ├── pca-status-badge.tsx          # CEO: PCA status display
│   │   ├── daksh-score-gauge.tsx         # CAE, CEO: DAKSH score display
│   │   └── key-trends-sparklines.tsx     # CEO: mini trend charts
│   ├── dashboard-composer.tsx            # Client: renders widget grid based on config
│   ├── fiscal-year-selector.tsx          # Client: FY quarter filter
│   ├── dashboard-skeleton.tsx            # Loading state skeleton
│   └── empty-state-card.tsx              # No-data state with guidance
├── data-access/
│   └── dashboard.ts                      # Server-only: all dashboard data queries
├── lib/
│   └── fiscal-year.ts                    # Indian fiscal year utility functions
```

### Dashboard Page (Server Component)

```typescript
// src/app/(dashboard)/dashboard/page.tsx
import { requireAnyPermission } from '@/lib/guards';
import { getDashboardConfig } from '@/lib/dashboard-config';
import { getDashboardData } from '@/data-access/dashboard';
import { DashboardComposer } from '@/components/dashboard/dashboard-composer';

export default async function DashboardPage() {
  const session = await requireAnyPermission([
    'dashboard:auditor', 'dashboard:manager', 'dashboard:cae',
    'dashboard:cco', 'dashboard:ceo'
  ]);

  const roles = session.user.roles;
  const widgetConfig = getDashboardConfig(roles); // Determines which widgets to show
  const initialData = await getDashboardData(session, widgetConfig); // Pre-fetch for SSR

  return (
    <DashboardComposer
      widgetConfig={widgetConfig}
      initialData={initialData}
      roles={roles}
    />
  );
}
```

### Dashboard Configuration

```typescript
// Widget configuration per role (union for multi-role users)
// Multi-role deduplication: merge all role widget arrays, deduplicate by widget ID,
// then sort by WIDGET_PRIORITY order. Priority ensures consistent layout:
//   1. Health Score  2. Compliance charts  3. Audit Coverage  4. Risk/Severity
//   5. Role-specific operational widgets  6. Quick actions
// Example: CAE+CCO user sees Health Score first, then compliance widgets from both
// roles merged, then CAE-specific items, then CCO-specific items.
const ROLE_WIDGETS = {
  AUDITOR: [
    "my-observations",
    "engagement-progress",
    "pending-responses",
    "my-status-distribution",
    "quick-actions",
  ],
  AUDIT_MANAGER: [
    "team-workload",
    "finding-aging",
    "audit-plan-progress",
    "pending-reviews",
    "severity-trend",
    "overdue-count",
  ],
  CAE: [
    "health-score",
    "audit-coverage",
    "compliance-posture",
    "high-critical-trend",
    "board-readiness",
    "branch-heatmap",
    "daksh-score",
    "key-metrics",
  ],
  CCO: [
    "compliance-registry-status",
    "regulatory-calendar",
    "compliance-tasks",
    "non-compliant-items",
    "compliance-trend",
    "rbi-circular-impact",
  ],
  CEO: [
    "health-score",
    "risk-indicators",
    "daksh-score",
    "executive-kpis",
    "severity-distribution",
    "audit-coverage",
    "compliance-summary",
    "pca-status",
    "key-trends",
  ],
};
```

### Data Access Layer

```typescript
// src/data-access/dashboard.ts
import "server-only";
import { prismaForTenant } from "@/lib/prisma";

export async function getDashboardData(session, widgetConfig) {
  const db = prismaForTenant(session.user.tenantId);
  const data = {};

  // Only fetch data for widgets the user will see
  if (widgetConfig.includes("health-score")) {
    data.healthScore = await getHealthScore(db);
  }
  if (
    widgetConfig.includes("compliance-posture") ||
    widgetConfig.includes("compliance-registry-status")
  ) {
    data.complianceSummary = await getComplianceSummary(db);
  }
  // ... fetch only what's needed

  return data;
}

// Each query function is small and focused
async function getHealthScore(db) {
  const [compliance, findings, coverage] = await Promise.all([
    getComplianceScore(db),
    getFindingResolutionScore(db),
    getAuditCoverageScore(db),
  ]);

  return Math.round(compliance * 0.4 + findings * 0.35 + coverage * 0.25);
}
```

---

## Database Views and Functions

### Views (created via Prisma migration)

```sql
-- 1. Compliance summary per tenant
CREATE OR REPLACE VIEW v_compliance_summary AS
SELECT
  tenant_id,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'COMPLIANT') AS compliant,
  COUNT(*) FILTER (WHERE status = 'PARTIAL') AS partial,
  COUNT(*) FILTER (WHERE status = 'NON_COMPLIANT') AS non_compliant,
  COUNT(*) FILTER (WHERE status = 'PENDING') AS pending,
  CASE WHEN COUNT(*) > 0
    THEN ROUND((COUNT(*) FILTER (WHERE status = 'COMPLIANT'))::numeric / COUNT(*) * 100, 1)
    ELSE 0
  END AS compliance_percentage
FROM "ComplianceRequirement"
GROUP BY tenant_id;

-- 2. Observation aging buckets per tenant
CREATE OR REPLACE VIEW v_observation_aging AS
SELECT
  tenant_id,
  COUNT(*) FILTER (WHERE status != 'CLOSED') AS total_open,
  COUNT(*) FILTER (WHERE status != 'CLOSED' AND (due_date IS NULL OR due_date >= CURRENT_DATE)) AS current_count,
  COUNT(*) FILTER (WHERE status != 'CLOSED' AND due_date IS NOT NULL AND CURRENT_DATE - due_date BETWEEN 1 AND 30) AS bucket_0_30,
  COUNT(*) FILTER (WHERE status != 'CLOSED' AND due_date IS NOT NULL AND CURRENT_DATE - due_date BETWEEN 31 AND 60) AS bucket_31_60,
  COUNT(*) FILTER (WHERE status != 'CLOSED' AND due_date IS NOT NULL AND CURRENT_DATE - due_date BETWEEN 61 AND 90) AS bucket_61_90,
  COUNT(*) FILTER (WHERE status != 'CLOSED' AND due_date IS NOT NULL AND CURRENT_DATE - due_date > 90) AS bucket_90_plus
FROM "Observation"
WHERE due_date IS NOT NULL OR status != 'CLOSED'
GROUP BY tenant_id;

-- 3. Observation severity summary per tenant
CREATE OR REPLACE VIEW v_observation_severity AS
SELECT
  tenant_id,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status != 'CLOSED') AS total_open,
  COUNT(*) FILTER (WHERE severity = 'CRITICAL' AND status != 'CLOSED') AS critical_open,
  COUNT(*) FILTER (WHERE severity = 'HIGH' AND status != 'CLOSED') AS high_open,
  COUNT(*) FILTER (WHERE severity = 'MEDIUM' AND status != 'CLOSED') AS medium_open,
  COUNT(*) FILTER (WHERE severity = 'LOW' AND status != 'CLOSED') AS low_open,
  COUNT(*) FILTER (WHERE status = 'CLOSED') AS closed
FROM "Observation"
GROUP BY tenant_id;

-- 4. Fiscal year extraction helper function
-- Indian FY: Apr 2025 - Mar 2026 = FY 2025
-- Jan-Mar belongs to previous calendar year's FY
CREATE OR REPLACE FUNCTION fn_extract_fiscal_year(d DATE)
RETURNS INT AS $$
BEGIN
  IF EXTRACT(MONTH FROM d) >= 4 THEN
    RETURN EXTRACT(YEAR FROM d)::INT;
  ELSE
    RETURN (EXTRACT(YEAR FROM d) - 1)::INT;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 5. Audit coverage by branch for current fiscal year
-- NOTE: Filters engagements to current FY only (not cumulative all-time)
-- RBI requires 100% branch coverage per fiscal year
CREATE OR REPLACE VIEW v_audit_coverage_branch AS
SELECT
  b.tenant_id,
  b.id AS branch_id,
  b.name AS branch_name,
  COUNT(DISTINCT ae.id) FILTER (WHERE ae.status = 'COMPLETED') AS completed_engagements,
  COUNT(DISTINCT ae.id) AS total_engagements,
  BOOL_OR(ae.status = 'COMPLETED') AS is_covered
FROM "Branch" b
LEFT JOIN "AuditEngagement" ae ON ae.branch_id = b.id
  AND ae.audit_plan_id IN (
    SELECT id FROM "AuditPlan" WHERE year = fn_extract_fiscal_year(CURRENT_DATE)
  )
GROUP BY b.tenant_id, b.id, b.name;

-- 6. Auditor workload distribution
CREATE OR REPLACE VIEW v_auditor_workload AS
SELECT
  o.tenant_id,
  o.assigned_to_id,
  u.name AS auditor_name,
  COUNT(*) AS total_assigned,
  COUNT(*) FILTER (WHERE o.status != 'CLOSED') AS open_count,
  COUNT(*) FILTER (WHERE o.severity IN ('HIGH', 'CRITICAL') AND o.status != 'CLOSED') AS high_critical_open
FROM "Observation" o
JOIN "User" u ON u.id = o.assigned_to_id
WHERE o.assigned_to_id IS NOT NULL
GROUP BY o.tenant_id, o.assigned_to_id, u.name;
```

### Health Score Function

```sql
CREATE OR REPLACE FUNCTION fn_dashboard_health_score(p_tenant_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_compliance_score NUMERIC;
  v_finding_score NUMERIC;
  v_coverage_score NUMERIC;
  v_penalty NUMERIC;
BEGIN
  -- Compliance Score (40% weight)
  SELECT COALESCE(compliance_percentage, 0) INTO v_compliance_score
  FROM v_compliance_summary WHERE tenant_id = p_tenant_id;

  IF v_compliance_score IS NULL THEN v_compliance_score := 0; END IF;

  -- Finding Resolution Score (35% weight)
  -- Start at 100, subtract penalties for open findings
  SELECT COALESCE(
    100 - LEAST(100, (critical_open * 15) + (high_open * 8) + (medium_open * 3) + (low_open * 1)),
    100  -- No observations = perfect score
  ) INTO v_finding_score
  FROM v_observation_severity WHERE tenant_id = p_tenant_id;

  IF v_finding_score IS NULL THEN v_finding_score := 100; END IF;

  -- Audit Coverage Score (25% weight)
  SELECT COALESCE(
    ROUND(
      (COUNT(*) FILTER (WHERE is_covered))::numeric / NULLIF(COUNT(*), 0) * 100,
      1
    ),
    0
  ) INTO v_coverage_score
  FROM v_audit_coverage_branch WHERE tenant_id = p_tenant_id;

  RETURN ROUND(
    (v_compliance_score * 0.40) +
    (v_finding_score * 0.35) +
    (v_coverage_score * 0.25),
    0
  );
END;
$$ LANGUAGE plpgsql STABLE;
```

---

## Empty/Zero State Design

Dashboards must be useful even when there's no data yet. Each widget handles empty state gracefully:

| Widget                        | Zero State Display                                                        |
| ----------------------------- | ------------------------------------------------------------------------- |
| Health Score (0 data)         | Score shows 0 with message: "Complete onboarding to start tracking"       |
| Compliance (0 requirements)   | Empty donut + "Set up compliance registry to begin" + link to /compliance |
| Observations (0 observations) | "No observations recorded yet" + "Create your first observation" button   |
| Audit Coverage (0 plans)      | "No audit plans created" + "Create audit plan" link                       |
| Finding Aging (0 overdue)     | Green checkmark + "All findings on track"                                 |
| Team Workload (0 auditors)    | "No auditors assigned" + link to admin/users                              |
| DAKSH Score (null)            | "Not yet assessed" badge (light gray)                                     |
| PCA Status (NONE)             | Green "No PCA" badge                                                      |
| Regulatory Calendar (0 items) | "No upcoming deadlines"                                                   |

---

## Real-Time vs Polling Strategy

### Data Freshness Requirements

| Data               | Freshness        | Strategy                                    |
| ------------------ | ---------------- | ------------------------------------------- |
| Health score       | 5 min acceptable | Server component with ISR (revalidate: 300) |
| Observation counts | 1 min acceptable | React Query polling (60s)                   |
| My assigned items  | 30s acceptable   | React Query polling (30s)                   |
| Audit coverage     | 5 min acceptable | Server component with ISR (revalidate: 300) |
| Finding aging      | 5 min acceptable | Server component with ISR (revalidate: 300) |
| Recent activity    | 30s acceptable   | React Query polling (30s)                   |

### Implementation

```typescript
// Dashboard composer hydrates server-rendered data, then polls for updates
function DashboardComposer({ widgetConfig, initialData, roles }) {
  // Server-rendered initial data (fast first paint)
  // Client-side React Query polls for updates after hydration

  return (
    <DashboardGrid>
      {widgetConfig.map(widget => (
        <DashboardWidget
          key={widget.id}
          widget={widget}
          initialData={initialData[widget.dataKey]}
          pollingInterval={widget.pollingInterval}
        />
      ))}
    </DashboardGrid>
  );
}
```

---

## Task Breakdown

### Plan 09-01: Dashboard Infrastructure & Shared Components

**Wave 1** (no dependencies within phase)

**Files:**

- `src/lib/fiscal-year.ts` — Indian FY utility functions
- `src/lib/dashboard-config.ts` — Role-to-widget mapping configuration (includes multi-role dedup priority order)
- `src/components/dashboard/dashboard-skeleton.tsx` — Loading state skeleton components
- `src/components/dashboard/empty-state-card.tsx` — Empty/zero state card component
- `src/components/dashboard/fiscal-year-selector.tsx` — FY quarter picker
- `src/providers/query-provider.tsx` — React Query QueryClientProvider wrapper
- `prisma/migrations/YYYYMMDD_dashboard_views.sql` — PostgreSQL views + functions for aggregation
- `package.json` — Add `@tanstack/react-query` dependency

**Tasks:**

1. Install `@tanstack/react-query` and create `QueryClientProvider` wrapper component in `src/providers/query-provider.tsx`. Add provider to `src/app/(dashboard)/layout.tsx` (wraps dashboard pages only, not auth pages)
2. Create `fiscal-year.ts` with `getCurrentFiscalYear()`, `getCurrentQuarter()`, `getFiscalYearDateRange()`, `getQuarterLabel()`
3. Create `dashboard-config.ts` with role-to-widget mapping, widget metadata (size, polling interval, data key), and `WIDGET_PRIORITY` array for multi-role deduplication ordering
4. Create dashboard skeleton components (card skeleton, chart skeleton, table skeleton)
5. Create empty state card with configurable message + action link
6. Create FY quarter selector component
7. Create PostgreSQL functions: `fn_extract_fiscal_year(DATE)` helper for Indian FY extraction
8. Create PostgreSQL views: `v_compliance_summary`, `v_observation_aging`, `v_observation_severity`, `v_audit_coverage_branch` (with FY filter), `v_auditor_workload`
9. Create `fn_dashboard_health_score()` PostgreSQL function (uses views + fn_extract_fiscal_year)

### Plan 09-02: Dashboard Data Access Layer

**Wave 1** (parallel with 09-01)

**Files:**

- `src/data-access/dashboard.ts` — All dashboard query functions

**Tasks:**

1. Create `getDashboardData(session, widgetConfig)` — orchestrator that fetches only needed data
2. Create individual query functions: `getHealthScore()`, `getComplianceSummary()`, `getObservationSeverity()`, `getAuditCoverage()`, `getObservationAging()`, `getAuditorWorkload()`
3. Create user-scoped queries: `getMyAssignedObservations(userId)`, `getMyPendingReviews(userId)`, `getMyEngagementProgress(userId)`
4. Create trend queries: `getSeverityTrend(tenantId, quarters)`, `getComplianceTrend(tenantId, quarters)`
5. All functions use `prismaForTenant(session.user.tenantId)` with explicit WHERE clauses

### Plan 09-03: Shared Dashboard Widgets

**Wave 2** (depends on 09-01, 09-02)

**Files:**

- `src/components/dashboard/widgets/health-score-gauge.tsx`
- `src/components/dashboard/widgets/compliance-status-chart.tsx`
- `src/components/dashboard/widgets/audit-coverage-chart.tsx`
- `src/components/dashboard/widgets/observation-severity-cards.tsx`
- `src/components/dashboard/widgets/finding-aging-chart.tsx`
- `src/components/dashboard/widgets/daksh-score-gauge.tsx`
- `src/components/dashboard/widgets/executive-kpis.tsx`

**Tasks:**

1. Refactor existing `health-score-card.tsx` → `health-score-gauge.tsx` (data from props, not JSON import)
2. Refactor existing `audit-coverage-chart.tsx` → new version (data from props)
3. Refactor existing `findings-count-cards.tsx` → `observation-severity-cards.tsx`
4. Create `compliance-status-chart.tsx` (donut chart with Compliant/Partial/Non-Compliant/Pending)
5. Create `finding-aging-chart.tsx` (stacked bar with 5 aging buckets)
6. Create `daksh-score-gauge.tsx` (radial gauge, handles null with "Not assessed" state)
7. Create `executive-kpis.tsx` (4 KPI cards: total observations, closure rate, compliance %, coverage %)

### Plan 09-04: Role-Specific Dashboard Widgets

**Wave 2** (parallel with 09-03)

**Files:**

- `src/components/dashboard/widgets/my-observations-table.tsx`
- `src/components/dashboard/widgets/engagement-progress.tsx`
- `src/components/dashboard/widgets/pending-responses.tsx`
- `src/components/dashboard/widgets/team-workload-chart.tsx`
- `src/components/dashboard/widgets/pending-reviews-table.tsx`
- `src/components/dashboard/widgets/branch-risk-heatmap.tsx`
- `src/components/dashboard/widgets/board-report-readiness.tsx`
- `src/components/dashboard/widgets/regulatory-calendar.tsx` (refactored from existing)
- `src/components/dashboard/widgets/compliance-tasks.tsx`
- `src/components/dashboard/widgets/rbi-circular-impact.tsx`
- `src/components/dashboard/widgets/risk-indicators.tsx`
- `src/components/dashboard/widgets/pca-status-badge.tsx`
- `src/components/dashboard/widgets/key-trends-sparklines.tsx`

**Tasks:**

1. **Auditor widgets:** my-observations-table (sortable, filterable), engagement-progress (progress bars per engagement), pending-responses (count + list of awaiting items)
2. **Manager widgets:** team-workload-chart (horizontal bar per auditor), pending-reviews-table (observations in SUBMITTED status)
3. **CAE widgets:** branch-risk-heatmap (table with color-coded risk score per branch), board-report-readiness (checklist of required report sections)
4. **CCO widgets:** refactor regulatory-calendar (from existing, use DB data), compliance-tasks (progress bars by category), rbi-circular-impact (recent circulars with requirement counts)
5. **CEO widgets:** risk-indicators (card with critical/overdue/non-compliant counts), pca-status-badge, key-trends-sparklines (mini line charts for 6-month trends)

### Plan 09-05: Dashboard Page Composition & Integration

**Wave 3** (depends on 09-03, 09-04)

**Files:**

- `src/app/(dashboard)/dashboard/page.tsx` (rewrite)
- `src/components/dashboard/dashboard-composer.tsx`

**Tasks:**

1. Rewrite dashboard page as server component: read session, determine role-based widget config, pre-fetch data, pass to composer
2. Create `DashboardComposer` client component: receives widget config + initial data, renders responsive grid, sets up React Query polling for each widget
3. Handle multi-role users: merge widget sets, deduplicate, order by priority (health score first, then role-specific)
4. Implement responsive grid layout: 1 col mobile, 2 col tablet, 3 col desktop (matching current pattern)
5. Wire up loading skeletons during poll refresh
6. Handle empty state for new tenants (no data yet)
7. Add fiscal year quarter selector filter (filters date-based widgets)
8. Verify all 5 role dashboards render correctly
9. Remove old JSON-based dashboard widget imports

---

## Dependencies on Other Phases

| Dependency                    | Phase   | What's Needed                                    | Fallback if Not Ready    |
| ----------------------------- | ------- | ------------------------------------------------ | ------------------------ |
| Database schema + RLS         | Phase 5 | Prisma models, prismaForTenant                   | Cannot function without  |
| Auth + session                | Phase 5 | Session with user.roles                          | Cannot function without  |
| RBAC permissions              | Phase 5 | dashboard:\* permissions                         | Cannot function without  |
| Observation model + lifecycle | Phase 6 | Observation table with status, severity, dueDate | Empty state cards        |
| Audit engagements             | Phase 6 | AuditEngagement with branch/area links           | Empty coverage chart     |
| Evidence data                 | Phase 7 | Evidence table (for board readiness check)       | Skip evidence count      |
| Notification counts           | Phase 8 | Notification model (for activity feed)           | Omit notification widget |
| Report generation status      | Phase 8 | Board report generation history                  | Skip readiness widget    |

**Hard dependencies (must be complete):** Phase 5 (database, auth, RBAC)
**Soft dependencies (degrade gracefully):** Phase 6, 7, 8 — dashboard shows empty/zero states for unavailable data

---

## Requirements Mapping

| Requirement                             | Implementation                                                                                                                                                | Plan                |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| **DASH-01**: Auditor dashboard          | my-observations-table + engagement-progress + pending-responses widgets                                                                                       | 09-04, 09-05        |
| **DASH-02**: Audit Manager dashboard    | team-workload + finding-aging + audit-plan-progress + pending-reviews widgets                                                                                 | 09-04, 09-05        |
| **DASH-03**: CAE dashboard              | health-score + audit-coverage + compliance-posture + high-critical-trend + board-readiness + branch-heatmap + daksh-score + key-metrics widgets               | 09-03, 09-04, 09-05 |
| **DASH-04**: CCO dashboard              | compliance-registry-status + regulatory-calendar + compliance-tasks + non-compliant-items + compliance-trend + rbi-circular-impact widgets                    | 09-03, 09-04, 09-05 |
| **DASH-05**: CEO dashboard              | health-score + risk-indicators + daksh-score + executive-kpis + severity-distribution + audit-coverage + compliance-summary + pca-status + key-trends widgets | 09-03, 09-04, 09-05 |
| **DASH-06**: Real-time data aggregation | PostgreSQL views + functions + React Query polling                                                                                                            | 09-01, 09-02        |

**Coverage: 6/6 requirements mapped (100%)**

---

## Execution Order

```
Wave 1 (parallel):
  09-01: Dashboard Infrastructure & Shared Components
  09-02: Dashboard Data Access Layer

Wave 2 (parallel, depends on Wave 1):
  09-03: Shared Dashboard Widgets
  09-04: Role-Specific Dashboard Widgets

Wave 3 (depends on Wave 2):
  09-05: Dashboard Page Composition & Integration
```

---

## Risk Mitigation

| Risk                                       | Likelihood | Impact | Mitigation                                                                              |
| ------------------------------------------ | ---------- | ------ | --------------------------------------------------------------------------------------- |
| Phase 6 not ready (no observations)        | Medium     | Medium | All widgets handle 0 data gracefully; dashboard still shows compliance + audit coverage |
| Health score formula disputed              | Low        | Low    | Weights configurable via Tenant.settings JSON; can be adjusted per bank                 |
| Recharts performance with many data points | Low        | Medium | Limit trend charts to 6 months; paginate tables to 10 rows                              |
| Multi-role widget deduplication conflicts  | Low        | Low    | Widget config uses Set for dedup; priority ordering defined in config                   |
| DAKSH/PCA fields null for most banks       | High       | Low    | All DAKSH/PCA widgets handle null gracefully with "Not assessed" display                |

---

_Plan created: 2026-02-09_
_Author: Phase 9 Planning Agent_
_Cross-review: Completed by phase-10 (phase-6 task #3 unassigned — phase-10 substituted as reviewer)_
_Critical fixes applied: FY filter on v_audit_coverage_branch, fn_extract_fiscal_year() defined, React Query provider added_
_Final approval: Pending (master)_
