# Plan 01: IDOR Tenant Isolation — Add tenantId to all UPDATE/DELETE WHERE clauses

---

wave: 1
depends_on: []
files_modified:

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
  autonomous: true
  requirements: []

---

## Objective

Fix all IDOR (Insecure Direct Object Reference) vulnerabilities where UPDATE and DELETE operations use only `{ id }` in the WHERE clause without `tenantId`, allowing potential cross-tenant data mutation.

## Context

Security audit identified 18 DAL functions and 14 action-layer operations that lack `tenantId` in their WHERE clauses for mutations. While `prismaForTenant()` provides a defense layer, the explicit WHERE clause is the documented security invariant. Two previously-reported issues (manage-calendar.ts, manage-templates.ts) are already fixed.

## Tasks

<task id="1.1">
**Fix governance.ts DAL — 7 functions**

In `src/data-access/governance.ts`, add `tenantId` to the WHERE clause for these functions:

1. `updatePolicyDocument` (~line 82): Change `where: { id: policyId }` → `where: { id: policyId, tenantId }`
2. `deletePolicyDocument` (~line 92): Change `where: { id: policyId }` → `where: { id: policyId, tenantId }`
3. `updateCommittee` (~line 212): Change `where: { id: committeeId }` → `where: { id: committeeId, tenantId }`
4. `removeCommitteeMember` (~line 245): CommitteeMember may not have direct tenantId column — use `deleteMany` with a join condition or verify ownership via parent committee's tenantId first
5. `updateCommitteeMemberRole` (~line 258): Same as above — verify via parent committee
6. `updateCommitteeMeeting` (~line 355): Change `where: { id: meetingId }` → `where: { id: meetingId, tenantId }`
7. `updateHousekeepingMetric` (~line 448): Change `where: { id: metricId }` → `where: { id: metricId, tenantId }`

For models without a direct `tenantId` column (e.g., CommitteeMember), use `deleteMany`/`updateMany` with a relation filter:

```typescript
await db.committeeMember.deleteMany({
  where: { id: memberId, committee: { tenantId } },
});
```

</task>

<task id="1.2">
**Fix users.ts DAL — 2 functions**

In `src/data-access/users.ts`:

1. `updateUserRoles` (~line 67): Change `where: { id: userId }` → `where: { id: userId, tenantId }`
2. `getUserById` (~line 35): Add tenantId parameter and change `where: { id: userId }` → `where: { id: userId, tenantId }` — this is read-only info disclosure but should still be fixed
   </task>

<task id="1.3">
**Fix compliance-management.ts DAL — 2 functions**

In `src/data-access/compliance-management.ts`:

1. `markRequirementNotApplicable` (~line 63): The update already has a prior findFirst check, but add `tenantId` to the update WHERE for belt-and-suspenders
2. `revertRequirementNotApplicable` (~line 81): Same fix

Also: this file uses raw `prisma` instead of `prismaForTenant` — switch to `prismaForTenant(tenantId)` for all operations.
</task>

<task id="1.4">
**Fix concurrent-audit.ts DAL — 2 functions**

In `src/data-access/concurrent-audit.ts`:

1. `updateConcurrentAuditTemplate` (~line 83): Add `tenantId` to WHERE
2. `deleteConcurrentAuditTemplate` (~line 99): Add `tenantId` to WHERE
   </task>

<task id="1.5">
**Fix regulatory.ts DAL — 1 function**

In `src/data-access/regulatory.ts`:

1. `updateRegulatoryObservation` (~line 109): Add `tenantId` to WHERE
   </task>

<task id="1.6">
**Fix investment.ts DAL — 4 functions**

In `src/data-access/investment.ts`:

1. `updateInvestmentRecord` (~line 92): Add `tenantId` to WHERE
2. `updateApplication` (~line 254): Add `tenantId` to WHERE
3. `updateVendorRiskAssessment` (~line 370): Add `tenantId` to WHERE
4. `updateIsAuditChecklist` (~line 466): Add `tenantId` to WHERE
   </task>

<task id="1.7">
**Fix action-layer mutations that bypass DAL**

Several server actions perform direct Prisma operations inside `$transaction` callbacks, bypassing the DAL:

1. `src/actions/governance/manage-policy.ts` (~lines 78, 155): Add `tenantId` to `tx.policyDocument.update/delete` WHERE
2. `src/actions/governance/manage-committee.ts` (~lines 86, 222, 285): Add `tenantId` to `tx.committee.update`, `tx.committeeMember.delete`, `tx.committeeMeeting.update` WHERE
3. `src/actions/housekeeping/manage-metric.ts` (~line 53): Add `tenantId` to `tx.housekeepingMetric.update` WHERE
4. `src/actions/regulatory/manage-observation.ts` (~line 73): Add `tenantId` to `tx.regulatoryObservation.update` WHERE
5. `src/actions/regulatory/submit-atr.ts` (~lines 77, 122): Add `tenantId` to both `findUnique` and `update` WHERE
6. `src/actions/concurrent-audit/manage-template.ts` (~lines 80, 156): Add `tenantId` to `tx.concurrentAuditTemplate.update/delete` WHERE
7. `src/actions/investment/manage-records.ts` (~lines 81, 192): Add `tenantId` to `tx.investmentRecord.update` WHERE
8. `src/actions/investment/manage-is-audit.ts` (~lines 124, 215, 305): Add `tenantId` to all 3 update operations
   </task>

<task id="1.8">
**Fix user-invitations.ts — 2 functions**

In `src/actions/user-invitations.ts`:

1. `resendInvitation` (~line 232): The findFirst has tenantId but the update doesn't — add `tenantId` to the update WHERE
2. `revokeInvitation` (~line 274): Same pattern — add `tenantId` to the delete WHERE
   </task>

<task id="1.9">
**Verify: TypeScript compiles, no runtime regressions**

Run `pnpm tsc --noEmit` to verify all changes compile. Check that:

- Models with `tenantId` column use `where: { id, tenantId }`
- Models without direct `tenantId` (e.g., CommitteeMember) use relation filters or `deleteMany`/`updateMany` with parent filtering
- No existing functionality is broken by the tighter WHERE clauses
  </task>

## Verification Criteria

- [ ] Every `update({ where: { id } })` and `delete({ where: { id } })` in the 6 DAL files now includes `tenantId`
- [ ] Every direct `tx.model.update/delete` in the 8 action files now includes `tenantId`
- [ ] `pnpm tsc --noEmit` passes
- [ ] No use of `where: { id: someId }` (without tenantId) remains in UPDATE/DELETE operations across `src/data-access/` and `src/actions/`

## must_haves

- All 18 DAL functions have tenantId in WHERE
- All 14 action-layer mutation operations have tenantId in WHERE
- TypeScript compiles without errors
- Zero cross-tenant mutation paths remain
