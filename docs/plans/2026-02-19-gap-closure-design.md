# Gap Closure Design: 18 Remaining Requirements

**Date:** 2026-02-19
**Scope:** Close all 18 remaining gaps (R2, R29, R47, R56, R62, R63, R64, R75, R83, R86, R89, R90, R92, R95, R99, R100, R101, R103)
**Approach:** 3-wave parallel execution with atomic commits per wave

## Decisions

- **R47 Calendar:** Edit-in-place only (no drag-drop library). Recurrence expansion to render repeated events.
- **R86 Inspection Pack:** XLSX export only (reuse ExcelJS). PDF deferred.
- **R103 Cyber Questions:** Research actual RBI Cyber Security Framework to fill 15 missing questions accurately.

## Wave 1 — Quick Wins (10 items)

All independent, all small complexity. Run in parallel.

| Gap  | Task                                                         | Key Files                                              |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------ |
| R100 | Add `vendorName`/`applicationId` to update data object       | `src/actions/investment/manage-is-audit.ts`            |
| R101 | Add load-on-mount + `checklistId` state in CBS component     | `src/components/is-audit/cbs-parameter-audit.tsx`      |
| R103 | Same save fix + add 15 missing RBI cyber questions           | `src/components/is-audit/cyber-security-checklist.tsx` |
| R64  | Expand QA seed from 10 to ~50 IIA IPPF standards             | `src/data/seed/qa-assessment-seed.json`                |
| R83  | Seed CommitteeMeeting for 10 RBI-mandated items              | `prisma/seed.ts`                                       |
| R29  | Create `/api/download` route with S3 presigned URL           | `src/app/api/download/route.ts` (new)                  |
| R95  | Wire HousekeepingMetric TOTAL_DEPOSITS into investments page | `src/app/(dashboard)/investments/page.tsx`             |
| R99  | Add checklist selector + overallRating field                 | `src/components/is-audit/checklist-form.tsx`           |
| R56  | Add assign button in work program table                      | `src/components/work-program/work-program-table.tsx`   |
| R62  | Wire Accept Risk button + add accepted risks filter          | `src/components/issues/issues-table.tsx`               |

**Post-wave:** `tsc --noEmit`, atomic commit.

## Wave 2 — Medium Features (5 items)

Builds on Wave 1 seeds. Run in parallel.

| Gap | Task                                                           | Key Files                                            |
| --- | -------------------------------------------------------------- | ---------------------------------------------------- |
| R2  | Zone CRUD page + DAL + actions + seed + nav                    | New admin page                                       |
| R75 | Verify/wire escalation dialog trigger on concurrent audit page | `src/app/(dashboard)/concurrent-audit/page.tsx`      |
| R47 | Edit-in-place calendar events + recurrence expansion           | `src/components/calendar/calendar-view.tsx`          |
| R63 | Board consolidated aggregation (issues+plans+QA+KRI)           | `src/app/(dashboard)/issues/board/page.tsx`          |
| R86 | Inspection pack XLSX export via ExcelJS                        | `src/actions/governance/generate-inspection-pack.ts` |

**Post-wave:** `tsc --noEmit`, atomic commit.

## Wave 3 — Role Scoping (3 items)

Shared files (`permissions.ts`, `nav-items.ts`). Run sequentially or as single agent.

| Gap | Task                                                    | Key Files                                        |
| --- | ------------------------------------------------------- | ------------------------------------------------ |
| R89 | IS_AUDITOR: add `is_audit:*` perms, filter nav          | `src/lib/permissions.ts`, `src/lib/nav-items.ts` |
| R90 | RISK_HEAD: own dashboard perm, filter nav               | `src/lib/permissions.ts`, `src/lib/nav-items.ts` |
| R92 | SYSTEM_ADMIN: admin nav section, reference R2 zone page | `src/lib/permissions.ts`, `src/lib/nav-items.ts` |

**Post-wave:** `tsc --noEmit`, atomic commit.

## Verification

After all 3 waves:

1. `tsc --noEmit` — zero errors
2. `pnpm build` — clean production build
3. Manual spot-check of each gap's UI
