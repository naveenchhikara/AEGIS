---
phase: 20-server-actions
plan: 03
subsystem: api
tags:
  [
    server-actions,
    meetings,
    engagement-lifecycle,
    state-machine,
    prisma,
    typescript,
  ]

# Dependency graph
requires:
  - phase: 18-foundation
    provides: "Engagement state machine (canTransitionEngagement, EngagementContext)"
  - phase: 19-data-access-layer
    provides: "rbia-meetings DAL (upsertEngagementMeeting, getEngagementMeeting)"
  - phase: 20-server-actions
    plan: 01
    provides: "RecordMeetingSchema, SignOffMeetingSchema, ActionResult<T>, RBIA permissions"
provides:
  - "recordMeeting server action — atomically records meeting + transitions engagement status"
  - "signOffMeeting server action — marks meeting as signed off (prerequisite for next transition)"
  - "TransitionBlockedError custom error class for state machine rejection handling"
affects: [21-examination-ui, 22-ui-pages]

# Tech tracking
tech-stack:
  added: []
  patterns:
    [
      "Atomic meeting+transition in single $transaction — no partial state",
      "TransitionBlockedError custom class to distinguish state machine rejections from generic errors",
    ]

key-files:
  created:
    - "src/actions/rbia/meetings.ts"
  modified: []

key-decisions:
  - "Reuse audit_execution:manage_team permission for meeting recording — CAE, AUDIT_MANAGER, LEAD_AUDITOR all have this permission, matching state machine allowedRoles"
  - "TransitionBlockedError custom error class enables TRANSITION_BLOCKED error code in ActionResult without string matching"

patterns-established:
  - "Atomic server action pattern: meeting upsert + engagement status transition in one $transaction"
  - "Custom error class for domain-specific error categorization (TransitionBlockedError -> TRANSITION_BLOCKED code)"

requirements-completed: [ENGG-03, ENGG-04]

# Metrics
duration: 4min
completed: 2026-02-25
---

# Phase 20 Plan 03: Meeting Recording & Sign-off Server Actions Summary

**Atomic recordMeeting action (upsert + status transition in one $transaction) and idempotent signOffMeeting action with state machine validation via canTransitionEngagement**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-25T04:18:54Z
- **Completed:** 2026-02-25T04:23:18Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Implemented recordMeeting server action that atomically upserts a meeting record and transitions the engagement status (OPENING -> OPENING_MEETING, EXIT -> EXIT_MEETING) in a single Prisma $transaction
- Implemented signOffMeeting server action that sets signedOff=true with signedOffById and signedOffAt — a prerequisite for the next engagement status transition
- Added TransitionBlockedError custom error class to distinguish state machine rejections from generic errors, enabling proper TRANSITION_BLOCKED error code in ActionResult

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement recordMeeting + signOffMeeting server actions** - `d31923de` (feat)

## Files Created/Modified

- `src/actions/rbia/meetings.ts` - Two server actions: recordMeeting (atomic meeting+transition) and signOffMeeting (idempotent sign-off)

## Decisions Made

- Reuse `audit_execution:manage_team` permission for both meeting recording and sign-off — CAE, AUDIT_MANAGER, and LEAD_AUDITOR all have this permission, which matches the state machine's allowedRoles for OPENING_MEETING and EXIT_MEETING transitions
- Created TransitionBlockedError custom error class rather than doing string matching on error messages — enables clean TRANSITION_BLOCKED vs INTERNAL_ERROR categorization in the catch block

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Meeting server actions ready for Phase 21/22 UI integration (meeting recording forms, sign-off buttons)
- recordMeeting validates via state machine — UI can display transition rejection reasons to users
- signOffMeeting is idempotent — safe for UI to retry without side effects

---

## Self-Check: PASSED

All files verified present. All commit hashes found in git log.

---

_Phase: 20-server-actions_
_Completed: 2026-02-25_
