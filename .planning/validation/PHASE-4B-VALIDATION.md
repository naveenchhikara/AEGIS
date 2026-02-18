# RBIAS Phase 4b (R81–R92) — Validation

Repo: `/root/.openclaw/workspace/AEGIS`

Validation focus (per instructions):
- Real implementation vs stubs
- `prismaForTenant` / tenant-scoping
- UI wired to real data
- Zod validation (especially for server actions)

---

## Results

### R81: ✅ PASS
**ACB workspace dashboard**
- Implemented as server component using real DB aggregations.
- Tenant-scoped via `getAcbDashboardData(session)` → `prismaForTenant(tenantId)`.
- UI renders live counts (critical observations, overdue items, audits completed) + risk metrics with branch names.

Evidence:
- `src/components/governance/acb-workspace.tsx`
- `src/data-access/governance.ts` → `getAcbDashboardData()`

---

### R82: ⚠️ PARTIAL (implemented but not wired to reachable UI)
**ACB agenda builder / quarterly pack generation**
- Server action is solid: permission check + Zod validation + `prismaForTenant` + transactional write + audit context.
- However, the UI component that calls it (`AcbAgendaBuilder`) is **not rendered anywhere** in app routes; the only visible button in ACB workspace links to `#agenda-builder` (no route/anchor).

Evidence:
- Action: `src/actions/governance/build-acb-agenda.ts` (Zod ✅, `prismaForTenant` ✅)
- UI: `src/components/governance/acb-agenda-builder.tsx` (calls action)
- Missing wiring: `src/app/(dashboard)/governance/page.tsx` imports `AcbAgendaBuilder` but never renders it; `acb-workspace` links to `#agenda-builder`.

---

### R83: ⚠️ PARTIAL (calendar works; mandated logic + scheduling are stubby)
**Board review calendar**
- Calendar UI renders scheduled meetings provided from DB.
- RBI mandated items list is hard-coded.
- Status logic is not accurate: it checks only for committee names containing **"ACB"** for *all* mandated items.
- “Schedule” button for missing items has **no action** wired.

Evidence:
- `src/components/governance/board-review-calendar.tsx`
- Meetings source is real: `src/app/(dashboard)/governance/page.tsx` → `getCommitteeMeetings(session)`

---

### R84: ⚠️ PARTIAL (meeting tracker exists; limited tracking/editing)
**Meeting tracker (committees + meetings)**
- Real committee + meeting CRUD exists with Zod validation and `prismaForTenant`.
- UI supports: create/edit committee; schedule meetings; view recent meetings + statuses.
- Gaps:
  - No UI to update meeting status (COMPLETED/CANCELLED), minutes reference, agenda items, attendees.
  - Member management actions exist but aren’t surfaced in UI.

Evidence:
- UI: `src/components/governance/committee-panel.tsx` (Zod on forms ✅)
- Actions: `src/actions/governance/manage-committee.ts` (Zod ✅, `prismaForTenant` ✅)
- Data: `src/data-access/governance.ts` → `getCommittees`, `getCommitteeMeetings` (`prismaForTenant` ✅)

---

### R85: ⚠️ PARTIAL (aggregation works; UI not aligned to real schema)
**RBI inspection pack generation (9-component pack)**
- Server action performs real aggregation of 9 datasets with `prismaForTenant` and permission gating.
- Major wiring issue: UI tables reference **non-existent fields** vs actual Prisma models (e.g., `ram.riskScore`, `obs.targetDate`, `risk.riskScore`, `kri.kriName`, `regObs.branch`, etc.). This will render blank/incorrect data even though the action returns real records.
- No Zod validation on the `year` input.

Evidence:
- Action: `src/actions/governance/generate-inspection-pack.ts` (`prismaForTenant` ✅, Zod ❌)
- UI: `src/components/governance/rbi-inspection-pack.tsx` (field-name mismatches with `schema.prisma`)

---

### R86: ❌ FAIL (no export / deliverable pack artifact)
**Inspection pack export / deliverable generation**
- UI “Export PDF” and “Export XLSX” buttons are present but **disabled**.
- No server implementation exists to generate/export a consolidated pack artifact (PDF/XLSX/ZIP) for download.

Evidence:
- `src/components/governance/rbi-inspection-pack.tsx` (export buttons disabled)

---

### R87: ⚠️ PARTIAL (dashboard exists; capture pipeline incomplete)
**Risk MIS dashboards**
- `RiskMisDashboard` is implemented and consumes live `housekeepingMetric` data.
- But the capture UI only supports 4 metric types (INTER_BRANCH/SUSPENSE/CLEARING/SUNDRY), while dashboard expects additional types (CRAR_TOTAL, GROSS_NPA, SLR_MAINTAINED, etc.).
- Result: large parts of the dashboard will permanently show “Data Not Available” unless those metricTypes are injected by non-UI means.

Evidence:
- Dashboard: `src/components/housekeeping/risk-mis-dashboard.tsx`
- Capture UI restriction: `src/components/housekeeping/metrics-capture-form.tsx` (metricType enum limited)
- Action allows any string metricType (so the limitation is UI-only): `src/actions/housekeeping/manage-metric.ts` (Zod ✅)
- Data access tenant-scoped: `src/data-access/governance.ts` → `getHousekeepingMetrics()` (`prismaForTenant` ✅)

---

### R88: ⚠️ PARTIAL (monitor exists; no way to enter data via UI)
**Inter-bank exposure monitor**
- Monitor logic exists (limit calculations, breach/warning states) using real `housekeepingMetric` data.
- But it depends on metricType `INTERBANK_EXPOSURE`, which cannot be entered via current Metrics Capture UI.
- Net worth is local state only (not persisted).

Evidence:
- `src/components/housekeeping/interbank-exposure-monitor.tsx`
- Capture UI metricType enum excludes `INTERBANK_EXPOSURE`: `src/components/housekeeping/metrics-capture-form.tsx`

---

### R89: ❌ FAIL (no regulatory reporting templates in scope)
**Regulatory reporting templates**
- No governance/housekeeping UI or actions found implementing “regulatory reporting templates” (create/version/select/apply) for RBIAS Phase 4b.
- Existing `ReportTemplate` usage is generic and not regulatory-focused.

Evidence:
- No matching implementation under:
  - `src/components/governance/`
  - `src/actions/governance/`
  - `src/components/housekeeping/`

---

### R90: ❌ FAIL (templates not applied to reporting)
**Template-driven regulatory report generation**
- `/reports` page lists active templates but the “Use” button is inert; `selectedTemplate` state is unused.
- Template CRUD exists in `src/actions/admin/manage-templates.ts` but there is no corresponding `/admin/templates` UI route; also uses `prisma` instead of `prismaForTenant`.

Evidence:
- UI: `src/components/reports/report-generator.tsx` (templates display only; no wiring)
- Data access: `src/data-access/analytics.ts` → `getReportTemplates()` (uses `prisma`, not `prismaForTenant`)
- Admin action (not wired): `src/actions/admin/manage-templates.ts`

---

### R91: ⚠️ PARTIAL (exists elsewhere; not in housekeeping/governance module)
**Branch-level compliance dashboard**
- Branch-level compliance status summary **does exist** as part of Pre-Audit Branch Profiling (grouped compliance status for a branch) using real DB aggregations + `prismaForTenant`.
- But there is **no dedicated branch-level compliance dashboard** surfaced under Governance/Housekeeping as implied by Phase 4b scope.

Evidence:
- `src/data-access/pre-audit-profiling.ts` → `getBranchProfileData()` (`prismaForTenant` ✅)
- `src/components/pre-audit/branch-profile.tsx` (renders per-branch compliance status)
- Route: `src/app/(dashboard)/pre-audit-profiling/[branchId]/page.tsx`

---

### R92: ❌ FAIL (missing dedicated branch compliance dashboard + workflows)
**Branch compliance dashboard (drilldowns/alerts/workflows)**
- No additional Phase 4b-specific branch compliance dashboard module found (e.g., branch-wise compliance trends, overdue/aging at branch level, escalations, export, etc.) in the specified Governance/Housekeeping areas.

---

## Key Gaps to Address (summary)
- ACB agenda builder exists but is not reachable from UI/routes.
- RBI inspection pack UI is largely not aligned to real Prisma fields; export not implemented.
- Risk MIS + interbank exposure monitoring lack capture/UI paths for required metricTypes.
- Regulatory reporting templates are not implemented in governance scope; existing template listing is not functional.
- Branch-level compliance dashboard exists only as part of pre-audit profiling, not as a dedicated Phase 4b module.
