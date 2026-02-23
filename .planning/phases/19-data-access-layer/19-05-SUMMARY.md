---
phase: 19-data-access-layer
plan: 05
subsystem: audit-execution
tags: [nextjs, rbia, routing, redirect, gateway]

requires:
  - phase: 19-data-access-layer
    provides: getEngagementWithTeam DAL function with team and sectionInstances

provides:
  - Engagement gateway that forks RBIA vs legacy engagements via server-side redirect
  - RBIA stub page at /audit-execution/[id]/rbia — placeholder until Phase 21
  - auditType documented as available from getEngagementWithTeam Prisma include

affects: [21-rbia-execution-ui, 22-rbia-findings]

tech-stack:
  added: []
  patterns:
    - "Compound guard: auditType === RBIA && sectionInstances.length === 0 safely handles pre-v6.0 engagements"
    - "Server-side redirect() from Next.js navigation as gateway fork — throws NEXT_REDIRECT"

key-files:
  created:
    - src/app/(dashboard)/audit-execution/[engagementId]/rbia/page.tsx
  modified:
    - src/app/(dashboard)/audit-execution/[engagementId]/page.tsx
    - src/data-access/audit-execution.ts

key-decisions:
  - "Engagement gateway uses compound check (auditType=RBIA AND no sectionInstances) to safely handle pre-v6.0 engagements with default auditType"
  - "RBIA stub page is minimal placeholder with auth/permission checks — full UI replaces it in Phase 21"
  - "Prisma include returns all scalars by default so auditType is already available — only a comment was added to document the dependency"

patterns-established:
  - "Gateway fork pattern: check compound condition after notFound(), before any canManageTeam logic"

requirements-completed:
  - ENGG-07

duration: 8min
completed: 2026-02-23
---

# Phase 19 Plan 05: Engagement Gateway Summary

**Server-side RBIA/legacy engagement gateway using compound auditType + sectionInstances check, with minimal /rbia/ stub page placeholder**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-23T00:00:00Z
- **Completed:** 2026-02-23T00:08:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added RBIA gateway fork to existing engagement page — RBIA engagements redirect to /rbia/ path, legacy continue unchanged
- Created /rbia/page.tsx stub with auth, permission checks, and engagement header (replaced in Phase 21)
- Documented auditType availability via Prisma include in getEngagementWithTeam

## Task Commits

1. **Task 1: Add auditType comment to getEngagementWithTeam** - `26e30359` (feat)
2. **Task 2: Add RBIA gateway fork and stub page** - `eddb19e9` (feat)

## Files Created/Modified

- `src/data-access/audit-execution.ts` - Added comment documenting auditType availability for ENGG-07
- `src/app/(dashboard)/audit-execution/[engagementId]/page.tsx` - Added RBIA gateway fork after notFound check
- `src/app/(dashboard)/audit-execution/[engagementId]/rbia/page.tsx` - New stub page — redirect target for RBIA engagements

## Decisions Made

- Compound check (auditType === "RBIA" && sectionInstances.length === 0) handles pre-v6.0 engagements that may have defaulted to RBIA auditType but used legacy sections
- Prisma `include` returns all scalar fields by default, so auditType was already available in the query result — no query change needed
- Gateway fork inserted after `notFound()` check, before permission/team logic to keep redirect early and clean

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Gateway fork complete: RBIA engagements now route to /rbia/ path
- Phase 20 (Server Actions) can use the same compound check pattern for action routing
- Phase 21 (RBIA Execution UI) replaces the stub page with full examination interface

---

_Phase: 19-data-access-layer_
_Completed: 2026-02-23_
