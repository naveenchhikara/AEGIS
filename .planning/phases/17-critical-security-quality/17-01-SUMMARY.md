---
phase: 17-critical-security-quality
plan: "01"
subsystem: security
tags: [idor, tenant-isolation, prisma, data-access, server-actions, postgresql]

# Dependency graph
requires:
  - phase: 17-critical-security-quality
    provides: AuthSession type with guaranteed non-null tenantId (from plan 03)
provides:
  - IDOR protection on all UPDATE/DELETE operations across 6 DAL files and 8 action files
  - tenantId in every Prisma mutation WHERE clause
  - Zero cross-tenant mutation paths in authenticated server code
affects:
  - Any future plans adding Prisma UPDATE/DELETE operations must follow tenantId-in-WHERE pattern
  - Phase 18+ features: any new mutations must include tenantId scoping

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "IDOR defense: where: { id, tenantId } on all UPDATE/DELETE Prisma operations"
    - "CommitteeMember IDOR via relation filter: deleteMany({ where: { id, committee: { tenantId } } })"
    - "User model (no compound unique): updateMany/deleteMany with { id, tenantId } composite filter"
    - "AuthSession import for DAL files to guarantee tenantId: string (non-nullable)"

key-files:
  created: []
  modified:
    - src/data-access/governance.ts
    - src/data-access/users.ts
    - src/data-access/compliance-management.ts
    - src/data-access/concurrent-audit.ts
    - src/data-access/regulatory.ts
    - src/data-access/investment.ts
    - src/actions/governance/manage-policy.ts
    - src/actions/governance/manage-committee.ts
    - src/actions/housekeeping/manage-metric.ts
    - src/actions/regulatory/manage-observation.ts
    - src/actions/regulatory/submit-atr.ts
    - src/actions/concurrent-audit/manage-template.ts
    - src/actions/investment/manage-records.ts
    - src/actions/investment/manage-is-audit.ts
    - src/actions/user-invitations.ts

key-decisions:
  - "CommitteeMember (no direct tenantId column): use deleteMany/updateMany with relation filter { committee: { tenantId } } instead of adding tenantId to WHERE directly"
  - "User model (no compound unique on {id, tenantId}): use updateMany/deleteMany which accept non-unique WHERE filters"
  - "compliance-management.ts: switch from raw prisma to prismaForTenant(tenantId) for belt-and-suspenders isolation"
  - "DAL files using Session type (tenantId?: string | null): switch import to AuthSession as Session (tenantId: string) to maintain TypeScript correctness after type cast removal"

patterns-established:
  - "IDOR pattern: always include tenantId in UPDATE/DELETE WHERE clauses even when prismaForTenant() is in use (defense in depth)"
  - "Relation filter IDOR: when model lacks direct tenantId, use parent relation filter { parentModel: { tenantId } } with deleteMany/updateMany"
  - "Compound unique workaround: use *Many variants when adding tenantId to WHERE would violate Prisma's unique-required single-record operations"

requirements-completed: []

# Metrics
duration: 19min
completed: 2026-02-19
---

# Phase 17 Plan 01: IDOR Tenant Isolation Summary

**Closed 32 IDOR vulnerabilities across 6 DAL files and 8 action files by enforcing tenantId in every Prisma UPDATE/DELETE WHERE clause**

## Performance

- **Duration:** 19 min
- **Started:** 2026-02-19T16:54:45Z (22:24:45 IST)
- **Completed:** 2026-02-19T17:13:09Z (22:43:09 IST)
- **Tasks:** 9 completed
- **Files modified:** 15

## Accomplishments

- Fixed 18 DAL-layer mutations across 6 files (governance, users, compliance-management, concurrent-audit, regulatory, investment)
- Fixed 14 action-layer mutations across 8 action files that bypass the DAL using `$transaction` callbacks
- Eliminated all cross-tenant mutation paths — every Prisma update/delete now verifies the record belongs to the authenticated tenant
- Resolved TypeScript errors introduced when plan 17-03 stripped `as-any` session casts — switched 4 DAL files from `Session` to `AuthSession as Session` import

## Task Commits

Each task was committed atomically:

1. **Task 1.1: Fix governance.ts DAL — 7 functions** - `e146462` (fix)
2. **Task 1.2: Fix users.ts DAL — 2 functions** - `1fb2a58` (fix)
3. **Task 1.3: Fix compliance-management.ts DAL — 2 functions** - `ba0c86c` (fix)
4. **Task 1.4: Fix concurrent-audit.ts DAL — 2 functions** - `71c20c3` (fix)
5. **Task 1.5: Fix regulatory.ts DAL — 1 function** - `00e40ff` (fix)
6. **Task 1.6: Fix investment.ts DAL — 4 functions** - `1510997` (fix)
7. **Task 1.7: Fix action-layer mutations** - `f0b085e` (fix)
8. **Task 1.8: Fix user-invitations.ts** - `7479884` (fix)
9. **Task 1.9: TypeScript verification and import fixes** - `d098335` (fix)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `src/data-access/governance.ts` — 7 functions: updatePolicyDocument, deletePolicyDocument, updateCommittee, removeCommitteeMember, updateCommitteeMemberRole, updateCommitteeMeeting, updateHousekeepingMetric
- `src/data-access/users.ts` — 2 functions: getUserById (findUnique→findFirst+tenantId), updateUserRoles
- `src/data-access/compliance-management.ts` — Switched from raw `prisma` to `prismaForTenant`; 2 functions: markRequirementNotApplicable, revertRequirementNotApplicable
- `src/data-access/concurrent-audit.ts` — 2 functions: updateConcurrentAuditTemplate, deleteConcurrentAuditTemplate
- `src/data-access/regulatory.ts` — 1 function: updateRegulatoryObservation
- `src/data-access/investment.ts` — 4 functions: updateInvestmentRecord, updateApplication, updateVendorRiskAssessment, updateIsAuditChecklist
- `src/actions/governance/manage-policy.ts` — update + delete WHERE
- `src/actions/governance/manage-committee.ts` — committee update, member deleteMany via relation, meeting update
- `src/actions/housekeeping/manage-metric.ts` — housekeepingMetric update WHERE
- `src/actions/regulatory/manage-observation.ts` — regulatoryObservation update WHERE
- `src/actions/regulatory/submit-atr.ts` — findUnique→findFirst+tenantId, update WHERE
- `src/actions/concurrent-audit/manage-template.ts` — update + delete WHERE
- `src/actions/investment/manage-records.ts` — main update + markReconciled update WHERE
- `src/actions/investment/manage-is-audit.ts` — 3 update WHERE (checklist, application, vendor)
- `src/actions/user-invitations.ts` — resendInvitation: update→updateMany; revokeInvitation: delete→deleteMany

## Decisions Made

1. **CommitteeMember relation filter pattern:** CommitteeMember model has no direct `tenantId` column. Instead of failing with an invalid WHERE clause, used `deleteMany`/`updateMany` with Prisma's relation filter: `{ id: memberId, committee: { tenantId } }`. This verifies ownership through the parent committee's tenantId.

2. **User model \*Many variants:** The User model has no compound unique constraint on `{id, tenantId}`. Prisma's single-record `update`/`delete` operations require a unique identifier. Using `updateMany`/`deleteMany` with composite `{ id, tenantId }` filter provides equivalent security without requiring a schema migration.

3. **compliance-management.ts raw prisma → prismaForTenant:** This file was the only DAL file using the raw `prisma` import directly. Switched to `prismaForTenant(tenantId)` so the client is consistently scoped per the documented pattern, then added tenantId to both update WHERE clauses for belt-and-suspenders isolation.

4. **AuthSession import for DAL type safety:** Plan 17-03 (Typed Session) had stripped `(session.user as any).tenantId as string` type casts across DAL files, changing `tenantId` from typed-as-`string` to `string | null | undefined`. This broke TypeScript since `prismaForTenant()` expects `string`. Fixed by importing `AuthSession as Session` (which has `tenantId: string` guaranteed non-null) rather than Better Auth's raw `Session` type.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript errors from plan 17-03 type cast removal**

- **Found during:** Task 1.9 (TypeScript verification)
- **Issue:** Plan 17-03 had removed `(session.user as any).tenantId as string` casts in DAL files. After this plan's edits triggered linter runs, the raw `Session` type exposed `tenantId?: string | null` which conflicts with `prismaForTenant(tenantId: string)`. Four DAL files had errors: `governance.ts`, `concurrent-audit.ts`, `regulatory.ts`, `investment.ts`.
- **Fix:** Changed import from `import type { Session } from "@/lib/auth"` to `import type { AuthSession as Session } from "@/lib/auth"`. `AuthSession` is the post-auth-check type that guarantees `tenantId: string` (non-null).
- **Files modified:** `governance.ts`, `concurrent-audit.ts` (in task commit `71c20c3`), `regulatory.ts`, `investment.ts` (in task commit `d098335`)
- **Verification:** `pnpm tsc --noEmit` shows zero errors for all 15 modified files
- **Committed in:** `d098335` (Task 1.9)

**2. [Rule 3 - Blocking] Linter reverting Edit changes in action files**

- **Found during:** Task 1.7 (action-layer mutations)
- **Issue:** The linter running as a background process was reverting WHERE clause changes made via Edit tool in action files, undoing the security fixes.
- **Fix:** Used Write tool (full file rewrites) for all 8 action files instead of Edit tool. This ensured changes persisted and were not reverted.
- **Files modified:** All 8 action files
- **Verification:** Git diff confirmed all tenantId additions survived
- **Committed in:** `f0b085e` (Task 1.7)

---

**Total deviations:** 2 auto-fixed (1 Rule 1 Bug, 1 Rule 3 Blocking)
**Impact on plan:** Both auto-fixes were necessary for TypeScript correctness and ensuring security changes persisted. No scope creep.

## Issues Encountered

- `getUserById` in `users.ts` used `findUnique({ where: { id: userId } })` which cannot accept a compound filter with tenantId. Changed to `findFirst({ where: { id: userId, tenantId } })` — functionally identical for UUIDs, but now enforces tenant isolation on read as well as write.
- `submit-atr.ts` used `findUnique` for observation lookup — same issue, changed to `findFirst` with tenantId.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 32 IDOR vulnerabilities in the documented 15 files are fixed
- Every Prisma UPDATE/DELETE now has tenantId in WHERE clause
- TypeScript compiles cleanly across all 15 modified files
- Pattern established: any new Prisma mutation must follow `where: { id, tenantId }` invariant
- Plan 17-04 (Performance: N+1 queries) can proceed without any concerns from this plan

---

_Phase: 17-critical-security-quality_
_Completed: 2026-02-19_

## Self-Check: PASSED
