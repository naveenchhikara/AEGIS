# Phase 6 Validation — Specialized Regulatory (R93–R104)

Date: 2026-02-18
Repo: `/root/.openclaw/workspace/AEGIS`
Scope: M17 (Investments/Treasury) + M18 (IS/EDP Audit)

Validation focus (per task):

1. Real implementation (no stubs/mocks)
2. DAL uses `prismaForTenant` (tenant-scoped)
3. UI wired to real data (not `const x: any[] = []`)
4. Server actions validate input with Zod

---

## Results (per requirement)

One-line verdicts (requested format):

- R93: ⚠️ PARTIAL (markReconciled lacks Zod validation; updates rely on RLS-only `where: {id}`)
- R94: ✅ PASS
- R95: ⚠️ PARTIAL (deposit source not wired; UI uses manual deposits)
- R96: ❌ FAIL (save/persistence is TODO)
- R97: ✅ PASS (but `items` JSON shape differs from other checklists)
- R98: ✅ PASS
- R99: ⚠️ PARTIAL (can create checklists, but no item authoring; completion uses non-UUID placeholder)
- R100: ⚠️ PARTIAL (edit path populates applicationId incorrectly; update covers partial fields)
- R101: ⚠️ PARTIAL (items exist; saves create new records; completion placeholder breaks)
- R102: ✅ PASS
- R103: ⚠️ PARTIAL (only ~107 questions vs ~122; completion placeholder breaks; no reload)
- R104: ⚠️ PARTIAL (gap analysis not persisted; can crash if checklist `items` is non-array)

### R93: ⚠️ PARTIAL (reconciliation works, but server action lacks Zod + tenant-safe `where`)

- Evidence:
  - UI: `src/components/investments/sgl-reconciliation.tsx`
  - Page wiring: `src/app/(dashboard)/investments/page.tsx` (uses `getInvestmentRecords`, `getUnreconciledInvestments`)
  - DAL: `src/data-access/investment.ts` (uses `prismaForTenant`)
  - Server action: `src/actions/investment/manage-records.ts` (`markReconciled`)
- Findings:
  - ✅ Real workflow exists: unreconciled list + bulk “Mark Reconciled” + summary metrics.
  - ✅ DAL uses `prismaForTenant`.
  - ❌ `markReconciled(recordId: string)` does **not** validate input with Zod (uuid not checked).
  - ⚠️ `tx.investmentRecord.update({ where: { id: recordId }})` has no explicit `tenantId` predicate (relies on RLS via `prismaForTenant`).

### R94: ✅ PASS (broker 5% analytics + compliance check)

- Evidence:
  - UI: `src/components/investments/broker-analytics.tsx`
  - Page wiring: `src/app/(dashboard)/investments/page.tsx` → `getBrokerConcentration(session, period)`
  - DAL: `src/data-access/investment.ts#getBrokerConcentration` (uses `prismaForTenant`)
  - Compliance check: `src/lib/investment-compliance.ts#checkBrokerConcentration`
  - Enforcement point: `src/actions/investment/manage-records.ts#manageInvestmentRecord` (Zod + calls check)
- Notes:
  - Broker concentration is computed from `faceValue` totals for the period; UI flags ≥4% warning and ≥5% breach.

### R95: ⚠️ PARTIAL (cap logic exists, but deposits are not reliably sourced in UI)

- Evidence:
  - UI: `src/components/investments/non-slr-monitor.tsx`
  - Enforcement point: `src/actions/investment/manage-records.ts#manageInvestmentRecord` → `checkNonSlrCap`
  - Compliance function: `src/lib/investment-compliance.ts#checkNonSlrCap` (reads `housekeepingMetric` `TOTAL_DEPOSITS` if present)
- Findings:
  - ✅ Real cap computation exists (10% of deposits) in server compliance function.
  - ⚠️ If deposit metric missing, compliance function returns warning and cannot compute percentage.
  - ❌ UI uses **manual** `totalDeposits` state (`TODO: fetch from HousekeepingMetric`) and is not period-scoped.

### R96: ❌ FAIL (checklist not persisted; save is TODO)

- Evidence:
  - UI: `src/components/investments/classification-checklist.tsx`
- Findings:
  - ✅ Checklist UI exists with portfolio-derived metrics (e.g., HTM % auto-evidence).
  - ❌ “Save Checklist” is a stub (`alert("Classification checklist saved (integrate with server action)")`).
  - ❌ No server action / DAL persistence for classification audit results.

### R97: ✅ PASS (quarterly certification persisted + history shown)

- Evidence:
  - UI: `src/components/investments/quarterly-certification.tsx`
  - Server actions: `src/actions/investment/quarterly-certification.ts` (Zod validation on submit)
- Findings:
  - ✅ Submits quarterly certification with Zod-validated payload.
  - ✅ Persists to DB (creates `IsAuditChecklist` record with category `INVESTMENT_CERTIFICATION`).
  - ✅ UI loads previous certifications via `getInvestmentCertifications()`.
- Risk note:
  - Certification stores `IsAuditChecklist.items` as an **object** (`{checks, overallOpinion, ...}`) not an array; other IS-audit components assume `items` is an array and may break if they process this record (see R104).

---

### R98: ✅ PASS (ApplicationInventory model + CRUD wired to real DB)

- Evidence:
  - Prisma: `prisma/schema.prisma` → `ApplicationInventory`
  - DAL: `src/data-access/investment.ts#getApplicationInventory/createApplication/updateApplication/getApplicationsPendingDrTest` (uses `prismaForTenant`)
  - UI: `src/components/is-audit/app-inventory-table.tsx`
  - Actions: `src/actions/investment/manage-is-audit.ts#manageApplicationInventory` (Zod)
  - Page wiring: `src/app/(dashboard)/is-audit/page.tsx` (fetches inventory + pending DR)
- Notes:
  - UI supports add/edit and highlights DR overdue based on DAL output.

### R99: ⚠️ PARTIAL (checklist model/actions exist, but UI cannot practically fill/complete)

- Evidence:
  - Prisma: `prisma/schema.prisma` → `IsAuditChecklist`
  - DAL: `src/data-access/investment.ts#getIsAuditChecklists/createIsAuditChecklist/updateIsAuditChecklist` (uses `prismaForTenant`)
  - Action: `src/actions/investment/manage-is-audit.ts#manageIsAuditChecklist` (Zod)
  - UI: `src/components/is-audit/checklist-form.tsx`
- Findings:
  - ✅ Can create a checklist record in DB.
  - ❌ No UI to add checklist items/questions (new checklists are created with `items: []`).
  - ❌ “Mark as Complete” attempts `completedById: "current-user-id"` (not a UUID) → server-side Zod validation will fail.

### R100: ⚠️ PARTIAL (vendor risk tracking works for create; edit path is buggy)

- Evidence:
  - Prisma: `prisma/schema.prisma` → `VendorRiskAssessment`
  - DAL: `src/data-access/investment.ts#getVendorRiskAssessments` (uses `prismaForTenant`)
  - Action: `src/actions/investment/manage-is-audit.ts#manageVendorRiskAssessment` (Zod)
  - UI: `src/components/is-audit/vendor-risk-panel.tsx`
- Findings:
  - ✅ UI displays real assessments and computes alerts (expiring/expired contracts, avg SLA).
  - ❌ Edit form populates `applicationId` with `editingAssessment.application?.appName` (string) instead of UUID → update submissions can fail Zod.
  - ⚠️ Update action doesn’t update `vendorName/applicationId/contractStart` (only a subset of fields).

### R101: ⚠️ PARTIAL (CBS parameter items exist; save creates records but no load/complete)

- Evidence:
  - UI: `src/components/is-audit/cbs-parameter-audit.tsx` (interest rates, product masters, privileges, etc.)
  - Action: `src/actions/investment/manage-is-audit.ts#manageIsAuditChecklist` (Zod)
- Findings:
  - ✅ Checklist items are implemented in code.
  - ⚠️ Save calls `manageIsAuditChecklist` without `checklistId`, so repeated saves create multiple records (no “resume/edit existing”).
  - ❌ Completion uses `completedById: "current-user-id"` (not UUID) → completion will fail.

### R102: ✅ PASS (IS_AUDITOR role present + access enforced)

- Evidence:
  - Role enum: `prisma/schema.prisma` / generated enums
  - Permissions: `src/lib/permissions.ts` includes `IS_AUDITOR`
  - Route guard: `src/app/(dashboard)/is-audit/page.tsx` (requires `IS_AUDITOR` or `admin:system`)
  - Actions: `src/actions/investment/manage-is-audit.ts` + `src/actions/investment/manage-records.ts` include IS_AUDITOR checks

### R103: ⚠️ PARTIAL (cyber checklist exists but not 122 questions + completion bug)

- Evidence:
  - UI: `src/components/is-audit/cyber-security-checklist.tsx`
  - Action: `src/actions/investment/manage-is-audit.ts#manageIsAuditChecklist` (Zod)
- Findings:
  - ✅ Implements 25 baseline controls with questionnaire UI and gap summary.
  - ❌ Count mismatch: control questions in code total **~107** (requirement calls out ~122).
  - ⚠️ Save creates new records (no loading of previously saved responses).
  - ❌ Completion uses `completedById: "current-user-id"` (not UUID) → completion will fail.

### R104: ⚠️ PARTIAL (gap analysis UI exists, but no persistence; can crash on non-array items)

- Evidence:
  - UI: `src/components/is-audit/tech-control-evidence.tsx`
  - Page wiring: `src/app/(dashboard)/is-audit/page.tsx` passes `checklists` from DAL
- Findings:
  - ✅ Builds gap list + matrix + CSV export from real `IsAuditChecklist` data.
  - ❌ Evidence/remediation fields are only client-state; no server action to persist remediation plan/target date/owner/evidence status.
  - ❌ Potential runtime crash: component assumes `checklist.items` is an array (`checklist.items.forEach`). Investment certification (R97) stores `items` as an object, which can break this tab if such records exist in DB.

---

## Cross-cutting issues observed

1. **Tenant-safe updates**: multiple DAL/actions use `update({ where: { id } })` without `tenantId` in predicate.
   - Examples: `src/actions/investment/manage-records.ts`, `src/actions/investment/manage-is-audit.ts`, `src/data-access/investment.ts`.
   - This relies on Postgres RLS (via `prismaForTenant`) rather than explicit tenant filtering.

2. **UI placeholders break completion flows**:
   - `completedById: "current-user-id"` appears in multiple IS-audit components and will fail server-side Zod (`uuid`) validation.

3. **Cache invalidation paths**:
   - Some actions call `revalidatePath` with routes that don’t match the dashboard URLs (may be harmless due to `router.refresh()`, but is inconsistent).
