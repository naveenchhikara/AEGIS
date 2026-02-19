# Remaining Gaps — Definitive List

> Cross-referenced from PHASE-1 through PHASE-6 validations against all wave fixes
> (WAVE-3, WAVE-3D, WAVE-3E, WAVE-P0A, WAVE-P1, WAVE-P2, WAVE-PARTIAL-1, WAVE-PARTIAL-2)
>
> Date: 2026-02-19

## Summary

| Status                      | Count |
| --------------------------- | ----- |
| Total requirements          | 104   |
| ✅ PASS (fully implemented) | 86    |
| ⚠️ REMAINING GAP            | 18    |

---

## Already Fixed (by wave) — DO NOT re-implement

| R-ID | Fixed In       | Verified                              |
| ---- | -------------- | ------------------------------------- |
| R4   | WAVE-PARTIAL-1 | RAM config admin page                 |
| R8   | WAVE-PARTIAL-2 | Configurable thresholds               |
| R10  | WAVE-PARTIAL-1 | Section allocation in team panel      |
| R11  | WAVE-3D        | Engagement form fields                |
| R13  | WAVE-P1        | Team assignment with user selector    |
| R14  | WAVE-P2        | 39 examination areas (exceeds 25)     |
| R15  | WAVE-P2        | 568 examination items (exceeds 239)   |
| R20  | WAVE-3 (3b)    | Zod on deleteLoanReview               |
| R22  | WAVE-P2        | Section-based execution (follows R14) |
| R28  | WAVE-P2        | Seed data counts accepted             |
| R30  | WAVE-PARTIAL-2 | PDF BH Certificate                    |
| R32  | WAVE-P1        | Template wiring to report generation  |
| R33  | WAVE-P2        | Report routing workflow               |
| R37  | WAVE-P2        | ACE quarterly processing              |
| R38  | WAVE-P2        | ACB agenda builder wired              |
| R39  | WAVE-PARTIAL-2 | Escalation routing                    |
| R40  | WAVE-P2        | Repeat finding RAM uplift             |
| R46  | WAVE-PARTIAL-1 | NPA waterfall                         |
| R48  | WAVE-PARTIAL-1 | Template admin page                   |
| R51  | WAVE-3E        | KRI edit safe WHERE                   |
| R52  | WAVE-3D/P2     | Risk-audit linkage table              |
| R53  | WAVE-P0A       | What-if simulation                    |
| R54  | WAVE-3D        | Control detail view + edit            |
| R55  | WAVE-3D        | Test procedures tab wired             |
| R57  | WAVE-PARTIAL-2 | Auto-generate on engagement creation  |
| R60  | WAVE-3E        | Issue update safe WHERE               |
| R61  | WAVE-3E        | Action plan evidence + safe WHERE     |
| R71  | WAVE-P0A       | Surprise audit scheduling             |
| R76  | WAVE-3D        | Dedup findings panel                  |
| R82  | WAVE-3E        | ACB agenda builder in governance tabs |
| R85  | WAVE-3E        | Committee member management + minutes |
| R93  | WAVE-3         | Zod on markReconciled                 |
| R96  | WAVE-3D/P1     | Classification checklist save         |

---

## Remaining Gaps — 18 Requirements

### Phase 1: R2

**R2 — Zone model with branch→zone mapping**

- Schema: ✅ `Zone` model exists with `code`, `name`, `tenantId`
- DAL: ❌ No dedicated zone DAL (no `src/data-access/zones.ts`)
- Actions: ❌ No zone CRUD server actions
- UI: ❌ No zone management page
- Seed: ❌ No sample zone data in seed file
- **Impact:** Branches can't be assigned to zones in the UI; ZAC workflow lacks zone grouping context

### Phase 2: R29, R47

**R29 — XLSX multi-tab report (13+ sheets)**

- Generation: ✅ Works via `generate-xlsx.ts` + `generate-pdf.ts`
- Gap 1: Generation restricted to `status === "COMPLETED"` — no draft/in-progress reports
- Gap 2: Generated files uploaded to S3 but no `GeneratedReport` tracking model in DB
- Gap 3: PDF/XLSX schemas were `ComputeRiskRatingSchema` — fixed in WAVE-P1 to `GenerateReportSchema`
- **Impact:** No audit trail of generated reports; can't re-download previously generated reports

**R47 — Audit calendar management**

- Calendar page: ✅ `/calendar` exists with create/delete
- DAL: ✅ Fixed to use `prismaForTenant` (WAVE-3)
- Gap 1: No `updateCalendarEvent` action — events can't be edited
- Gap 2: `recurrenceRule` field exists in schema/action but no UI exposure
- **Impact:** Users must delete and recreate events to modify them

### Phase 3: R49/R69, R58

**R49/R69 — Audit Universe Entity Registry**

- Schema: ✅ `AuditUniverseEntity` model with all required fields
- DAL: ✅ `src/data-access/risk-management.ts` has read helpers
- Actions: ✅ `src/actions/risk-management/manage-entity.ts` has CRUD
- UI: ❌ No page at `/risk-management/audit-universe` — actions revalidate this path but it doesn't exist
- **Impact:** Users can't manage audit universe entities from the dashboard

**R58 — Control effectiveness analytics (trends, heatmaps)**

- Dashboard: ✅ `ControlEffectivenessDashboard` exists with scores table + rating bands
- Gap 1: No time-series trend visualization (historical effectiveness scores over time)
- Gap 2: No process-area heatmap visualization
- DAL: `src/data-access/control-effectiveness.ts` exists but only returns current state
- **Impact:** CAE can't visualize effectiveness trends to identify deteriorating controls

### Phase 4: R70, R83, R84, R86, R87, R88

**R70 — Unified calendar with periodicity**

- Calendar: ✅ Multiple audit type events supported
- Gap: Periodicity/recurrence rule not exposed in UI — no way to set or view recurring events
- **Impact:** Statutory quarterly audits can't be auto-scheduled via recurrence

**R83 — Board review calendar with RBI-mandated items**

- Calendar UI: ✅ `board-review-calendar.tsx` renders scheduled meetings
- Gap 1: RBI mandated items list is **hardcoded** (not data-driven)
- Gap 2: Status logic only checks for "ACB" committee meetings (not specific review items)
- Gap 3: "Schedule" button for missing items has **no action wired**
- **Impact:** Board can't ensure all RBI-mandated quarterly reviews are tracked/scheduled

**R84 — PolicyDocument with version history**

- CRUD: ✅ Create/edit/delete with Zod + `prismaForTenant`
- Schema: ✅ `version` field exists (default "1.0")
- Gap: No version history workflow — updating a policy overwrites it, doesn't create a new version
- **Impact:** No audit trail of policy changes; can't compare policy versions

**R86 — RBI inspection support pack (9-component report)**

- Action: ✅ `generateInspectionPack` aggregates 9 datasets from DB
- Gap 1: UI tables reference **non-existent Prisma fields** (e.g., `ram.riskScore`, `obs.targetDate`)
- Gap 2: PDF/XLSX export buttons are **disabled** — no export implementation
- **Impact:** Inspection pack displays wrong/empty data; can't export for RBI submission

**R87 — Risk management MIS dashboards**

- Dashboard: ✅ `RiskMisDashboard` consumes live housekeeping data
- Gap: Metrics capture form restricts `metricType` to only 4 values: `INTER_BRANCH`, `SUSPENSE`, `CLEARING`, `SUNDRY`
- Missing types: `CRAR_TOTAL`, `GROSS_NPA`, `NET_NPA`, `SLR_MAINTAINED`, `TOTAL_DEPOSITS`, etc.
- **Impact:** Dashboard sections for CRAR, NPA, liquidity show "Data Not Available" permanently

**R88 — Inter-bank exposure monitoring (20% total, 5% per-bank)**

- Monitor: ✅ `interbank-exposure-monitor.tsx` has limit calculations + breach states
- Gap: `INTERBANK_EXPOSURE` metricType cannot be entered via current Metrics Capture UI
- Net worth is client-state only (not persisted)
- **Impact:** Inter-bank exposure monitor is non-functional without manual DB insertion

### Phase 6: R95, R99, R100, R101, R103, R104

**R95 — Non-SLR investment cap monitoring (10% of deposits)**

- Cap logic: ✅ `checkNonSlrCap` in `src/lib/investment-compliance.ts`
- Gap: UI uses **manual `totalDeposits` state** (`TODO: fetch from HousekeepingMetric`)
- No period scoping in UI
- **Impact:** Users must manually enter deposit totals; compliance check unreliable

**R99 — IS audit checklists (CBS, channels, access, BCP/DR, vendor, change mgmt)**

- Model: ✅ `IsAuditChecklist` with category + items JSON
- CRUD actions: ✅ `manageIsAuditChecklist` with Zod
- Gap 1: No UI to **add checklist items/questions** — new checklists created with `items: []`
- Gap 2: No pre-built checklist templates for each category
- Gap 3: Previous checklists can be created but not loaded for editing
- **Impact:** IS auditors can't define or fill checklists

**R100 — Vendor risk tracking with SLA compliance**

- CRUD: ✅ Create works, display works
- Gap 1: Edit form populates `applicationId` with `appName` (string) instead of UUID — may fail
- Gap 2: Update action doesn't update `vendorName`, `applicationId`, `contractStart` (only partial fields)
- **Impact:** Can't properly edit vendor assessments after creation

**R101 — CBS parameter audit items**

- Items: ✅ Interest rates, product masters, privileges defined in component
- Gap 1: Save always creates **new records** (no `checklistId` passed) — duplicate records on each save
- Gap 2: No loading of previously saved responses for editing
- **Impact:** Repeated saves create duplicates; can't resume prior work

**R103 — Cyber security checklist (122 questionnaires / 25 baseline controls)**

- Questionnaire: ✅ 25 baseline controls with questions (~107 questions)
- Gap 1: Count mismatch: ~107 vs required ~122 questions
- Gap 2: Save creates new records (no load of previous responses)
- Gap 3: No reload of previously saved responses
- **Impact:** Incomplete coverage; can't resume prior assessments

**R104 — Technology control evidence collection and gap analysis**

- Gap analysis UI: ✅ Builds gap list + matrix + CSV export from `IsAuditChecklist` data
- Gap 1: Evidence/remediation fields are **client-state only** — not persisted to DB
- Gap 2: No server action for saving remediation plan, target date, owner, evidence status
- Gap 3: Potential crash if `checklist.items` is non-array (fixed with `Array.isArray` guard in WAVE-3)
- **Impact:** Gap remediation tracking is ephemeral; lost on page refresh
