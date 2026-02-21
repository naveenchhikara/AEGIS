---
phase: 15-production-hardening
plan: 04
subsystem: data
tags: [seed-data, data-isolation, barrel-export, demo-data]

# Dependency graph
requires:
  - phase: 15-03
    provides: Removed runtime demo user references from src/lib/current-user.ts
provides:
  - Demo JSON files physically isolated in src/data/seed/ directory
  - Barrel export cleaned with deprecation warnings for demo data
  - Locale-specific demo data (hi/, mr/, gu/) removed
  - Seed script imports updated to new paths
affects: [phase-16, future-data-cleanup]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Demo/seed data physically separated from runtime app code"
    - "Barrel export with deprecation comments for prototype views"

key-files:
  created:
    - src/data/seed/bank-profile.json
    - src/data/seed/staff.json
    - src/data/seed/branches.json
    - src/data/seed/compliance-requirements.json
    - src/data/seed/audit-plans.json
    - src/data/seed/findings.json
    - src/data/seed/rbi-circulars.json
  modified:
    - src/data/index.ts
    - prisma/seed.ts

key-decisions:
  - "Kept barrel export pointing to seed/ paths with deprecation warnings (11 prototype views still depend on demo data)"
  - "Deleted unused locale data infrastructure (hi/, mr/, gu/ directories and get-locale-data.ts)"

patterns-established:
  - "Seed data lives in src/data/seed/ - never imported at runtime except in prototype views"
  - "RBI regulations remain in src/data/rbi-regulations/ for runtime use"

# Metrics
duration: 4min
completed: 2026-02-11
---

# Phase 15 Plan 04: Seed Data Migration Summary

**Demo JSON files physically relocated to src/data/seed/ with barrel export cleanup and deprecated locale infrastructure removal**

## Performance

- **Duration:** 4 minutes
- **Started:** 2026-02-11T06:59:58Z
- **Completed:** 2026-02-11T07:03:32Z
- **Tasks:** 2
- **Files modified:** 11 (7 moved, 3 updated, 1 deleted)

## Accomplishments

- All 7 demo JSON files moved from src/data/demo/ to src/data/seed/
- Locale-specific demo data directories (hi/, mr/, gu/) and empty demo/ directory deleted
- Barrel export (src/data/index.ts) updated to point to seed/ paths with deprecation warnings
- Seed script (prisma/seed.ts) imports updated to new seed/ paths
- Dead code removed (src/lib/get-locale-data.ts - locale support no longer used)
- App builds successfully with all imports resolving correctly

## Task Commits

Each task was committed atomically:

1. **Task 1: Move demo JSON files to seed directory and delete locale demo data** - `5553b9b` (refactor)
2. **Task 2: Update barrel export and seed script imports, verify app works** - `e9800ff` (refactor)

## Files Created/Modified

**Created:**

- `src/data/seed/*.json` - 7 demo JSON files for seed scripts only

**Modified:**

- `src/data/index.ts` - Updated demo data exports to point to ./seed/ paths with deprecation comments
- `prisma/seed.ts` - Updated imports to src/data/seed/ paths

**Deleted:**

- `src/data/demo/` - Empty directory removed after file migration
- `src/data/demo/hi/`, `mr/`, `gu/` - Locale-specific demo data (no longer used)
- `src/lib/get-locale-data.ts` - Dead code (locale support removed in v2.0)

## Decisions Made

1. **Kept barrel export working with deprecation warnings** - 11 prototype-era files still import demo data from `@/data` barrel export (dashboard widgets, hardcoded prototype views). Instead of breaking those imports now, updated barrel to point to seed/ paths with clear deprecation comments. Future cleanup phase can migrate to database queries.

2. **Deleted locale infrastructure entirely** - Locale-specific demo data (hi/, mr/, gu/ directories) and the `get-locale-data.ts` helper were dead code. v2.0 uses database for all data, so no runtime locale support needed. Safe to delete.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Deleted dead locale data file**

- **Found during:** Task 2 (TypeScript verification)
- **Issue:** src/lib/get-locale-data.ts imported from @/data/demo/\* paths (now deleted), causing type errors. File was unused (no imports in codebase).
- **Fix:** Deleted src/lib/get-locale-data.ts - dead code from prototype era
- **Files modified:** src/lib/get-locale-data.ts (deleted)
- **Verification:** `pnpm tsc --noEmit` passes, no imports reference the file
- **Committed in:** e9800ff (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Auto-fix removed dead code blocking type checks. No scope creep.

## Issues Encountered

None - file moves and import updates worked as expected.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 16:**

- Demo data physically isolated from runtime app code
- Seed scripts point to correct paths
- App builds and type checks successfully
- No demo data in production bundles (except prototype views via barrel export)

**Future cleanup opportunity:**

- 11 prototype views still import demo data via `@/data` barrel export
- Marked with deprecation comments
- Can be removed in future phase when all pages use database queries

---

_Phase: 15-production-hardening_
_Completed: 2026-02-11_

## Self-Check: PASSED

All created files exist and all commit hashes verified.
