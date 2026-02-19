# WAVE 3D VALIDATION — Category B/C/D + Wave 3a tenant WHERE

Validator: subagent `validate-bcd`

> Scope: Validate requested items by reading source files in `src/`.

---

## Category B — UI Wiring (must be wired to real data)

- **R51 / KRI form dialog wiring:** ⚠️ **PARTIAL**
  - UI: `src/components/risk-management/kri-form-dialog.tsx` calls `manageKRI`.
  - Data: `src/actions/risk-management/manage-risk.ts` implements `manageKRI` (create/update via Prisma).
  - Concern: update path uses `tx.keyRiskIndicator.update({ where: { id, tenantId } })` which is **not a `WhereUniqueInput` shape** in the current Prisma schema (no `@@unique([id, tenantId])`). Create likely works; **edit likely fails at runtime**.

- **R52 / Risk–audit linkage wiring:** ✅ **VERIFIED**
  - UI: `src/components/risk-management/risk-audit-linkage-table.tsx` submits to `manageRiskAuditLinkage`.
  - Action: `src/actions/risk-management/manage-linkage.ts` creates linkage with `tx.riskAuditLinkage.create({ data: { tenantId, ... } })`.
  - Page uses real DAL data: `src/app/(dashboard)/risk-management/page.tsx` loads `getRiskAuditLinkages(session)` and tenant-scoped engagements.

- **R55 / Test procedures tab wired to real DAL:** ✅ **VERIFIED**
  - Page: `src/app/(dashboard)/controls/page.tsx` fetches real data via DAL (`getControls`, `getTestProcedures`).
  - UI: `src/components/controls/test-procedures-tab.tsx` calls `manageTestProcedure`.
  - Action: `src/actions/control-library/manage-control.ts` implements `manageTestProcedure` and persists via Prisma.

- **R57 / Work program generator calls `generateWorkProgram`:** ❌ **NOT FIXED**
  - UI: `src/components/work-program/work-program-generator.tsx` calls `generateWorkProgram`.
  - Action: `src/actions/work-program/generate-program.ts` exists, but starts by calling:
    - `tx.auditEngagement.findUnique({ where: { id: engagementId, tenantId } })`
  - This `where` shape is **not valid** without `extendedWhereUnique` / a composite unique; likely throws at runtime → generator likely unusable.

- **R82 / ACB agenda builder wired into governance tabs:** ❌ **NOT FIXED**
  - Components/action exist:
    - `src/components/governance/acb-agenda-builder.tsx`
    - `src/actions/governance/build-acb-agenda.ts`
  - But **not rendered anywhere**:
    - `src/app/(dashboard)/governance/page.tsx` imports `AcbAgendaBuilder` but does not include it in any `TabsContent`.
    - `AcbWorkspace` has a button linking to `#agenda-builder`, but no matching section exists.

---

## Category C — Stubs removed (real implementations)

- **R76 / Dedup findings panel no longer mocked:** ✅ **VERIFIED**
  - UI: `src/components/concurrent-audit/dedup-findings-panel.tsx` renders from `findings` prop (no hardcoded/mock data).
  - Data: `src/app/(dashboard)/concurrent-audit/page.tsx` populates via `getConcurrentFindingsForDedup(session)`.
  - DAL: `src/data-access/concurrent-audit.ts` queries Prisma and computes similarity/duplicates.

- **R96 / Investment classification checklist save implemented:** ✅ **VERIFIED**
  - UI: `src/components/investments/classification-checklist.tsx` calls `saveClassificationChecklist`.
  - Action exists: `src/actions/investment/save-classification-checklist.ts`.
  - Persists using tenant-scoped lookups (`findFirst` with `tenantId`) + creates/updates `qaSelfAssessment`.

---

## Category D — CRUD completeness

- **R11 / Engagement form has scheduledStartDate + completionDate:** ✅ **VERIFIED**
  - `src/components/audit-execution/engagement-form.tsx` includes both fields in the form.

- **R54 / Control detail view + edit action:** ✅ **VERIFIED**
  - Page: `src/app/(dashboard)/controls/[id]/page.tsx` renders `ControlDetailView`.
  - UI: `src/components/controls/control-detail-view.tsx` uses `updateControl`.
  - Action: `src/actions/control-library/update-control.ts` validates with Zod, verifies tenant ownership via `findFirst({ where: { id, tenantId } })`, then updates by unique `id`.

- **R60 / Issue create/edit includes control + compliance linking fields:** ⚠️ **PARTIAL**
  - Create UI includes fields:
    - `src/components/issues/issues-table.tsx` has **Linked Control** (`controlId`) and **Linked Compliance Item** (`complianceItemId`) selects.
    - Data for selects comes from `src/app/(dashboard)/issues/page.tsx` (tenant-scoped DB queries).
  - Server action supports storing them: `src/actions/issues/manage-issue.ts` includes `controlId` and `complianceItemId`.
  - Gap: **No edit UI** observed (only create). Also update path uses `tx.issue.update({ where: { id, tenantId } })` (likely runtime-invalid).

- **R61 / Action plan has evidence input:** ❌ **NOT FIXED**
  - UI includes evidence input + calls `addActionPlanEvidence`:
    - `src/components/issues/action-plan-panel.tsx`
    - `src/actions/issues/manage-action-plan.ts`
  - But backend uses non-unique `where` shapes:
    - `findUnique({ where: { id: actionPlanId, tenantId } })`
    - `update({ where: { id: actionPlanId, tenantId } })`
  - This is likely **runtime-invalid** with current Prisma schema → evidence/progress updates likely fail.

- **R85 / Committee panel member management + minutes:** ⚠️ **PARTIAL**
  - Committees + meeting scheduling UI exist: `src/components/governance/committee-panel.tsx` + actions in `src/actions/governance/manage-committee.ts`.
  - Gaps in UI wiring:
    - No UI to **add/remove members** (actions `manageCommitteeMember`/`removeCommitteeMember` are imported but unused).
    - No UI to upload/edit **minutesRef**.

---

## Wave 3a — Tenant WHERE unique-input fix

> Requirement: ensure these actions **do not** use `tenantId` inside a Prisma `WhereUniqueInput` (`findUnique`/`update`/`delete` `where`).

- `src/actions/regulatory/submit-atr.ts`: ✅ **VERIFIED** (uses `where: { id }`)
- `src/actions/governance/manage-policy.ts`: ✅ **VERIFIED** (update/delete use `where: { id }`)
- `src/actions/governance/manage-committee.ts`: ✅ **VERIFIED** (update/delete use `where: { id }`)
- `src/actions/concurrent-audit/manage-template.ts`: ✅ **VERIFIED** (update/delete use `where: { id }`)

**Note:** These changes avoid Prisma `WhereUniqueInput` shape errors, but also remove explicit `tenantId` filtering on those operations. If PostgreSQL RLS is not actually enforced, consider the safer pattern: `findFirst({ where: { id, tenantId } })` + `updateMany/deleteMany({ where: { id, tenantId } })`.
