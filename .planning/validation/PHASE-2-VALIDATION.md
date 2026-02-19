# RBIAS Phase 2 Validation (R29–R48)

Repo: `/root/.openclaw/workspace/AEGIS`

Validator focus (per task):

- **Real implementation vs stubs**
- **DAL tenant scoping via `prismaForTenant`**
- **UI wired to real data (no mocked `const x:any[]=[]`)**
- **Server actions validate input with Zod**

---

## R29: ⚠️ PARTIAL (report generation — draft)

- **Implemented:** PDF/XLSX generation exists via server actions:
  - `src/actions/reports/generate-pdf.ts` (PDF → S3)
  - `src/actions/reports/generate-xlsx.ts` (XLSX → S3)
  - Both pull real data via `getAuditReportData()` (`src/data-access/reports.ts`, uses `prismaForTenant`).
- **Gaps / concerns:**
  - Generation is **restricted to `auditData.status === "COMPLETED"`**, so there is no “draft report” generation during in-progress / review stages.
  - Generated files are **uploaded to S3 but not persisted/linked in DB** (no `GeneratedReport` model; comments explicitly say “future”).
  - Minor schema mismatch: `generate-pdf.ts` and `generate-xlsx.ts` validate with `ComputeRiskRatingSchema` (same shape, but semantically wrong).
- **Tenant scoping:** ✅ via `getAuditReportData(session, engagementId)` → `prismaForTenant`.
- **UI wiring:** ⚠️ `/reports` UI requires manual engagementId entry; not integrated with engagement selection.
- **Zod:** ✅ (safeParse).

## R30: ✅ PASS (report review)

- **Implemented:** Report routing statuses + review step:
  - Zod schema + transitions in `src/actions/reports/schemas.ts`
  - Transition action `src/actions/reports/transition-report.ts`:
    - DRAFT → REVIEWED role-gated
    - Precondition: at least one observation
    - Writes reviewer + timestamp
- **Tenant scoping:** ✅ `prismaForTenant` in transition action.
- **UI wiring:** ✅ `src/app/(dashboard)/audit-execution/[id]/report/page.tsx` loads live status via `getReportStatusForEngagement()` and renders `ReportStatusWorkflow` / `ReportApprovalPanel`.
- **Zod:** ✅.

## R31: ✅ PASS (report finalize / issue)

- **Implemented:** APPROVED → ISSUED transition:
  - Role-gated (CAE) + precondition (BH certificate signed) in `transition-report.ts`.
  - Sets issued-by and issued-at fields.
- **Tenant scoping:** ✅ via `prismaForTenant`.
- **UI wiring:** ✅ same engagement report page workflow.
- **Zod:** ✅.

## R32: ❌ FAIL (templates applied to report generation)

- **What exists:**
  - Template read API: `getReportTemplates(tenantId)` in `src/data-access/analytics.ts`.
  - Admin actions exist to create/deactivate templates: `src/actions/admin/manage-templates.ts`.
  - `/reports` shows templates list (`src/components/reports/report-generator.tsx`).
- **Why fail:**
  - Template selection is **not actually used** to alter PDF/XLSX generation (selectedTemplate state is unused; “Use” button has no handler).
  - No UI route found for template library management (actions revalidate `/admin/templates` but route not present).
  - DAL for templates uses **global `prisma`**, not `prismaForTenant` (`analytics.ts`, `manage-templates.ts`).
- **Tenant scoping:** ⚠️ tenantId is filtered in queries, but not using `prismaForTenant` as required by this validation checklist.
- **Zod:** ⚠️ create uses Zod; `deactivateTemplate(templateId: string)` does **not** validate templateId with Zod.

---

## R33: ✅ PASS (report routing workflow)

- **Implemented:**
  - Status model fields on `AuditEngagement` (reportStatus + reviewed/approved/issued metadata).
  - Allowed transitions incl. send-back loops in `schemas.ts`.
  - Transactional update + audit context in `transition-report.ts`.
- **Tenant scoping:** ✅ `prismaForTenant`.
- **UI wiring:** ✅ workflow UI is live-data driven.
- **Zod:** ✅.

## R34: ⚠️ PARTIAL (status transitions completeness)

- **Implemented:** Core transitions + metadata stamping.
- **Gaps:** No additional workflow artifacts such as:
  - configurable approval chains (per engagement)
  - notification routing on transitions
  - persistence of review comments (comments used only as audit-context justification)

## R35: ⚠️ PARTIAL (approval chain)

- **Implemented:** Role-based gates per transition (`TRANSITION_ROLES`).
- **Gap:** Approval chain is **static** (role list), not a configurable multi-step chain (e.g., named reviewers/approvers, delegation, SLA).

## R36: ✅ PASS (workflow UI + server wiring)

- **Implemented:**
  - UI panels call `transitionReportStatus` and refresh UI.
  - Server action includes preconditions + role checks + audit context.

---

## R37: ✅ PASS (ACE quarterly review)

- **Implemented:**
  - Eligibility logic: `getAceEligibleItems()` in `src/data-access/compliance-items.ts` (tenant-scoped via `prismaForTenant`).
  - Batch tagging to quarter + status update: `processAceQuarterly()` in `src/actions/compliance/ace-processing.ts`.
  - Individual review decisions: `reviewAceItem()` in same file (FORWARD_TO_ACB / MONITOR / CLOSE).
  - UI: `src/app/(dashboard)/compliance/ace/page.tsx` → `AceQuarterlyReview` component uses real data and calls actions.
- **Zod:** ✅.

## R38: ⚠️ PARTIAL (ACB reporting)

- **Implemented:**
  - Consolidation + BoardReport record creation: `src/actions/compliance/acb-reporting.ts` (tenant-scoped, Zod-validated).
  - UI: `src/app/(dashboard)/compliance/acb/page.tsx` → `AcbReportBuilder`.
- **Gaps / concerns:**
  - `generateAcbReport()` **does not generate/upload a PDF**; it only creates a `BoardReport` row with a metrics snapshot.
  - There _is_ a separate PDF board-report generator API route `src/app/api/reports/board-report/route.ts` (renders PDF + uploads to S3 + creates BoardReport), but **UI does not call it**.
  - `getBoardReports()` in `src/data-access/reports.ts` restricts access to `CAE/CCO/CEO`; `/compliance/acb` allows `compliance:acb_report`—role/permission mismatch can lead to “no previous reports” for allowed users.

---

## R39: ⚠️ PARTIAL (escalation automation)

- **Implemented (real logic):**
  - Escalation computation and persistence: `src/actions/compliance/compute-escalation.ts`.
  - Full pipeline creating `NotificationQueue` entries: `src/actions/compliance/run-escalation-job.ts` (uses `computeBatchEscalation` + escalation router + recipient resolution).
  - DAL support: `src/data-access/compliance.ts` and `src/data-access/compliance-items.ts` use `prismaForTenant`.
- **Gaps / concerns:**
  - No visible scheduled/cron wiring shown here (job exists but may not be invoked automatically).
  - `runEscalationJobInternal(tenantId: string)` accepts arbitrary string **without Zod validation** (and `runEscalationJob()` throws on auth failure instead of returning a typed `{success:false}` result).

## R40: ✅ PASS (repeat finding RAM uplift)

- **Implemented (real logic):** `src/actions/ram/compute-assessment.ts`
  - Detects repeat findings via `detectRepeatFindingsForBranch()`
  - Applies uplift via `computeRepeatUplift()` and `computeRamWithUplift()`
  - Persists `rawCompositeScore`, `repeatUpliftApplied`, `repeatFindingCount`
- **Tenant scoping:** ✅ `prismaForTenant`.
- **Zod:** ✅ (`AssessmentIdSchema`).
- **UI:** RAM result UI supports showing uplift flag (`src/components/ram/ram-result-card.tsx`).

---

## R41: ✅ PASS (branch response)

- **Implemented:** `src/actions/compliance/submit-branch-response.ts` + UI `src/components/compliance/branch-response-form.tsx`.
- **Tenant scoping:** ✅ `prismaForTenant`.
- **Zod:** ✅.

## R42: ✅ PASS (ZAC review)

- **Implemented:** `src/actions/compliance/zac-review.ts` + UI `src/components/compliance/zac-review-panel.tsx`.
- **Tenant scoping:** ✅ `prismaForTenant`.
- **Zod:** ✅.

## R43: ✅ PASS (tracking: due dates / escalation / statuses)

- **Implemented:**
  - Data model includes `dueDate`, `daysOpen`, `escalationLevel`, `status`.
  - Escalation jobs compute `daysOpen` + escalation levels.
  - UI table renders live item data: `src/components/compliance/compliance-table.tsx` used by `src/app/(dashboard)/compliance/page.tsx`.

## R44: ⚠️ PARTIAL (end-to-end compliance lifecycle)

- **Implemented path:** OPEN/BRANCH*RESPONSE_DUE → BRANCH_RESPONSE_SUBMITTED → ZAC*\* → ACE_REVIEW → (ACB_REVIEW or CLOSED)
- **Gaps / concerns:**
  - Some statuses appear in queries but aren’t used by actions (e.g., `ZAC_REVIEW` referenced in escalation DAL).
  - No explicit “close after ZAC approved” action found; closure primarily occurs via ACE decision.

---

## R45: ⚠️ PARTIAL (calendar management)

- **Implemented:** `/calendar` page loads events and allows create/delete:
  - Page: `src/app/(dashboard)/calendar/page.tsx`
  - UI: `src/components/calendar/calendar-view.tsx`
  - Actions: `src/actions/admin/manage-calendar.ts`
- **Gaps / concerns:**
  - DAL function `getAuditCalendarEvents()` lives in `src/data-access/analytics.ts` and uses **global `prisma`**, not `prismaForTenant`.
  - `deleteCalendarEvent(eventId: string)` has **no Zod validation** for `eventId`.
  - No update/edit action for events.

## R46: ⚠️ PARTIAL (calendar workflow depth)

- **Implemented:** Basic event type filtering + grouping.
- **Gaps:** Recurrence fields exist in schema/action input (`recurrenceRule`) but **no recurrence expansion/processing** in UI or DAL.

## R47: ⚠️ PARTIAL (audit calendar scheduling)

- **Implemented:** `AuditCalendar` model is used; events are tenant-filtered; create/delete are tenant-scoped.
- **Gap:** Uses global `prisma` rather than `prismaForTenant` in both read (`analytics.ts`) and write (`manage-calendar.ts`).

## R48: ⚠️ PARTIAL (template library)

- **Implemented:** Versioned `ReportTemplate` model + create/deactivate actions.
- **Gaps / concerns:**
  - No discovered UI route to manage templates (actions revalidate `/admin/templates` but route not present).
  - Read path (`getReportTemplates`) uses global `prisma`, not `prismaForTenant`.
  - Templates are displayed on `/reports` but **not applied** to generation (see R32).
