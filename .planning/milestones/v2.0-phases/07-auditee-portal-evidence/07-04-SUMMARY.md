---
phase: 07-auditee-portal-evidence
plan: 04
status: complete
executor: DELTA
commit: 5a9db9f
---

## Summary

Created 4 client components for the auditee observation list: deadline countdown badge, overdue alert banner, observation summary card, and filterable observation list with cursor-based pagination.

## What Was Built

### Task 1: Deadline Badge + Overdue Banner

- **`src/components/auditee/deadline-badge.tsx`** (97 lines) — Client component with 6 visual states:
  - `> 7 days`: Muted text "Xd remaining"
  - `3-7 days`: Amber badge "Xd remaining"
  - `1-3 days`: Orange badge "Xd remaining"
  - `< 24h`: Red pulsing badge "Due today" / "Due tomorrow"
  - `Overdue`: Red badge "Xd overdue"
  - `No due date`: Gray text "No deadline"
  - Uses start-of-day normalization for consistent day calculation

- **`src/components/auditee/overdue-banner.tsx`** (21 lines) — Uses shadcn Alert destructive variant with AlertTriangle icon. Returns null when overdueCount is 0.

### Task 2: Observation Card + List

- **`src/components/auditee/observation-card.tsx`** (98 lines) — Client component with:
  - Top row: title (line-clamp-2) + severity badge (SEVERITY_COLORS)
  - Middle row: branch name + audit area name
  - Bottom row: status badge (OBSERVATION_STATUS_COLORS) + DeadlineBadge
  - Red left border accent for overdue observations
  - Click handler → `/auditee/{id}` with keyboard support
  - Exports `AuditeeObservation` type for reuse

- **`src/components/auditee/observation-list.tsx`** (196 lines) — Client component with:
  - Shadcn Tabs: All, Pending Response (ISSUED), Awaiting Review (RESPONSE), Closed
  - Sort select: By Deadline (default), By Severity, By Date Created
  - Responsive grid: 1 col mobile, 2 col sm, 3 col lg
  - Cursor-based load-more via `loadMore` prop (async callback)
  - Per-tab empty state messages
  - Loading spinner on load-more button

## Verification

- `pnpm build` passes with no errors
- DeadlineBadge handles all 6 visual states
- OverdueBanner renders nothing when count is 0
- ObservationCard shows title, severity, status, deadline, branch
- ObservationList has 4 filter tabs for status categories
- ObservationList supports cursor-based load-more pagination
- 4 files, 410 lines total
