---
phase: 07-auditee-portal-evidence
plan: 06
status: complete
executor: DELTA
commit: 53d3071
---

## Summary

Migrated auditee dashboard page from JSON demo data to PostgreSQL-backed server component with branch-scoped observation queries, computed summary statistics, and interactive observation list.

## What Was Built

### Task 1: Rewrite Auditee Dashboard Page

- **`src/app/(dashboard)/auditee/page.tsx`** (100 lines) — Server component:
  - `requirePermission("observation:read")` route guard at top
  - `getObservationsForAuditee(session)` for branch-scoped data
  - Computed summary counts: pending response (ISSUED), awaiting review (RESPONSE), overdue (dueDate < now AND not CLOSED/COMPLIANCE), total
  - 4 summary cards in 2-col mobile / 4-col sm+ grid
  - OverdueBanner conditionally rendered when overdueCount > 0
  - ObservationList with initial observations + nextCursor
  - i18n preserved: `getTranslations("Auditee")`
  - All `@/data` JSON imports removed

- **`src/app/(dashboard)/auditee/layout.tsx`** (7 lines) — Minimal pass-through layout

## Key Decisions

- Used `observation:read` permission instead of `auditee:view` — the latter doesn't exist in the permissions system. AUDITEE role has `observation:read` which correctly guards this page.
- Overdue calculation excludes CLOSED and COMPLIANCE statuses (observation is being addressed)
- Uses `responseDueDate ?? dueDate` for deadline — response due date takes priority when set

## Verification

- `pnpm build` passes with no errors
- No imports from `@/data` — all from `@/data-access`
- Route guard present at top of page
- Summary cards computed from database data
- OverdueBanner renders when overdue items exist
- ObservationList receives observations + nextCursor
- 2 files changed, 90 insertions, 116 deletions (net reduction)
