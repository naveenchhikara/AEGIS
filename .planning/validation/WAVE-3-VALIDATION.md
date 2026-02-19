# WAVE 3 VALIDATION — commit d6e9ae0 ("Wave 3a/3b/3c")

Validator: subagent `validate-w3`

> Scope: Verify the specific claims in commit **d6e9ae0**.

---

## Wave 3a — Security fixes (tenant scoping / prismaForTenant)

### 1) `src/data-access/analytics.ts` — global prisma → `prismaForTenant`

✅ **VERIFIED**

- File imports `prismaForTenant` and uses `const db = prismaForTenant(tenantId)`.
- Queries are executed through `db.*` and scoped with `where: { tenantId }`.

### 2) `src/actions/admin/manage-calendar.ts` — global prisma → `prismaForTenant`

✅ **VERIFIED**

- Uses `const db = prismaForTenant(user.tenantId)`.
- Delete is tenant-scoped via `db.auditCalendar.deleteMany({ where: { id: eventId, tenantId: user.tenantId } })`.

### 3) `src/actions/regulatory/submit-atr.ts` — `tenantId` added to WHERE

❌ **NOT FIXED** (likely runtime Prisma error)

- Code changed to:
  - `tx.regulatoryObservation.findUnique({ where: { id: observationId, tenantId } })`
  - `tx.regulatoryObservation.update({ where: { id: observationId, tenantId } })`
- In Prisma schema, `RegulatoryObservation` has `id` as the primary key and **no** `@@unique([id, tenantId])` composite unique.
- `findUnique`/`update` require a `WhereUniqueInput`; adding `tenantId` here will not match a unique input shape and will likely throw at runtime.
- **Expected fix pattern:** `findFirst({ where: { id, tenantId } })` and `updateMany({ where: { id, tenantId }, data: ... })` (or pre-check + update by `id`).

### 4) `src/actions/governance/manage-policy.ts` — `tenantId` added to WHERE

❌ **NOT FIXED** (likely runtime Prisma error)

- Code uses:
  - `tx.policyDocument.update({ where: { id: policyId, tenantId } })`
  - `tx.policyDocument.delete({ where: { id: policyId, tenantId } })`
- In Prisma schema, `PolicyDocument` has `id` as the primary key and **no** `@@unique([id, tenantId])`.
- `update`/`delete` require `WhereUniqueInput`; `tenantId` is not part of it.

### 5) `src/actions/governance/manage-committee.ts` — `tenantId` added to WHERE

❌ **NOT FIXED** (multiple issues)

- `tx.committee.update({ where: { id: committeeId, tenantId } })` — invalid for same reason as above (no composite unique `[id, tenantId]`).
- `tx.committeeMember.delete({ where: { id: memberId, tenantId } })` — **CommitteeMember model does not have a `tenantId` field** (tenant scoping must be derived through Committee / Meeting).
- `tx.committeeMeeting.update({ where: { id: meetingId, tenantId } })` — `CommitteeMeeting` has a `tenantId` field, but `update` still requires a `WhereUniqueInput` (typically only `id` unless there’s a composite unique).

### 6) `src/actions/concurrent-audit/manage-template.ts` — `tenantId` added to WHERE

❌ **NOT FIXED** (likely runtime Prisma error)

- `tx.concurrentAuditTemplate.update/delete({ where: { id, tenantId } })`.
- Schema has `id` as primary key and `@@unique([tenantId, scopeArea, name])` but **no** `@@unique([id, tenantId])`.
- `update`/`delete` require `WhereUniqueInput`.

---

## Wave 3b — Zod validation additions

### R20: deleteLoanReview

✅ **VERIFIED**

- `DeleteLoanReviewSchema = z.object({ id: z.string().uuid(), engagementId: z.string().uuid() })` and `safeParse` is used.

### R49: deleteAuditUniverseEntity

✅ **VERIFIED**

- `deleteAuditUniverseEntity(entityId)` now rejects invalid UUID: `z.string().uuid().safeParse(entityId)`.

### R56: assignWorkProgramItem

✅ **VERIFIED**

- Both IDs validated with Zod UUID `safeParse`.

### R61: completeActionPlan + updateActionPlanProgress

✅ **VERIFIED**

- `actionPlanId` validated via Zod UUID `safeParse`.
- `completionPct` range checks present.

### R73: deleteTemplate

✅ **VERIFIED**

- `templateId` validated via Zod UUID `safeParse`.

### R84: deletePolicy

✅ **VERIFIED**

- `policyId` validated via Zod UUID `safeParse`.

### R86: generateInspectionPack(year)

✅ **VERIFIED**

- `YearSchema = z.number().int().min(2000).max(2100)`; validated with `safeParse`.

### R93: markReconciled

✅ **VERIFIED**

- `recordId` validated via Zod UUID `safeParse`.

---

## Wave 3c — Bug fixes

### R99/R101/R103: IS-audit placeholder "current-user-id" → real `userId`

✅ **VERIFIED**

- `grep` finds **no** remaining `current-user-id` occurrences.
- `src/app/(dashboard)/is-audit/page.tsx` passes `userId={session.user.id}` to relevant components.

### R100: Vendor risk `applicationId` UUID fix

✅ **VERIFIED**

- Server action schema in `src/actions/investment/manage-is-audit.ts` now uses:
  - `applicationId: z.string().uuid().optional()`

### R104: tech-control-evidence `Array.isArray` guard

✅ **VERIFIED**

- `src/components/is-audit/tech-control-evidence.tsx` uses:
  - `const items = Array.isArray(checklist.items) ? checklist.items : []`

---

## Also check — Remaining global `prisma` imports (non-tenant-scoped)

Excluding `src/data-access/prisma.ts` itself, there are still direct/base prisma usages:

### `src/actions/*`

- `src/actions/admin/manage-templates.ts` — `import { prisma } from "@/lib/prisma"`
- `src/actions/repeat-findings/detect.ts` — `import { prisma } from "@/lib/prisma"`
- `src/actions/user-invitations.ts` — `import { prisma } from "@/lib/prisma"`

### `src/data-access/*`

- `src/data-access/onboarding.ts` — `import { prisma } from "@/lib/prisma"`
- `src/data-access/users.ts` — `import { prisma, prismaForTenant } from "@/lib/prisma"`
- `src/data-access/compliance-management.ts` — `import { prisma } from "@/lib/prisma"`
- `src/data-access/audit-trail.ts` — `import { prisma } from "@/lib/prisma"`
- `src/data-access/notifications.ts` — dynamic imports:
  - `const { prisma } = await import("@/lib/prisma");` (multiple occurrences)

> Some of these may be intentionally cross-tenant (e.g., cron/notifications), but they are still **global prisma** usages.

---

## Key takeaway

Wave 3a tenant scoping changes were applied in several actions, but **multiple changes appear incorrect for Prisma** because they add `tenantId` into `where` objects for `findUnique`/`update`/`delete` calls without a matching composite unique constraint. These are likely to throw runtime errors and should be corrected (typically by switching to `findFirst` + `updateMany/deleteMany`, or by adding an explicit composite unique in the Prisma schema if that’s the intended design).
