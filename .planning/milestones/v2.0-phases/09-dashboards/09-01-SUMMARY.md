---
phase: 09-dashboards
plan: 01
status: complete
commit: pending
---

# 09-01 Summary: Dashboard Data Layer

## What was done

### Task 1: React Query + fiscal year utilities

Installed `@tanstack/react-query` and created infrastructure:

- **`src/providers/query-provider.tsx`** — Client component wrapping `QueryClientProvider` with defaults: `staleTime: 30s`, `gcTime: 5min`, `refetchOnWindowFocus: false`
- **`src/app/(dashboard)/layout.tsx`** — Wrapped existing SidebarProvider with `<QueryProvider>` (dashboard pages only)
- **`src/lib/fiscal-year.ts`** — Indian fiscal year utilities (Apr-Mar):
  - `getCurrentFiscalYear()`: Feb 2026 → `{ year: 2025, label: "2025-26" }`
  - `getCurrentQuarter()`: Feb 2026 → `Q4_JAN_MAR`
  - `getFiscalYearDateRange(year)`: Date range for full FY
  - `getQuarterLabel(quarter)`: Display labels
  - `getQuarterDateRange(year, quarter)`: Date range for specific quarter
  - `ALL_QUARTERS` constant array

### Task 2: Dashboard configuration + shared UI components

- **`src/lib/dashboard-config.ts`** — Role-to-widget mapping:
  - `ROLE_WIDGETS`: Maps AUDITOR, AUDIT_MANAGER, CAE, CCO, CEO to widget ID arrays
  - `WIDGET_PRIORITY`: Ordered priority list for render ordering
  - `WIDGET_METADATA`: Widget ID → `{ size, dataKey, pollingInterval, component }` config
  - `getDashboardConfig(roles)`: Merges multi-role widget sets, deduplicates, sorts by priority
- **`src/components/dashboard/dashboard-skeleton.tsx`** — Loading skeletons:
  - `CardSkeleton` (third), `ChartSkeleton` (half), `TableSkeleton` (full)
  - `DashboardSkeleton` selector component
- **`src/components/dashboard/empty-state-card.tsx`** — Zero-data state with title, message, optional CTA
- **`src/components/dashboard/fiscal-year-selector.tsx`** — FY+quarter picker:
  - Dropdown: current FY + previous FY
  - Toggle group: All / Q1 / Q2 / Q3 / Q4
  - `onChange` callback with `{ year, quarter | null }`

Installed shadcn/ui `toggle-group` component.

### Task 3: PostgreSQL views and functions

Created `prisma/migrations/20260209_dashboard_views.sql`:

1. **`fn_extract_fiscal_year(DATE)`** — IMMUTABLE, month ≥ 4 → current year, else previous
2. **`v_compliance_summary`** — Per-tenant: total, compliant, partial, non_compliant, pending, percentage
3. **`v_observation_aging`** — Per-tenant: total_open, current, 0-30, 31-60, 61-90, 90+ day buckets
4. **`v_observation_severity`** — Per-tenant: total, total_open, per-severity open counts, closed
5. **`v_audit_coverage_branch`** — Per-branch: completed/total engagements, is_covered (current FY only)
6. **`v_auditor_workload`** — Per-auditor: total_assigned, open_count, high_critical_open
7. **`fn_dashboard_health_score(UUID)`** — STABLE, weighted: Compliance×0.40 + FindingResolution×0.35 + AuditCoverage×0.25

Note: `src/data-access/dashboard.ts` with all 15 query functions and the orchestrator was already created by CHARLIE during 09-02 execution, with Prisma fallbacks for when views don't exist yet.

## Verification

- `pnpm build` ✅ — 21 routes compile successfully
- @tanstack/react-query installed ✅
- QueryProvider wraps dashboard layout ✅
- Fiscal year: Feb 2026 → FY 2025 (Q4_JAN_MAR) ✅
- Dashboard config handles multi-role dedup ✅
- 5 PostgreSQL views + 2 functions ✅
- Health score formula: Compliance×0.40 + FindingResolution×0.35 + AuditCoverage×0.25 ✅
- fn_extract_fiscal_year: Jan-Mar → previous year ✅
- Skeleton, empty state, FY selector components ✅
