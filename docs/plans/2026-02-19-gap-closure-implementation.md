# Gap Closure Implementation Plan — 18 Remaining Requirements

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close all 18 remaining gaps to reach 104/104 requirements complete.

**Architecture:** 3-wave parallel execution. Each wave dispatches independent agents per task. After each wave, run `tsc --noEmit` and commit atomically. Wave 3 uses a single agent since all 3 tasks edit shared files (`permissions.ts`, `nav-items.ts`).

**Tech Stack:** Next.js 16, TypeScript, Prisma 7, shadcn/ui, ExcelJS, AWS S3 SDK

---

## Wave 1 — Quick Wins (10 parallel tasks)

### Task 1: R100 — Fix Vendor Risk Update Bug

**Files:**

- Modify: `src/actions/investment/manage-is-audit.ts`

**What:** The `manageVendorRiskAssessment()` function's update branch omits `vendorName` and `applicationId` from the data object. Find the update path (where `assessmentId` is provided) and add these two fields.

**Steps:**

1. Read `src/actions/investment/manage-is-audit.ts` fully
2. Find the `manageVendorRiskAssessment` function's update branch (the `else` block when `assessmentId` is present)
3. In the `data: { ... }` object of the `prisma.vendorRiskAssessment.update()` call, add `vendorName: parsed.vendorName` and `applicationId: parsed.applicationId || null`
4. Verify: `tsc --noEmit` passes for this file

---

### Task 2: R101 — Fix CBS Parameter Save/Load Bug

**Files:**

- Modify: `src/components/is-audit/cbs-parameter-audit.tsx`

**What:** Component always creates new DB records (never passes `checklistId`) and never loads existing data on mount.

**Steps:**

1. Read `src/components/is-audit/cbs-parameter-audit.tsx` fully
2. Add a prop `engagementId?: string` to the component
3. Add state: `const [checklistId, setChecklistId] = useState<string | null>(null)`
4. Add a `useEffect` that fetches existing CBS checklist for this engagement on mount. Use a server action or fetch call to get the existing `IsAuditChecklist` where `category="CBS"` and `engagementId` matches. If found, populate the responses state and set `checklistId`
5. In `handleSave()`, pass `checklistId` to `manageIsAuditChecklist()` if it exists (so it updates instead of creates)
6. After successful save, set `checklistId` from the response if it was a create
7. Verify: `tsc --noEmit` passes

---

### Task 3: R103 — Fix Cyber Checklist Save Bug + Add 15 Missing Questions

**Files:**

- Modify: `src/components/is-audit/cyber-security-checklist.tsx`

**What:** Same save/load bug as R101. Plus add 15 missing questions to reach 122 total per RBI Cyber Security Framework.

**Steps:**

1. Read `src/components/is-audit/cyber-security-checklist.tsx` fully
2. Apply the identical save/load fix as Task 2 (R101): add `engagementId` prop, `checklistId` state, `useEffect` load, pass `checklistId` to save
3. Research RBI Cyber Security Framework baseline controls to identify which 15 questions are missing. The current 107 questions span BC01-BC25. Cross-reference with the RBI framework to add missing sub-questions. Distribute the 15 new questions across the controls that have fewer than expected
4. Add the 15 questions to the appropriate `BASELINE_CONTROLS` arrays in the component
5. Verify total question count is 122
6. Verify: `tsc --noEmit` passes

---

### Task 4: R64 — Expand QA Self-Assessment Seed Data

**Files:**

- Modify: `src/data/seed/qa-assessment-seed.json`
- Modify: `prisma/seed.ts` (if needed to reference the expanded seed)

**What:** Expand from 10 IIA IPPF standards to ~50, covering the complete IIA International Professional Practices Framework.

**Steps:**

1. Read `src/data/seed/qa-assessment-seed.json` to see current format (10 records)
2. Research IIA IPPF standards structure:
   - Attribute Standards: 1000-1322
   - Performance Standards: 2000-2600
3. Add ~40 new records following the existing JSON format. Each record needs: `iiaStandard`, `standardTitle`, `description`, `response` (CONFORMING/PARTIAL/NON_CONFORMING), `gapIdentified`, `assessmentYear`
4. Ensure `prisma/seed.ts` imports and inserts all records (check if it already loops over this file)
5. Verify JSON is valid

---

### Task 5: R83 — Seed Board Review Calendar (CommitteeMeeting)

**Files:**

- Modify: `prisma/seed.ts`

**What:** Add seed data for 10 RBI-mandated committee meeting items. The `BoardReviewCalendar` component has a hardcoded `RBI_MANDATED_ITEMS` array — create matching `CommitteeMeeting` records.

**Steps:**

1. Read `src/components/governance/board-review-calendar.tsx` to find the `RBI_MANDATED_ITEMS` constant (10 items)
2. Read `prisma/schema.prisma` for the `CommitteeMeeting` model fields
3. In `prisma/seed.ts`, add a section that creates 10 `CommitteeMeeting` records matching the RBI mandated items: ACB Quarterly, IS Audit Annual, Concurrent Audit Quarterly, RBIA Plan Annual, Risk Policy Annual, KYC/AML Annual, Cyber Security Half-yearly, Investment Policy Annual, Statutory Audit Annual, RBI Inspection As-Needed
4. Each record needs: `committeeId` (reference ACB committee), `title`, `scheduledDate` (spread across FY 2025-26), `meetingType`, `status`, `tenantId`
5. Verify: seed file has no syntax errors

---

### Task 6: R29 — Create Download API Route

**Files:**

- Create: `src/app/api/download/route.ts`

**What:** Create an API route that generates S3 presigned URLs or proxies file downloads for `BoardReport` records.

**Steps:**

1. Read `src/components/reports/generated-reports-list.tsx` to see how download links are formed (the `href` pattern)
2. Read `src/actions/reports/generate-xlsx.ts` to see existing S3 client usage patterns
3. Create `src/app/api/download/route.ts` with a GET handler:
   - Parse `key` from query params
   - Validate session/auth
   - Use `@aws-sdk/s3-request-presigner` to generate a presigned GetObject URL
   - Redirect to the presigned URL (or proxy the stream)
   - Handle missing `key` gracefully (return 404)
4. Import S3 client from existing `@/lib/ses-client.ts` patterns or create inline
5. Verify: `tsc --noEmit` passes

---

### Task 7: R95 — Wire Deposit Auto-Fetch for Non-SLR Monitor

**Files:**

- Modify: `src/app/(dashboard)/investments/page.tsx`
- Modify: `src/components/investments/non-slr-monitor.tsx`

**What:** Replace manual `totalDeposits` input with a DB lookup from `HousekeepingMetric` where `metricCode = "TOTAL_DEPOSITS"`.

**Steps:**

1. Read `src/components/investments/non-slr-monitor.tsx` — find the manual deposit input
2. Read `src/data-access/housekeeping-mis.ts` for existing DAL functions
3. In the investments page, query the latest `HousekeepingMetric` with `metricCode = "TOTAL_DEPOSITS"` and pass its `value` to `NonSlrMonitor` as a `defaultDeposits` prop
4. In the component, use `defaultDeposits` as the initial state value instead of the hardcoded 10 Cr
5. Keep the manual input as an override (user can still adjust)
6. Verify: `tsc --noEmit` passes

---

### Task 8: R99 — IS Checklist Selector + Rating

**Files:**

- Modify: `src/components/is-audit/checklist-form.tsx`

**What:** Add ability to select between multiple checklists of the same category, and expose `overallRating` as a user input.

**Steps:**

1. Read `src/components/is-audit/checklist-form.tsx` fully
2. Add a Select dropdown at the top to choose between existing checklists (query all `IsAuditChecklist` records for the current category)
3. When a checklist is selected, populate the form with its `items` data
4. Add an `overallRating` Select (SATISFACTORY / NEEDS_IMPROVEMENT / UNSATISFACTORY) before the save button
5. Pass `overallRating` to the `manageIsAuditChecklist` action on save
6. Verify: `tsc --noEmit` passes

---

### Task 9: R56 — Add Assign Button to Work Program Table

**Files:**

- Modify: `src/components/work-program/work-program-table.tsx`

**What:** Add an "Assign" action in the work program table that calls the existing `assignWorkProgramItem` action.

**Steps:**

1. Read `src/components/work-program/work-program-table.tsx` fully
2. Read `src/actions/work-program/execute-item.ts` — check if `assignWorkProgramItem` exists
3. Add an "Assign" button/dialog in the table row actions (next to Execute)
4. The dialog should show a dropdown of available team members (from the engagement's team)
5. On submit, call the assign action with the selected `assignedToId`
6. Verify: `tsc --noEmit` passes

---

### Task 10: R62 — Wire Accept Risk Button + Accepted Risks View

**Files:**

- Modify: `src/components/issues/issues-table.tsx`
- Modify: `src/components/issues/action-plan-panel.tsx`
- Modify: `src/app/(dashboard)/issues/page.tsx`

**What:** Add "Accept Risk" button in issues table/panel that calls existing `acceptRisk()` action. Add a filter tab for accepted risks.

**Steps:**

1. Read `src/actions/issues/accept-risk.ts` to understand the `acceptRisk()` signature
2. Read `src/components/issues/issues-table.tsx` — add an "Accept Risk" option in the row actions dropdown menu (only show for issues with `issue:accept_risk` permission)
3. Create a dialog that asks for `acceptanceReason` (min 20 chars) before calling `acceptRisk()`
4. Read `src/components/issues/action-plan-panel.tsx` — add an "Accept Risk" button if the issue status allows it
5. In `src/app/(dashboard)/issues/page.tsx`, add a filter tab for "Accepted Risks" that filters issues where `status = "ACCEPTED_RISK"`
6. Verify: `tsc --noEmit` passes

---

## Wave 2 — Medium Features (5 parallel tasks)

### Task 11: R2 — Zone Management CRUD

**Files:**

- Create: `src/app/(dashboard)/admin/zones/page.tsx`
- Create: `src/actions/admin/manage-zone.ts`
- Create: `src/data-access/zones.ts`
- Modify: `prisma/seed.ts` (add zone seed data)
- Modify: `src/lib/nav-items.ts` (add Zones under Admin — but defer to Wave 3 if touching nav)

**What:** Full Zone CRUD page under Admin. Zones group branches for ZAC workflow.

**Steps:**

1. Read `prisma/schema.prisma` for the `Zone` model fields
2. Create DAL in `src/data-access/zones.ts`: `getZones(tenantId)`, `createZone(...)`, `updateZone(...)`, `deleteZone(...)`
3. Create server actions in `src/actions/admin/manage-zone.ts`: `createZone`, `updateZone`, `deleteZone` — require `admin:manage_settings` permission
4. Create page `src/app/(dashboard)/admin/zones/page.tsx` with a table showing zones, a create dialog, edit/delete actions
5. Follow existing admin page patterns (see `src/app/(dashboard)/admin/branches/page.tsx`)
6. Add 3-4 zone seed records in `prisma/seed.ts` (e.g., "Western Zone", "Eastern Zone", "Central Zone")
7. Verify: `tsc --noEmit` passes

---

### Task 12: R75 — Verify Escalation Dialog Integration

**Files:**

- Modify: `src/app/(dashboard)/concurrent-audit/page.tsx` (if dialog not imported)

**What:** The `IrregularityEscalationDialog` component exists but may not be triggered from the concurrent audit page.

**Steps:**

1. Read `src/app/(dashboard)/concurrent-audit/page.tsx` — check if `IrregularityEscalationDialog` is imported and rendered
2. If NOT imported: import it and add an "Escalate" button in the concurrent audit observation list that opens the dialog
3. If already imported: verify it's properly triggered (has an open state + trigger button). If the button exists, mark R75 as already complete
4. Verify: `tsc --noEmit` passes

---

### Task 13: R47 — Calendar Edit-in-Place + Recurrence Expansion

**Files:**

- Modify: `src/components/calendar/calendar-view.tsx`
- Modify: `src/actions/admin/manage-calendar.ts` (if update action needs changes)

**What:** Allow editing event date/time inline. Expand recurring events to show repeated instances on the calendar grid.

**Steps:**

1. Read `src/components/calendar/calendar-view.tsx` fully
2. Add click-to-edit on calendar events: clicking an existing event opens the event form pre-populated with that event's data (not a new event form). This allows changing the date, recurrence, and other fields
3. Add recurrence expansion logic: when rendering events for a month, expand events with `recurrenceRule` into multiple calendar entries:
   - WEEKLY: repeat every 7 days
   - MONTHLY: repeat on same day each month
   - QUARTERLY: repeat every 3 months
   - SEMI_ANNUAL: repeat every 6 months
   - ANNUAL: repeat every 12 months
4. Render expanded instances with a visual indicator (e.g., dashed border or "recurring" badge)
5. Editing a recurring event should ask "Edit this instance or all?" — for simplicity, always edit the series (the master record)
6. Verify: `tsc --noEmit` passes

---

### Task 14: R63 — Board Consolidated View

**Files:**

- Modify: `src/app/(dashboard)/issues/board/page.tsx`
- Modify: `src/data-access/issues.ts`
- Modify: `src/components/issues/board-view.tsx`

**What:** Aggregate issues + action plans + QA gaps + KRI breaches into a single board-level dashboard.

**Steps:**

1. Read `src/app/(dashboard)/issues/board/page.tsx` and `src/components/issues/board-view.tsx`
2. Read `src/data-access/issues.ts`, `src/data-access/qa-assessment.ts`, `src/data-access/risk-management.ts`
3. In the board page, query additional data:
   - Total open issues by source (internal, regulatory, external)
   - Action plans with overdue items
   - QA gaps (from `QaSelfAssessment` where `gapIdentified = true`)
   - KRI breaches (from `RiskIndicator` where current value exceeds threshold)
4. Pass these aggregations to a summary section above the kanban board
5. Render as stat cards: "Open Issues: X", "Overdue Actions: Y", "QA Gaps: Z", "KRI Breaches: W"
6. Verify: `tsc --noEmit` passes

---

### Task 15: R86 — Inspection Pack XLSX Export

**Files:**

- Modify: `src/actions/governance/generate-inspection-pack.ts`
- Modify: `src/components/governance/rbi-inspection-pack.tsx`

**What:** Enable the "Export XLSX" button on the RBI Inspection Pack page using ExcelJS.

**Steps:**

1. Read `src/actions/governance/generate-inspection-pack.ts` — it already aggregates all 9 components
2. Read `src/lib/excel-export/audit-report-generator.ts` for the existing ExcelJS patterns
3. Create a new function `generateInspectionPackXlsx()` in the generate-inspection-pack action:
   - Create a workbook with tabs for each of the 9 sections (Audit Coverage, RAM Summary, Observations, Compliance, Regulatory ATR, Risk Register, KRI Breaches, Policy Reviews, IS Audit Status)
   - Use the same data already fetched by `generateInspectionPack()`
   - Return the buffer
4. In the component, wire the "Export XLSX" button to call this action, create a Blob, and trigger download
5. Remove the `disabled` attribute from the Export XLSX button
6. Verify: `tsc --noEmit` passes

---

## Wave 3 — Role Scoping (Single agent, sequential)

All 3 tasks modify `src/lib/permissions.ts` and `src/lib/nav-items.ts`. Execute sequentially in one agent.

### Task 16: R89 — IS_AUDITOR Role Scoping

**Files:**

- Modify: `src/lib/permissions.ts`
- Modify: `src/lib/nav-items.ts`

**What:** Add IS-audit-specific permissions and filter IS_AUDITOR nav to only IS-relevant items.

**Steps:**

1. In `permissions.ts`, add new permission type: `"is_audit:read" | "is_audit:manage"`
2. Add `is_audit:read` and `is_audit:manage` to IS_AUDITOR's permission list
3. Replace `concurrent_audit:read` as the IS Audit nav item's `requiredPermission` with `is_audit:read`
4. In `nav-items.ts`, update the IS Audit nav item's `requiredPermission` from `concurrent_audit:read` to `is_audit:read`
5. In `filterNavByRoles`, add special case for IS_AUDITOR: they should only see Dashboard, IS Audit, Controls, Work Program, Issues (not general audit execution, compliance, etc.)
6. Verify: `tsc --noEmit` passes

---

### Task 17: R90 — RISK_HEAD Role Scoping

**Files:**

- Modify: `src/lib/permissions.ts`
- Modify: `src/lib/nav-items.ts`

**What:** Give RISK_HEAD its own dashboard permission instead of reusing `dashboard:cae`.

**Steps:**

1. In `permissions.ts`, add new permission type: `"dashboard:risk_head"`
2. In RISK_HEAD's permission list, replace `dashboard:cae` with `dashboard:risk_head`
3. In `nav-items.ts` `filterNavByRoles`:
   - Add `dashboard:risk_head` to the Dashboard special case
   - Add `dashboard:risk_head` to the Analytics special case (RISK_HEAD should see analytics)
4. RISK_HEAD should see: Dashboard, Risk Management, Controls, Issues, KRI (via risk_mis:read), Compliance (read), Policies, Housekeeping — which is already covered by their existing permissions
5. Verify: `tsc --noEmit` passes

---

### Task 18: R92 — SYSTEM_ADMIN Role Scoping

**Files:**

- Modify: `src/lib/permissions.ts`
- Modify: `src/lib/nav-items.ts`

**What:** Ensure SYSTEM_ADMIN sees admin-focused nav and has access to the zone management page from R2.

**Steps:**

1. In `permissions.ts`, SYSTEM_ADMIN already has `admin:system`, `admin:manage_users`, `admin:manage_roles`, `admin:manage_settings`, `template:manage`, `calendar:manage`, `audit_universe:read/manage`, `policy:manage`, `committee:manage` — verify this is sufficient
2. Add `dashboard:cae` to SYSTEM_ADMIN so they can see the Dashboard (they need a dashboard permission)
3. In `nav-items.ts`, the Admin nav item requires `admin:manage_users` which SYSTEM_ADMIN has — verify they see Admin, Settings, Calendar, Audit Universe (via `audit_universe:read`)
4. If the R2 zone page was created with an `/admin/zones` route, it will appear under the Admin section automatically since SYSTEM_ADMIN has admin permissions
5. Verify: `tsc --noEmit` passes

---

## Post-Wave Verification

After all 3 waves complete:

1. **TypeScript check:** `tsc --noEmit` — zero errors
2. **Production build:** `pnpm build` — clean build with `SKIP_ENV_VALIDATION=1`
3. **Spot-check each gap:**
   - R100: Edit a vendor risk assessment — vendorName updates
   - R101: Save CBS checklist, reload page — responses persist
   - R103: Verify 122 questions, save/reload works
   - R29: Click download on a generated report — file downloads
   - R47: Click calendar event — edit form opens; recurring events show multiple instances
   - R63: Open /issues/board — see aggregated stats
   - R89/R90/R92: Login as IS_AUDITOR/RISK_HEAD/SYSTEM_ADMIN — see correct nav items
