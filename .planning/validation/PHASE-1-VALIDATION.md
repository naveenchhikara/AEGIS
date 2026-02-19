# Phase 1 (Core Audit Domain) — Validation (R1–R28)

Validated against actual code in `src/` + Prisma schema + seed data.

Legend:

- ✅ PASS = implemented end-to-end (schema/DAL/actions/UI as applicable)
- ⚠️ PARTIAL = present but incomplete (stub UI, missing configurability, or wiring issues)
- ❌ FAIL = requirement not met (missing/incorrect behavior or seed counts don’t match)

---

R1: ✅ PASS | `Role` enum includes `LEAD_AUDITOR`, `FIELD_AUDITOR`, `BRANCH_HEAD` (schema) and RBAC/permission checks use multi-role arrays (`src/lib/permissions.ts`).

R2: ⚠️ PARTIAL (schema only) | `Zone` model + `Branch.zoneId` relation exist (`prisma/schema.prisma`), but no seed data + no DAL/actions/UI found to create/manage zones or assign branches to zones (only downstream UI references like analytics).

R3: ✅ PASS | `Branch` extended with RAM-relevant metadata (`zoneId`, `category`, `businessSize`, `staffStrength`, `ramScore`, `auditFrequency`, `lastAuditDate`, `lastAuditRating`) in schema and consumed in profiling/plan logic (e.g., `src/data-access/pre-audit-profiling.ts`, `src/data-access/audit-plans.ts`).

R4: ✅ PASS | `RamParameterConfig` exists and seed imports **19** params from `src/data/seed/ram-parameters.json` (verified length=19) into `ramParameterConfig` (`prisma/seed.ts`).

R5: ✅ PASS | `RamAssessment` model exists (schema) + server actions for create/compute/approve are implemented with Zod validation and tenant-scoped Prisma (`src/actions/ram/*`, `src/data-access/ram.ts`).

R6: ✅ PASS | `RamAssessmentScore` model exists + score persistence uses upsert with Zod validation and `prismaForTenant` (`src/actions/ram/save-scores.ts`).

R7: ✅ PASS | RAM engine implemented (`src/lib/ram-engine.ts`) and used by compute action (`src/actions/ram/compute-assessment.ts`) to compute composite score, risk category, and audit frequency.

R8: ⚠️ PARTIAL (not configurable) | Frequency rule thresholds (\>3.5 → 12m, 2.5–3.5 → 18m, \<2.5 → 24m) are implemented in `deriveAuditFrequency()` but **hard-coded** in `src/lib/ram-engine.ts`; no DB/settings-based configurability found.

R9: ✅ PASS | Annual plan generator exists with preview + commit flow (`src/actions/audit-plans/generate-annual-plan.ts`, `src/data-access/audit-plans.ts`, `src/components/audit-plans/plan-generator.tsx`) and uses RAM + `lastAuditDate` + derived `auditFrequency`.

R10: ✅ PASS | `AuditTeamMember` join model exists with `assignedSections String[]` (schema) + assignment actions validate with Zod and use tenant-scoped Prisma (`src/actions/audit-execution/assign-team.ts`).

R11: ⚠️ PARTIAL (wiring/validation issues) | Schema includes required engagement fields (audit metadata + BH cert fields). However:

- Create engagement flow appears broken/inconsistent: `CreateEngagementSchema` requires fields not present in the UI (`completionDate`) and marks `scheduledStartDate` required while UI treats it optional (`src/actions/audit-execution/schemas.ts`, `src/components/audit-execution/engagement-form.tsx`).
- Engagement header expects `periodStart/periodEnd` but model uses `periodFrom/periodTo`, so displayed audit period may be blank (`src/components/audit-execution/engagement-header.tsx`).

R12: ✅ PASS | Pre-audit profiling page uses real, tenant-scoped DAL aggregations (RAM + last audit + prior findings summary) (`src/data-access/pre-audit-profiling.ts`, `src/app/(dashboard)/pre-audit-profiling/[branchId]/page.tsx`).

R13: ❌ FAIL | Team assignment UI is a stub and section allocation isn’t implemented:

- User picker is hard-coded placeholder (not wired to DB users)
- `assignedSections` always sent as `[]` with no UI to allocate sections
  (`src/components/audit-execution/team-panel.tsx`).

R14: ❌ FAIL (seed/count mismatch) | `ExaminationArea` model exists, but requirement is **25 areas**; seed JSON contains **39** areas (length=39) and initialization/UI will create/show all active areas (`prisma/seed.ts`, `src/data/seed/examination-areas.json`, `src/actions/audit-execution/initialize-sections.ts`, `src/components/audit-execution/section-tabs.tsx`).

R15: ❌ FAIL (seed/count mismatch) | `ExaminationItem` model exists, but requirement is **239 items**; seed JSON contains **568** items (length=568) and seeds them all active (`prisma/seed.ts`, `src/data/seed/examination-items.json`).

R16: ✅ PASS | `AuditExaminationResponse` exists with per-item status/observation + evidence via `Evidence` relation; submit action validates with Zod + tenant scoping and UI renders/updates real data (`src/actions/audit-execution/submit-examination-response.ts`, `src/data-access/audit-execution.ts`, `src/components/audit-execution/examination-form.tsx`).

R17: ✅ PASS | NON_COMPLIANT examination responses auto-create (or update) a linked `Observation` inside the same transaction (`src/actions/audit-execution/submit-examination-response.ts`).

R18: ✅ PASS | `AuditSectionInstance` model exists and sections are initialized from active areas (idempotent) with Zod validation + tenant scoping; UI uses real section instances for tab navigation (`src/actions/audit-execution/initialize-sections.ts`, `src/components/audit-execution/section-tabs.tsx`).

R19: ✅ PASS | `CashCheck` model matches required fields and cash verification is implemented end-to-end with Zod validation + tenant scoping + denomination + ATM JSON capture (`src/actions/audit-execution/cash-verification.ts`, `src/components/audit-execution/cash-verification-form.tsx`, `src/data-access/cash-verification.ts`).

R20: ⚠️ PARTIAL | `LoanReview` model exists and create/update actions use Zod + tenant scoping, but **deleteLoanReview** does not use Zod validation (accepts raw `{id, engagementId}`) (`src/actions/audit-execution/loan-review.ts`).

R21: ✅ PASS | `SmaNpaEntry` model exists (summary per engagement) + UI saves via action with Zod validation + tenant scoping (`src/actions/audit-execution/sma-npa.ts`, `src/components/audit-execution/sma-npa-summary.tsx`).

R22: ❌ FAIL (depends on R14) | Section-based execution UI exists, but it will render **N tabs = active ExaminationAreas**. With current seed (39 areas), this does not meet the “25 functional area tabs” requirement (`src/components/audit-execution/section-tabs.tsx`).

R23: ✅ PASS | Per-item response form supports status + observation + risk rating + evidence upload/listing (real DB + S3) (`src/components/audit-execution/examination-form.tsx`, `src/actions/audit-execution/upload-examination-evidence.ts`).

R24: ✅ PASS | Cash verification form captures denomination-level breakdown and computes totals/difference; server action upserts and stores JSON fields (`src/components/audit-execution/cash-verification-form.tsx`, `src/actions/audit-execution/cash-verification.ts`).

R25: ✅ PASS | Loan review UI + bulk CSV import implemented with Zod validation and tenant scoping (`src/app/(dashboard)/audit-execution/[id]/loan-review/page.tsx`, `src/actions/audit-execution/import-loan-csv.ts`).

R26: ✅ PASS | BH Certificate sign + countersign workflow implemented with role checks, Zod validation, tenant scoping, and UI workflow (`src/actions/audit-execution/bh-certificate.ts`, `src/app/(dashboard)/audit-execution/[id]/bh-certificate/page.tsx`).

R27: ✅ PASS | Evidence model supports attachments on examination responses (and observations) and upload/download actions use tenant scoping (`prisma/schema.prisma` Evidence model; `src/actions/audit-execution/upload-examination-evidence.ts`).

R28: ❌ FAIL | Seed data does not match required counts:

- RAM params: ✅ 19 (OK)
- Exam areas: ❌ 39 (expected 25)
- Exam items: ❌ 568 (expected 239)
  (verified via `node` JSON length counts; seeded in `prisma/seed.ts`).

---

## Notable cross-cutting issues (impact Phase 1 usability)

1. **Audit engagement creation likely blocked** due to schema/UI mismatch (`CreateEngagementSchema` vs `EngagementForm`).
2. **Team assignment is not functional** (no real user list; no section allocation UI).
3. **Exam framework counts don’t match requirements**, and the UI will reflect the seeded counts (39 areas / 568 items), causing requirement drift.
