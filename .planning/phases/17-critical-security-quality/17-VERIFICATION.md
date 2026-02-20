---
phase: 17-critical-security-quality
verified: 2026-02-19T17:43:35Z
status: gaps_found
score: 14/17 must-haves verified
gaps:
  - truth: "TypeScript compiles without errors"
    status: failed
    reason: "238 TypeScript errors remain in the codebase; 24 are in phase 17 modified files (compliance-items.ts). The `_count: true` union type in getComplianceEscalationSummary yields type errors (TS2365, TS18048, TS2322) where `number` is expected. Additionally, removing `as any` in phase 17-03 surfaced pre-existing null-narrowing errors in compliance-items.ts (string | null | undefined where string expected). The SUMMARY claimed TypeScript passed but the check in the summary notes these were pre-existing."
    artifacts:
      - path: "src/data-access/compliance-items.ts"
        issue: "Lines 327-333: `_count: true` in groupBy returns a union type not assignable to `number`. Lines 16-311: `string | null | undefined` parameter type mismatches surfaced by phase 17-03 as-any removal."
    missing:
      - "Fix getComplianceEscalationSummary to use `_count: { id: true }` instead of `_count: true` and access via `g._count.id`"
      - "Fix string | null | undefined narrowing issues in compliance-items.ts functions (createComplianceItem, etc.) — add null checks or non-null assertions where tenantId is guaranteed"
---

# Phase 17: Critical Security and Quality Verification Report

**Phase Goal:** Eliminate critical security vulnerabilities, type safety issues, and quality gaps identified in the security audit. Non-functional improvements that harden existing features.
**Verified:** 2026-02-19T17:43:35Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                             | Status   | Evidence                                                                                                                                                                                                                            |
| --- | --------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | All 18 DAL functions have tenantId in WHERE for UPDATE/DELETE                     | VERIFIED | All 7 governance.ts + 2 users.ts + 2 compliance-management.ts + 2 concurrent-audit.ts + 1 regulatory.ts + 4 investment.ts functions confirmed with tenantId in WHERE clauses                                                        |
| 2   | All 14 action-layer mutation operations have tenantId in WHERE                    | VERIFIED | All tx.model.update/delete in manage-policy.ts, manage-committee.ts, manage-metric.ts, manage-observation.ts, submit-atr.ts, manage-template.ts, manage-records.ts, manage-is-audit.ts, user-invitations.ts confirmed with tenantId |
| 3   | documentUrl Zod validation rejects javascript: protocol at server action level    | VERIFIED | manage-policy.ts:32-39 has `.url().refine(/^https?:\/\//i.test(val))` on documentUrl                                                                                                                                                |
| 4   | documentUrl Zod validation rejects javascript: protocol at client form level      | VERIFIED | policy-table.tsx:83-90 has same `.url().refine(/^https?:\/\//i.test(val))` schema                                                                                                                                                   |
| 5   | Render-side guard prevents existing bad data from executing as XSS                | VERIFIED | policy-table.tsx:454-455 has `policy.documentUrl && /^https?:\/\//i.test(policy.documentUrl) &&` guard before rendering anchor                                                                                                      |
| 6   | Empty/cleared documentUrl still works                                             | VERIFIED | Both schemas use `.optional().or(z.literal(""))` — empty string passes                                                                                                                                                              |
| 7   | Single boundary cast in getRequiredSession(), zero casts downstream               | VERIFIED | session.ts:30 has single `return session as unknown as AuthSession`; downstream code uses `session.user.tenantId` without casts                                                                                                     |
| 8   | All 417 as any session casts eliminated                                           | VERIFIED | grep confirms 0 files with `session.user as any`, `as any).tenantId`, `as any).roles`, `as any).tenantName` patterns                                                                                                                |
| 9   | tenantName bug fixed (3 files)                                                    | VERIFIED | All 3 export routes now query `prismaForTenant(tenantId).tenant.findUnique()` for real name                                                                                                                                         |
| 10  | TypeScript compiles clean                                                         | FAILED   | 238 TS errors overall; 24 errors in phase 17 modified files (compliance-items.ts has unfixed `_count: true` union type errors and null-narrowing issues surfaced by as-any removal)                                                 |
| 11  | getAuditPlanProgress uses single query with include (not N+1 loop)                | VERIFIED | analytics.ts:57-72 uses `db.auditPlan.findMany({ include: { engagements: {...} }, take: 20 })`                                                                                                                                      |
| 12  | getFindingTrends uses groupBy/limited queries                                     | VERIFIED | analytics.ts:173-222 uses `$queryRaw` with `date_trunc('quarter')` and 2-year window                                                                                                                                                |
| 13  | getComplianceAging uses groupBy/limited queries                                   | VERIFIED | analytics.ts:104-166 uses raw SQL CASE WHEN bucketing + `db.complianceItem.groupBy`                                                                                                                                                 |
| 14  | getNpaMovement uses groupBy/limited queries                                       | VERIFIED | analytics.ts:229-293 uses `$queryRaw` with `date_trunc('quarter')` and 2-year window                                                                                                                                                |
| 15  | Dashboard fallbacks use groupBy instead of full table scans                       | VERIFIED | dashboard.ts:342-346 (severity), 588-592 (workload), 870-874 (branch risk) all use `db.observation.groupBy`                                                                                                                         |
| 16  | updateDaysOpenForOpenItems uses single SQL instead of N+1                         | VERIFIED | compliance-items.ts:137-142 uses `db.$executeRaw` with single UPDATE WHERE clause                                                                                                                                                   |
| 17  | All unbounded findMany in analytics/dashboard have take limits or use aggregation | VERIFIED | analytics.ts take: 20 guard; dashboard groupBy fallbacks; exports.ts take: 5000; reports.ts take: 1000                                                                                                                              |

**Score:** 16/17 truths verified (TypeScript compilation failed)

### Required Artifacts

| Artifact                                          | Expected                                 | Status             | Details                                                                                                                         |
| ------------------------------------------------- | ---------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `src/data-access/governance.ts`                   | tenantId in all UPDATE/DELETE WHERE      | VERIFIED           | All 7 mutations confirmed                                                                                                       |
| `src/data-access/users.ts`                        | tenantId in all UPDATE/DELETE WHERE      | VERIFIED           | updateUserRoles has `{ id: userId, tenantId }`                                                                                  |
| `src/data-access/compliance-management.ts`        | tenantId in UPDATE WHERE                 | VERIFIED           | Both markRequirementNotApplicable and revertRequirementNotApplicable use prismaForTenant + `{ id, tenantId }`                   |
| `src/data-access/concurrent-audit.ts`             | tenantId in UPDATE/DELETE WHERE          | VERIFIED           | updateConcurrentAuditTemplate and deleteConcurrentAuditTemplate confirmed                                                       |
| `src/data-access/regulatory.ts`                   | tenantId in UPDATE WHERE                 | VERIFIED           | updateRegulatoryObservation has `{ id: observationId, tenantId }`                                                               |
| `src/data-access/investment.ts`                   | tenantId in all 4 UPDATE WHERE           | VERIFIED           | Lines 93, 255, 371, 467 all confirmed                                                                                           |
| `src/actions/governance/manage-policy.ts`         | Zod XSS + tenantId in WHERE              | VERIFIED           | XSS schema on line 32-39; WHERE `{ id: policyId, tenantId }` on line 86 and 164                                                 |
| `src/actions/governance/manage-committee.ts`      | tenantId in all WHERE                    | VERIFIED           | committee update line 88, committeeMember.deleteMany line 226, meeting update line 290                                          |
| `src/actions/housekeeping/manage-metric.ts`       | tenantId in WHERE                        | VERIFIED           | Line 55: `{ id: parsed.data.id, tenantId }`                                                                                     |
| `src/actions/regulatory/manage-observation.ts`    | tenantId in WHERE                        | VERIFIED           | Line 74: `{ id: parsed.data.observationId, tenantId }`                                                                          |
| `src/actions/regulatory/submit-atr.ts`            | tenantId in findFirst + update WHERE     | VERIFIED           | Line 78 findFirst and line 123 update both have tenantId                                                                        |
| `src/actions/concurrent-audit/manage-template.ts` | tenantId in update + delete WHERE        | VERIFIED           | Line 81 update and line 158 delete confirmed                                                                                    |
| `src/actions/investment/manage-records.ts`        | tenantId in both update WHERE            | VERIFIED           | Lines 82 and 193 both confirmed                                                                                                 |
| `src/actions/investment/manage-is-audit.ts`       | tenantId in all 3 update WHERE           | VERIFIED           | Lines 126, 218, 309 all confirmed                                                                                               |
| `src/actions/user-invitations.ts`                 | tenantId in resend/revoke WHERE          | VERIFIED           | Lines 233 (updateMany) and 276 (deleteMany) confirmed                                                                           |
| `src/components/governance/policy-table.tsx`      | Zod validation + render guard            | VERIFIED           | Schema on line 83-90; render guard on line 454-455; `type="url"` on input line 341                                              |
| `src/lib/auth.ts`                                 | SessionUser + AuthSession types exported | VERIFIED           | Lines 117-128: `SessionUser` and `AuthSession` defined                                                                          |
| `src/data-access/session.ts`                      | getRequiredSession returns AuthSession   | VERIFIED           | Returns `Promise<AuthSession>` with single cast at line 30                                                                      |
| `src/data-access/analytics.ts`                    | N+1 fixed; groupBy/raw SQL for trends    | VERIFIED           | getAuditPlanProgress uses include; getFindingTrends/getComplianceAging/getNpaMovement use raw SQL date_trunc                    |
| `src/data-access/dashboard.ts`                    | groupBy fallbacks                        | VERIFIED           | computeSeverityFallback, computeWorkloadFallback, getBranchRiskData all use groupBy                                             |
| `src/data-access/compliance-items.ts`             | updateDaysOpenForOpenItems single SQL    | VERIFIED (partial) | N+1 fix confirmed; but file has 24 TypeScript errors (some pre-existing, \_count type issue introduced or surfaced by phase 17) |

### Key Link Verification

| From                          | To                              | Via                                           | Status | Details                                                            |
| ----------------------------- | ------------------------------- | --------------------------------------------- | ------ | ------------------------------------------------------------------ |
| manage-policy.ts Zod schema   | Server rejection of javascript: | `.refine(/^https?:\/\//i.test(val))`          | WIRED  | documentUrl schema blocks non-http(s) protocols at server boundary |
| policy-table.tsx Zod schema   | Client rejection of javascript: | `.refine(/^https?:\/\//i.test(val))`          | WIRED  | Client-side form validates before submit                           |
| policy-table.tsx render       | href anchor                     | `/^https?:\/\//i.test(policy.documentUrl) &&` | WIRED  | Existing bad data in DB won't render as clickable link             |
| session.ts getRequiredSession | AuthSession type                | `return session as unknown as AuthSession`    | WIRED  | Single cast at boundary; all callers receive clean type            |
| getAuditPlanProgress          | engagements                     | `include: { engagements: { select: {...} } }` | WIRED  | Single query includes engagements; N+1 loop eliminated             |
| updateDaysOpenForOpenItems    | ComplianceItem table            | `db.$executeRaw` UPDATE                       | WIRED  | Single SQL updates all open items                                  |

### Requirements Coverage

No requirements were mapped to this phase (non-functional hardening phase).

### Anti-Patterns Found

| File                                  | Line                    | Pattern                                                      | Severity | Impact                                                                                   |
| ------------------------------------- | ----------------------- | ------------------------------------------------------------ | -------- | ---------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------ |
| `src/data-access/compliance-items.ts` | 327-333                 | `_count: true` groupBy result assigned to `number` variables | Warning  | Causes 8 TypeScript errors; runtime behavior correct (value is a number) but type-unsafe |
| `src/data-access/compliance-items.ts` | 16, 39, 73, 105, 109... | `string                                                      | null     | undefined`passed where`string` expected                                                  | Warning | Pre-existing errors surfaced by phase 17-03 as-any removal; 16 TS errors |

### Human Verification Required

None — this phase is entirely non-functional hardening verifiable through code inspection.

## Gaps Summary

One must-have fails: **TypeScript compiles clean**.

There are 238 TS errors in the overall codebase. Of these, 24 are in `src/data-access/compliance-items.ts`, a file modified by phase 17. The errors fall into two categories:

1. **`_count: true` union type errors (lines 327-333)** — 8 errors. In `getComplianceEscalationSummary`, the code uses `_count: true` in `groupBy` (which Prisma types as a complex union), then assigns `group._count` directly to a `number` variable. The fix requires using `_count: { id: true }` and accessing via `group._count.id`. This pattern appears to have been introduced or not properly fixed during phase 17-04's `_count` corrections.

2. **`string | null | undefined` narrowing errors (lines 16-311)** — 16 errors. These were hidden before phase 17 by `(session.user as any).tenantId as string` which suppressed the null. After phase 17-03 changed these to `session.user.tenantId`, the true type (`string | undefined` per Better Auth additionalFields with `required: false`) is now visible. The session type says `tenantId: string` in `AuthSession` but the underlying functions pass the raw session values in some places. These are pre-existing logic issues surfaced by the as-any removal.

The security goals (IDOR prevention, XSS prevention) and performance goals (N+1 elimination) are all fully achieved. Only the TS compilation must-have has a gap.

---

_Verified: 2026-02-19T17:43:35Z_
_Verifier: Claude (gsd-verifier)_
