---
phase: 06-observation-lifecycle
plan: 01
subsystem: database, schema
tags: prisma, postgresql, observation-lifecycle, rbi-circulars, optimistic-locking, indexes

# Dependency graph
requires:
  - phase: 05-foundation-and-migration
    provides: Prisma ORM setup, tenant isolation, role-based access control, audit trail infrastructure
provides:
  - Extended Observation model with lifecycle fields (version, resolvedDuringFieldwork, resolutionReason, riskCategory, auditeeResponse, actionPlan)
  - ObservationRbiCircular junction table for many-to-many RBI circular tagging (OBS-08)
  - PostgreSQL extensions (pg_trgm) and indexes for repeat finding detection (OBS-09)
  - Observation lifecycle constants (OBSERVATION_STATUS_COLORS, OBSERVATION_STATUS_ORDER, RISK_CATEGORIES)
affects: 06-02-state-machine, 06-03-observation-crud, 06-04-repeat-finding-detection, 06-05-form-ui, 06-06-detail-page

# Tech tracking
tech-stack:
  added: []
  patterns: "Optimistic locking with version column", "Trigram similarity matching with pg_trgm", "Junction table pattern for many-to-many relations"

key-files:
  created:
    - prisma/migrations/add_observation_lifecycle_indexes.sql - Database indexes and RLS policies
  modified:
    - prisma/schema.prisma - Extended Observation model, added ObservationRbiCircular junction table
    - src/lib/constants.ts - Added OBSERVATION_STATUS_COLORS, OBSERVATION_STATUS_ORDER, RISK_CATEGORIES
    - src/components/findings/findings-table.tsx - Updated sorting to use Record format
    - src/components/findings/observation-form.tsx - Updated to use cat.id instead of cat.value
    - src/components/findings/tagging-panel.tsx - Updated to use r.id instead of r.value

key-decisions:
  - "OBSERVATION_STATUS_ORDER as Record<string, number> instead of array - O(1) lookups vs O(n) indexOf()"
  - "RISK_CATEGORIES use lowercase kebab-case ids (e.g., 'credit-risk') instead of uppercase snake_case (e.g., 'CREDIT_RISK')"
  - "OBSERVATION_STATUS_COLORS use border-prefixed classes instead of bg-prefixed classes"

patterns-established:
  - "Pattern: Optimistic locking - version column incremented on each update, concurrent modifications detected via version mismatch"
  - "Pattern: Repeat finding detection - composite index on (tenantId, branchId, auditAreaId, status) filtered to CLOSED status"
  - "Pattern: Text similarity matching - trigram GIN index on title field using pg_trgm extension"
  - "Pattern: Junction table for many-to-many - ObservationRbiCircular with unique constraint on (observationId, rbiCircularId)"

# Metrics
duration: 59 min
completed: 2026-02-09
---

# Phase 6 Plan 01: Observation Schema Migration Summary

**Extended Prisma schema with observation lifecycle fields, ObservationRbiCircular junction table, pg_trgm extension and indexes for repeat finding detection, and observation lifecycle constants for all 7 states.**

## Performance

- **Duration:** 59 min
- **Started:** 2026-02-09T09:17:38Z
- **Completed:** 2026-02-09T10:16:25Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Extended Observation model with all lifecycle fields needed for OBS-01 through OBS-11
- Created ObservationRbiCircular junction table for many-to-many RBI circular tagging (OBS-08)
- Added pg_trgm extension to PostgreSQL for trigram similarity matching
- Created composite index for repeat finding detection queries (OBS-09)
- Created trigram GIN index for title similarity matching
- Added observation lifecycle constants (OBSERVATION_STATUS_COLORS, OBSERVATION_STATUS_ORDER, RISK_CATEGORIES)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Prisma schema for observation lifecycle** - `e6ea7c5` (feat)
2. **Task 2: Create migration SQL for observation lifecycle indexes** - `ec60748` (feat)
3. **Task 3: Add observation status colors and lifecycle constants** - `cb06fc7` (feat)

**Plan metadata:** [to be created]

## Files Created/Modified

- `prisma/schema.prisma` - Added pg_trgm extension, ObservationRbiCircular junction table, relations to Observation and RbiCircular, composite index for repeat detection
- `prisma/migrations/add_observation_lifecycle_indexes.sql` - Migration SQL with pg_trgm extension, composite index for repeat finding, trigram GIN index on title, timeline ordering index, version lookup index, RLS policy for junction table
- `src/lib/constants.ts` - Added OBSERVATION_STATUS_COLORS mapping for all 7 lifecycle states, OBSERVATION_STATUS_ORDER Record for O(1) lookups, RISK_CATEGORIES with lowercase kebab-case ids
- `src/components/findings/findings-table.tsx` - Updated sorting function to use OBSERVATION_STATUS_ORDER Record instead of array indexOf()
- `src/components/findings/observation-form.tsx` - Changed risk category mapping from cat.value to cat.id to match new constant format
- `src/components/findings/tagging-panel.tsx` - Changed risk category lookup from r.value to r.id to match new constant format

## Decisions Made

- OBSERVATION_STATUS_ORDER format changed from string[] to Record<string, number> as specified in plan — this provides O(1) lookup performance instead of O(n) with indexOf()
- RISK_CATEGORIES changed from uppercase snake_case values (CREDIT_RISK) to lowercase kebab-case ids (credit-risk) for consistency with other identifiers
- OBSERVATION_STATUS_COLORS changed from bg-prefixed to border-prefixed classes as specified in plan — matches design system for status badges

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed compilation errors after constant format changes**

- **Found during:** Task 3 (observation status colors and lifecycle constants)
- **Issue:** Changed OBSERVATION_STATUS_ORDER from string[] to Record<string, number> and RISK_CATEGORIES from value property to id property as specified in plan, but existing code (findings-table.tsx, observation-form.tsx, tagging-panel.tsx) used old format causing TypeScript compilation errors
- **Fix:** Updated findings-table.tsx sorting logic to use Record format for O(1) lookups instead of indexOf(). Updated observation-form.tsx and tagging-panel.tsx to use cat.id / r.id instead of cat.value / r.value
- **Files modified:** src/components/findings/findings-table.tsx, src/components/findings/observation-form.tsx, src/components/findings/tagging-panel.tsx
- **Verification:** Build succeeds with no TypeScript errors (`pnpm build` completed successfully)
- **Committed in:** cb06fc7 (part of Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** All auto-fixes necessary for code compatibility after constant format changes. No scope creep.

## Issues Encountered

- TypeScript compilation errors after changing OBSERVATION_STATUS_ORDER from array to Record format and RISK_CATEGORIES from value to id property — fixed by updating all consuming code to use new format

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Prisma schema extended with all fields needed for observation lifecycle (OBS-01 through OBS-11)
- Migration SQL ready to apply indexes and RLS policies when PostgreSQL is running
- Constants for observation lifecycle states and risk categories available for UI components
- Foundation ready for next plan: 06-02-state-machine (state machine transitions and role guards)

---

_Phase: 06-observation-lifecycle_
_Completed: 2026-02-09_

## Self-Check: PASSED

**Key files:**
- ✓ prisma/schema.prisma exists
- ✓ prisma/migrations/add_observation_lifecycle_indexes.sql exists
- ✓ src/lib/constants.ts exists
- ✓ .planning/phases/06-observation-lifecycle/06-01-SUMMARY.md exists

**Commits:**
- ✓ e6ea7c5 exists
- ✓ ec60748 exists
- ✓ cb06fc7 exists

All artifacts verified successfully.
