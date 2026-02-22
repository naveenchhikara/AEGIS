---
phase: 03-demo-ready-polish
plan: 01
subsystem: ui
tags: [dashboard, widgets, loading, error-boundary, 404, layout]

requires:
  - phase: 02-bug-fixes
    provides: Dashboard NaN fixes, quick actions expansion
provides:
  - Clean dashboard rendering for all 4 demo roles
  - Loading/error/404 infrastructure for dashboard routes
  - Consistent page layout across all compliance pages
affects: [demo-script, future dashboard enhancements]

tech-stack:
  added: []
  patterns: [dashboard-error-boundary, loading-skeleton, branded-404]

key-files:
  created:
    - src/app/(dashboard)/loading.tsx
    - src/app/(dashboard)/error.tsx
    - src/app/not-found.tsx
  modified:
    - src/lib/dashboard-config.ts
    - src/components/dashboard/dashboard-composer.tsx
    - src/app/(dashboard)/compliance/ace/page.tsx
    - src/app/(dashboard)/compliance/acb/page.tsx
    - src/lib/icons.ts

key-decisions:
  - "Remove broken trend widgets from ROLE_WIDGETS rather than implementing placeholder cards"
  - "Wire compliance-summary to existing complianceSummary data as single 'Overall Compliance' category"

patterns-established:
  - "Dashboard error boundary stays within layout shell (no full-page takeover)"
  - "Single loading.tsx at (dashboard) level covers all dashboard subroutes"

completed: 2026-02-22
---

# Phase 3 Plan 01: Dashboard & Infrastructure Polish Summary

**Fixed 3 broken dashboard widget slots, wired CCO compliance widget to real data, added loading/error/404 infrastructure, and standardized ACE/ACB page layouts.**

## Acceptance Criteria Results

| Criterion                                                 | Status | Notes                                                                                             |
| --------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------- |
| AC-1: Dashboard widgets render cleanly for all demo roles | Pass   | Removed 3 unimplemented trend widget IDs from ROLE_WIDGETS; wired compliance-summary to real data |
| AC-2: Page transitions show loading state                 | Pass   | Created loading.tsx with skeleton grid at (dashboard) level                                       |
| AC-3: Dashboard errors stay in layout                     | Pass   | Created error.tsx with Sentry capture, keeps sidebar visible                                      |
| AC-4: ACE/ACB pages match standard layout                 | Pass   | Changed to space-y-6 + text-2xl, removed container mx-auto py-6                                   |
| AC-5: Custom 404 page                                     | Pass   | Created not-found.tsx with branded card and dashboard link                                        |

## Accomplishments

- All 4 demo dashboards (CEO, CAE, CCO, AUDIT_MANAGER) now render without permanent skeleton placeholders
- CCO compliance-summary widget shows real compliance data instead of hardcoded empty array
- Page transitions show skeleton loading state instead of white flash
- Errors within dashboard stay in layout shell with retry option
- Non-existent routes show branded 404 with "Back to Dashboard" link

## Files Created/Modified

| File                                              | Change   | Purpose                                                                                                             |
| ------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| `src/lib/dashboard-config.ts`                     | Modified | Removed severity-trend, high-critical-trend, compliance-trend from ROLE_WIDGETS; replaced with working alternatives |
| `src/components/dashboard/dashboard-composer.tsx` | Modified | Removed null-returning trend widget cases; wired compliance-summary to complianceSummary data                       |
| `src/app/(dashboard)/loading.tsx`                 | Created  | Skeleton grid loading state for all dashboard route transitions                                                     |
| `src/app/(dashboard)/error.tsx`                   | Created  | Dashboard-scoped error boundary with Sentry + retry (keeps sidebar)                                                 |
| `src/app/not-found.tsx`                           | Created  | Branded 404 page with FileQuestion icon and dashboard link                                                          |
| `src/app/(dashboard)/compliance/ace/page.tsx`     | Modified | Standardized layout: space-y-6, text-2xl (was container mx-auto py-6, text-3xl)                                     |
| `src/app/(dashboard)/compliance/acb/page.tsx`     | Modified | Same layout standardization as ACE                                                                                  |
| `src/lib/icons.ts`                                | Modified | Added FileQuestion export for 404 page                                                                              |

## Decisions Made

| Decision                                                        | Rationale                                                                                                                | Impact                                            |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| Remove trend widgets from roles instead of placeholder cards    | No historical data exists for trends; "coming soon" cards look incomplete during demos                                   | Clean dashboards with only working widgets        |
| Wire compliance-summary as single "Overall Compliance" category | ComplianceTasks component works with categories array; existing complianceSummary data maps cleanly to a single category | CCO dashboard shows real compliance breakdown bar |
| Single loading.tsx at (dashboard) root                          | Covers all subroutes without duplicating files; individual pages can override later if needed                            | Minimal file creation, broad coverage             |

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Verification

- [x] `pnpm build` compiles without TypeScript errors
- [x] No `return null` for widget cases in dashboard-composer.tsx (except `default`)
- [x] ROLE_WIDGETS only references implemented widget IDs
- [x] loading.tsx exists in src/app/(dashboard)/
- [x] error.tsx exists in src/app/(dashboard)/
- [x] not-found.tsx exists in src/app/
- [x] ACE/ACB pages use standard layout classes
- [x] All imports use `@/lib/icons` (not `lucide-react`)

## Next Phase Readiness

**Ready:**

- All dashboard widgets render clean data for demo
- Page infrastructure (loading, errors, 404) handles edge cases
- Layout consistency across all pages

**Concerns:**

- WIDGET_METADATA still contains entries for removed trend widgets (harmless but vestigial)
- ComplianceTasks shows single "Overall Compliance" category — could be enhanced with per-module breakdown

**Blockers:**

- None

---

_Phase: 03-demo-ready-polish, Plan: 01_
_Completed: 2026-02-22_
