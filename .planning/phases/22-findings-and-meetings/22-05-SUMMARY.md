---
phase: 22-findings-and-meetings
plan: 05
subsystem: ui
tags:
  [
    next.js,
    app-router,
    rbia,
    tabs,
    engagement-stepper,
    server-components,
    client-components,
  ]

# Dependency graph
requires:
  - phase: 22-01
    provides: EngagementStepper, FindingsList, FindingForm components
  - phase: 22-02
    provides: MeetingForm, MeetingView components
  - phase: 22-03
    provides: ScoreGauge, ScoreDrilldown components
  - phase: 22-04
    provides: BmResponsePanel component, rbia-bm-response DAL
  - phase: 19
    provides: DAL functions (rbia-findings, rbia-meetings, rbia-scoring, audit-execution)
  - phase: 18
    provides: engagement-state-machine, rbia-scoring-engine
provides:
  - Shared RBIA layout with engagement stepper + tab navigation + transition control
  - Findings server page wired to getEngagementFindings DAL
  - Meetings server page with MeetingSection client wrapper for server/client boundary
  - Score server page with ScoreDrilldownWrapper for tree navigation
  - StatusTransitionControl with disabled button tooltip for meeting prerequisites
  - TabNav component for URL-based segment navigation
  - MeetingSection client wrapper that owns form/view toggle state internally
affects: [23-reporting, 21-examination]

# Tech tracking
tech-stack:
  added: []
  patterns:
    [
      server-client-boundary-wrapper,
      url-based-tab-navigation,
      state-machine-derived-transitions,
    ]

key-files:
  created:
    - src/app/(dashboard)/audit-execution/[engagementId]/rbia/layout.tsx
    - src/app/(dashboard)/audit-execution/[engagementId]/rbia/findings/page.tsx
    - src/app/(dashboard)/audit-execution/[engagementId]/rbia/meetings/page.tsx
    - src/app/(dashboard)/audit-execution/[engagementId]/rbia/score/page.tsx
    - src/app/(dashboard)/audit-execution/[engagementId]/rbia/score/score-drilldown-wrapper.tsx
    - src/components/rbia/meeting-section.tsx
    - src/components/rbia/status-transition-control.tsx
    - src/components/rbia/tab-nav.tsx
  modified:
    - src/app/(dashboard)/audit-execution/[engagementId]/rbia/page.tsx

key-decisions:
  - "URL-based tab navigation with separate Next.js pages for deep linking and browser history support"
  - "MeetingSection client wrapper pattern to avoid passing arrow functions from server to client components"
  - "StatusTransitionControl derives next status from engagement state machine -- single source of truth"
  - "4 tabs (Examination, Findings, Meetings, Score) -- no separate Overview tab"
  - "ScoreDrilldownWrapper as separate client component for module tree navigation state"

patterns-established:
  - "Server/client boundary wrapper: When server pages need to pass callbacks to client components, create a client wrapper that owns the state and callbacks internally"
  - "State machine-derived UI: Layout derives next status, label, and prerequisite checks from ENGAGEMENT_TRANSITIONS map -- no hardcoded status logic in UI"
  - "URL-based tab routing: Each tab is a Next.js page under /rbia/ for proper routing, deep linking, and back/forward support"

requirements-completed: [FIND-04, BMRP-02, BMRP-03, BMRP-04, REPT-01, REPT-03]

# Metrics
duration: 22min
completed: 2026-02-25
---

# Phase 22 Plan 05: RBIA Engagement Pages Assembly Summary

**RBIA engagement detail with tabbed layout (Examination/Findings/Meetings/Score), shared stepper + transition control, and server pages wired to Phase 19 DAL functions**

## Performance

- **Duration:** 22 min
- **Started:** 2026-02-25T05:03:58Z
- **Completed:** 2026-02-25T05:25:58Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments

- Shared RBIA layout renders engagement stepper with green checkmarks for completed stages, status transition button with disabled tooltip when meeting prerequisite not met, and URL-based tab navigation
- Three server pages created (findings, meetings, score) all wired to DAL with proper auth and tenant isolation
- MeetingSection client wrapper pattern solves the server/client boundary for callback passing
- ScoreDrilldownWrapper manages drill-down navigation state for module tree exploration

## Task Commits

Each task was committed atomically:

1. **Task 1: Create MeetingSection client wrapper + StatusTransitionControl** - `e928b6b8` (feat)
2. **Task 2: Create RBIA shared layout with stepper, tab nav, and transition control** - `d5a3d919` (feat)
3. **Task 3: Build findings, meetings, and score server pages** - `0bdfee60` (feat)

## Files Created/Modified

- `src/components/rbia/meeting-section.tsx` - Client wrapper owning form/view toggle state for meetings
- `src/components/rbia/status-transition-control.tsx` - Disabled button with tooltip for meeting prerequisites
- `src/components/rbia/tab-nav.tsx` - URL-based tab navigation with active state detection
- `src/app/(dashboard)/audit-execution/[engagementId]/rbia/layout.tsx` - Shared RBIA layout with stepper + tabs + transition control
- `src/app/(dashboard)/audit-execution/[engagementId]/rbia/page.tsx` - Simplified examination placeholder (layout handles chrome)
- `src/app/(dashboard)/audit-execution/[engagementId]/rbia/findings/page.tsx` - Server page loading ActionPoints + Observations
- `src/app/(dashboard)/audit-execution/[engagementId]/rbia/meetings/page.tsx` - Server page with dual meeting sections
- `src/app/(dashboard)/audit-execution/[engagementId]/rbia/score/page.tsx` - Server page with gauge and drill-down
- `src/app/(dashboard)/audit-execution/[engagementId]/rbia/score/score-drilldown-wrapper.tsx` - Client component managing drill-down module selection

## Decisions Made

- **URL-based tabs over client-side tabs**: Each tab is a separate Next.js page for proper back/forward navigation, deep linking, and independent data loading
- **MeetingSection wrapper pattern**: Server pages cannot pass arrow function callbacks to client components, so MeetingSection owns onCancel/onSuccess internally
- **State machine-derived transitions**: Layout reads ENGAGEMENT_TRANSITIONS map to derive next status, label, and prerequisites -- no hardcoded status logic
- **4 tabs without Overview**: Examination (default landing), Findings, Meetings, Score -- existing Phase 21 examination page serves as the default tab

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all components from Plans 22-01 through 22-04 were available with expected exports and prop interfaces.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 22 is now complete -- all 5 plans executed (components + integration)
- RBIA engagement detail pages are fully assembled with tabbed navigation
- Phase 21 (Examination) can build the examination tree interface into the existing placeholder page.tsx
- Phase 23 (Reporting) can consume the score/findings data from the assembled pages

## Self-Check: PASSED

All 9 created files verified present. All 3 task commits verified in git log.

---

_Phase: 22-findings-and-meetings_
_Completed: 2026-02-25_
