# v5.0 Pilot Readiness — Issue Tracker

> Generated: 2026-02-21 from code review (navigation audit + data flow audit)
> Phase: 01-e2e-audit-flow, Plan: 01-01

## Summary

| Severity     | Count  | Description                      |
| ------------ | ------ | -------------------------------- |
| P0           | 3      | Blockers — flow cannot proceed   |
| P1           | 7      | Critical — major data/UX issues  |
| P2           | 8      | Important — should fix for pilot |
| P3           | 5      | Nice-to-have — polish items      |
| **Total**    | **23** |                                  |
| **Resolved** | **6**  | ISS-001,002,003,004,005,011      |
| **Open**     | **17** |                                  |

## P0 — Flow Blockers

### [ISS-001] ~~Missing /audit-execution index page (404)~~ RESOLVED

- **Severity:** ~~P0~~ → RESOLVED
- **Category:** missing-feature
- **Resolution:** Created `/audit-execution` index page with status summary cards (Planned/In Progress/Completed/Cancelled), EngagementsTable component with clickable rows, and "Create Engagement" button. Added `getEngagements()` and `getEngagementSummary()` DAL functions.
- **Resolved in:** Plan 02-01

### [ISS-002] ~~Compliance lifecycle stalled at OPEN — missing transition actions~~ RESOLVED (false positive)

- **Severity:** ~~P0~~ → RESOLVED
- **Category:** data-flow
- **Resolution:** False positive from Phase 1 audit. All 7 compliance transition server actions exist and are fully wired to UI components: `submit-branch-response.ts` (OPEN/BRANCH_RESPONSE_DUE → BRANCH_RESPONSE_SUBMITTED), `zac-review.ts` (BRANCH_RESPONSE_SUBMITTED → ZAC_APPROVED/ZAC_REJECTED/BRANCH_RESPONSE_DUE), `ace-processing.ts` (ZAC_APPROVED → ACE_REVIEW → ACB_REVIEW/CLOSED), `acb-reporting.ts` (generates board reports). UI: ComplianceTable shows "Respond" button (branch response) and "Review" button (ZAC review). BranchResponseForm and ZacReviewPanel are wired and functional.
- **Resolved in:** Plan 02-02 (reclassification)

### [ISS-003] ~~Missing /admin index page (404)~~ RESOLVED

- **Severity:** ~~P0~~ → RESOLVED
- **Category:** missing-feature
- **Resolution:** Created `/admin` hub page with 5 section cards (Users, Branches, Zones, Templates, RAM Config), each with icon, title, description, and link. Responsive grid layout.
- **Resolved in:** Plan 02-01

## P1 — Critical Issues

### [ISS-004] ~~No ComplianceItem auto-created when observation reaches ISSUED~~ RESOLVED

- **Severity:** ~~P1~~ → RESOLVED
- **Category:** data-flow
- **Location:** `src/actions/observations/transition.ts`
- **Resolution:** Added auto-creation of ComplianceItem in `transitionObservation()` when `targetStatus === "ISSUED"`. Creates with status OPEN, dueDate = now + 30 days, escalationLevel 0, daysOpen 0. Includes duplicate check (skips if ComplianceItem already exists for the observation). Non-blocking: wrapped in try-catch, logs error but doesn't fail the transition.
- **Resolved in:** Plan 02-02

### [ISS-005] ~~Engagement status never changes from PLANNED~~ RESOLVED

- **Severity:** ~~P1~~ → RESOLVED
- **Category:** data-flow
- **Location:** `src/actions/audit-execution/update-engagement-status.ts`
- **Resolution:** Created `updateEngagementStatus` server action with validated transitions: PLANNED → IN_PROGRESS (sets actualStartDate), IN_PROGRESS → COMPLETED (sets actualEndDate), PLANNED/IN_PROGRESS → CANCELLED. Added "Start Audit", "Complete Audit", and "Cancel" buttons to EngagementHeader component, visible only with `audit_execution:manage_team` permission.
- **Resolved in:** Plan 02-02

### [ISS-006] RAM detail: No CTA to proceed to Audit Planning

- **Severity:** P1
- **Category:** navigation
- **Location:** `src/app/(dashboard)/ram/[assessmentId]/page.tsx`
- **Description:** After RAM assessment is APPROVED, page shows score and frequency but no link or button to navigate to `/audit-plans`. Users must manually find the next step.
- **Impact:** Flow disconnect between risk assessment and audit planning.
- **Suggested Fix:** After APPROVED status, show "Next Step: Generate Audit Plans" card with button linking to `/audit-plans`.
- **Complexity:** S

### [ISS-007] Audit Plans: No CTA to create/view engagements after plan commit

- **Severity:** P1
- **Category:** navigation
- **Location:** `src/app/(dashboard)/audit-plans/page.tsx:103-220`
- **Description:** After committing annual plan, only shows toast "Annual plan created! X audits scheduled." No button to view created engagements or navigate to audit execution. Existing plans table rows are not clickable.
- **Impact:** Users don't know what to do after planning. Flow disconnected.
- **Suggested Fix:** After plan commit, show "View Engagements" button. Make existing plans table rows clickable — link engagement count to filtered `/audit-execution?planId=X`.
- **Complexity:** M

### [ISS-008] Finding detail: No link to compliance status

- **Severity:** P1
- **Category:** navigation
- **Location:** `src/components/findings/finding-detail.tsx`
- **Description:** Observation detail page shows lifecycle timeline but no link to view the observation's compliance tracking status. Users can't navigate from findings to compliance.
- **Impact:** Workflow gap between findings and compliance tracking.
- **Suggested Fix:** Add "View Compliance Status" link/badge on finding detail when status >= ISSUED. Link to `/compliance` filtered by observation.
- **Complexity:** S

### [ISS-009] Compliance page: No cross-navigation to findings or governance

- **Severity:** P1
- **Category:** navigation
- **Location:** `src/app/(dashboard)/compliance/page.tsx`
- **Description:** Compliance table shows items but rows don't link to observation detail pages. No forward navigation to governance/board reporting.
- **Impact:** Compliance page is isolated — users can't drill into source observations or proceed to board.
- **Suggested Fix:** Make compliance table rows link to `/findings/{observationId}`. Add "Prepare Board Report" CTA linking to `/governance`.
- **Complexity:** S

### [ISS-010] Audit Execution detail/create: No back navigation

- **Severity:** P1
- **Category:** navigation
- **Location:** `src/app/(dashboard)/audit-execution/[engagementId]/page.tsx`, `src/app/(dashboard)/audit-execution/create/page.tsx`
- **Description:** Neither the engagement detail page nor the create page have a "Back to Audits" breadcrumb or link. Users are stuck without browser back button.
- **Impact:** Poor UX, users feel trapped on detail pages.
- **Suggested Fix:** Add breadcrumb `< Back to Audits` at top of both pages, consistent with findings detail page pattern.
- **Complexity:** S

## P2 — Important

### [ISS-011] Sidebar: Inconsistent link destinations

- **Severity:** P2
- **Category:** navigation
- **Location:** `src/lib/nav-items.ts:114`
- **Description:** Most sidebar items link to index pages (`/findings`, `/compliance`, `/ram`). Admin links to `/admin/users` (no root page). Audit Execution links to `/audit-execution` (404).
- **Impact:** Inconsistent navigation pattern.
- **Suggested Fix:** Fix after ISS-001 and ISS-003 create the missing index pages.
- **Complexity:** S

### [ISS-012] Findings new page: No post-creation guidance

- **Severity:** P2
- **Category:** ui
- **Location:** `src/components/findings/observation-form.tsx`
- **Description:** After creating observation, redirects to detail page but no "Next Steps" section showing available actions based on role and status.
- **Impact:** Users unclear on what to do next.
- **Suggested Fix:** Add "Next Steps" card on finding detail showing available transitions.
- **Complexity:** S

### [ISS-013] Auditee portal: No forward link to compliance

- **Severity:** P2
- **Category:** navigation
- **Location:** `src/app/(dashboard)/auditee/page.tsx`
- **Description:** After auditee provides response to observation, no CTA to see compliance/review status.
- **Impact:** Auditees can't track their response status.
- **Suggested Fix:** Add "View Compliance Status" link after response submitted.
- **Complexity:** S

### [ISS-014] Engagement detail: No breadcrumb to index

- **Severity:** P2
- **Category:** navigation
- **Location:** `src/app/(dashboard)/audit-execution/[engagementId]/page.tsx`
- **Description:** After engagement creation, user lands on detail page with no way to see other engagements except via sidebar.
- **Impact:** User trapped on single engagement view.
- **Suggested Fix:** Add breadcrumb navigation. Depends on ISS-001 creating the index page.
- **Complexity:** S

### [ISS-015] Governance: No reverse navigation to source data

- **Severity:** P2
- **Category:** navigation
- **Location:** `src/app/(dashboard)/governance/page.tsx`
- **Description:** Governance page shows policy, committee, ACB workspace tabs but no links back to findings or compliance source data.
- **Impact:** Board members can't drill into underlying observations.
- **Suggested Fix:** Add "View Observation" links from ACB escalation items.
- **Complexity:** S

### [ISS-016] Reports: No source data links

- **Severity:** P2
- **Category:** navigation
- **Location:** `src/app/(dashboard)/reports/page.tsx`
- **Description:** Report generator and history shown but no links to findings, compliance, or governance pages that reports pull data from.
- **Impact:** Users can't verify underlying data before generating reports.
- **Suggested Fix:** Add "View underlying data" links to findings and compliance.
- **Complexity:** S

### [ISS-017] Report data completeness depends on ComplianceItem fix

- **Severity:** P2
- **Category:** data-flow
- **Location:** `src/actions/reports/generate-xlsx.ts`
- **Description:** Report generation assumes ISSUED observations have ComplianceItems. Without ISS-004 fix, reports will have incomplete compliance data.
- **Impact:** Generated reports may show incomplete compliance tracking.
- **Suggested Fix:** Fix ISS-004 first. Optionally add data validation warning in report generation.
- **Complexity:** S (after ISS-004)

### [ISS-018] Escalation status tracking misaligned with levels

- **Severity:** P2
- **Category:** data-flow
- **Location:** `src/lib/escalation-engine.ts`
- **Description:** Escalation engine auto-computes escalation level based on days overdue, but ComplianceStatus enum transitions don't auto-progress. Level can be 3 while status is still OPEN.
- **Impact:** Status and escalation level can be out of sync.
- **Suggested Fix:** Align status auto-progression with escalation level changes. Depends on ISS-002 implementing the full lifecycle.
- **Complexity:** M (after ISS-002)

## P3 — Nice-to-Have

### [ISS-019] Section tabs: No progress indicator or "next section" CTA

- **Severity:** P3
- **Category:** ui
- **Location:** `src/components/audit-execution/section-tabs.tsx`
- **Description:** Audit section tabs show status dots but no "X of Y completed" progress bar or "Proceed to next section" button.
- **Impact:** Workflow friction during field examination.
- **Suggested Fix:** Add progress bar and highlight next incomplete section.
- **Complexity:** S

### [ISS-020] Dashboard: Limited cross-module quick actions

- **Severity:** P3
- **Category:** ui
- **Location:** `src/components/dashboard/quick-actions.tsx`
- **Description:** Dashboard quick actions only link to Findings, Compliance, Audit Plans. Missing: RAM, Audit Execution, Governance, Reports.
- **Impact:** New users can't discover full audit lifecycle from dashboard.
- **Suggested Fix:** Add quick action buttons for all 7 lifecycle stages.
- **Complexity:** S

### [ISS-021] Engagement detail: No completion CTA or progress

- **Severity:** P3
- **Category:** ui
- **Location:** `src/app/(dashboard)/audit-execution/[engagementId]/page.tsx`
- **Description:** No progress indicator showing sections completed. No "Mark as Complete" button. Depends on ISS-005 for status transition.
- **Impact:** Users can't see engagement completion progress.
- **Suggested Fix:** Add progress bar and "Mark Complete" button (after ISS-005).
- **Complexity:** M (after ISS-005)

### [ISS-022] RAM assessment: No approved status confirmation

- **Severity:** P3
- **Category:** ui
- **Location:** `src/app/(dashboard)/ram/[assessmentId]/page.tsx`
- **Description:** After approval, no confirmation banner. User sees score but unclear if ready for planning.
- **Impact:** Unclear state communication.
- **Suggested Fix:** Add "Assessment Approved — Ready for Audit Planning" banner.
- **Complexity:** S

### [ISS-023] Dashboard NaN values in risk indicators

- **Severity:** P3
- **Category:** ui
- **Location:** Dashboard observation aggregation queries
- **Description:** Known issue — Risk indicators show "NaN" when observation aggregation has null values. Carried forward from v4.0.
- **Impact:** Visual defect on dashboard.
- **Suggested Fix:** Add null coalescing in observation summary queries and display "0" or "N/A" instead.
- **Complexity:** S

---

## Fix Dependency Graph

```
ISS-001 (audit-execution index) ──┐
                                   ├── ISS-011 (sidebar fix)
ISS-003 (admin index) ────────────┘    ISS-014 (breadcrumbs)
                                       ISS-010 (back nav)

ISS-002 (compliance lifecycle) ───┬── ISS-018 (escalation alignment)
                                   └── ISS-013 (auditee forward link)

ISS-004 (auto-create compliance) ─── ISS-017 (report completeness)

ISS-005 (engagement status) ──────── ISS-021 (completion CTA)
```

## Recommended Phase 2 Plan Structure

**Plan 02-01: Critical Missing Pages (P0)**

- ISS-001: Create /audit-execution index page
- ISS-003: Create /admin hub page

**Plan 02-02: Compliance Lifecycle (P0 + P1)**

- ISS-002: Implement compliance transition actions
- ISS-004: Auto-create ComplianceItem on ISSUED

**Plan 02-03: Engagement Lifecycle (P1)**

- ISS-005: Engagement status transitions
- ISS-010: Back navigation for execution pages

**Plan 02-04: Flow Navigation (P1)**

- ISS-006: RAM → Planning CTA
- ISS-007: Planning → Execution CTA
- ISS-008: Findings → Compliance link
- ISS-009: Compliance cross-navigation

**Plan 02-05: Polish (P2 + P3)**

- ISS-011 through ISS-023: Remaining UX improvements

---

_ISSUES.md — Phase 1 audit output for Phase 2 planning_
_Generated: 2026-02-21_
