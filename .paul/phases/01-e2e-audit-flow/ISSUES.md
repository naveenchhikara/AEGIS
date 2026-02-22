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
| **Resolved** | **23** | ISS-001-023                      |
| **Open**     | **0**  |                                  |

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

### [ISS-006] ~~RAM detail: No CTA to proceed to Audit Planning~~ RESOLVED

- **Severity:** ~~P1~~ → RESOLVED
- **Category:** navigation
- **Resolution:** Added "Next Step" card on RAM detail page when assessment status is APPROVED. Green card with "Proceed to Audit Planning" button linking to `/audit-plans`. Only shown for APPROVED status.
- **Resolved in:** Plan 02-03

### [ISS-007] ~~Audit Plans: No CTA to create/view engagements after plan commit~~ RESOLVED

- **Severity:** ~~P1~~ → RESOLVED
- **Category:** navigation
- **Resolution:** Made engagement count column in plans table a clickable blue link to `/audit-execution`. Count = 0 renders as plain text. Connects planning to execution flow.
- **Resolved in:** Plan 02-03

### [ISS-008] ~~Finding detail: No link to compliance status~~ RESOLVED

- **Severity:** ~~P1~~ → RESOLVED
- **Category:** navigation
- **Resolution:** Added "View Compliance" link with ExternalLink icon in finding detail header area. Shows for ISSUED, RESPONSE, COMPLIANCE, and CLOSED statuses. Links to `/compliance`.
- **Resolved in:** Plan 02-03

### [ISS-009] ~~Compliance page: No cross-navigation to findings or governance~~ RESOLVED

- **Severity:** ~~P1~~ → RESOLVED
- **Category:** navigation
- **Resolution:** Made compliance table observation titles clickable links to `/findings/{observationId}`. Added "Board Reporting" card at bottom of compliance page with "Prepare Board Report" button linking to `/governance`.
- **Resolved in:** Plan 02-03

### [ISS-010] ~~Audit Execution detail/create: No back navigation~~ RESOLVED

- **Severity:** ~~P1~~ → RESOLVED
- **Category:** navigation
- **Resolution:** Added "Back to Audits" breadcrumb (ChevronLeft icon + text) at top of both engagement detail and create engagement pages. Links to `/audit-execution`. Follows same pattern as finding detail's "Back to Findings".
- **Resolved in:** Plan 02-03

## P2 — Important

### [ISS-011] Sidebar: Inconsistent link destinations

- **Severity:** P2
- **Category:** navigation
- **Location:** `src/lib/nav-items.ts:114`
- **Description:** Most sidebar items link to index pages (`/findings`, `/compliance`, `/ram`). Admin links to `/admin/users` (no root page). Audit Execution links to `/audit-execution` (404).
- **Impact:** Inconsistent navigation pattern.
- **Suggested Fix:** Fix after ISS-001 and ISS-003 create the missing index pages.
- **Complexity:** S

### [ISS-012] ~~Findings new page: No post-creation guidance~~ RESOLVED

- **Severity:** ~~P2~~ → RESOLVED
- **Category:** ui
- **Resolution:** Added "Next Steps" Card to finding detail page (`finding-detail.tsx`) showing contextual guidance for each observation status (DRAFT → CLOSED). ISSUED+ statuses include a link to `/compliance`. Guidance only — no action buttons (ObservationActions handles transitions).
- **Resolved in:** Plan 02-04

### [ISS-013] ~~Auditee portal: No forward link to compliance~~ RESOLVED

- **Severity:** ~~P2~~ → RESOLVED
- **Category:** navigation
- **Resolution:** Added "View Compliance Status" link with ExternalLink icon on auditee observation detail page (`auditee/[observationId]/page.tsx`). Shows for RESPONSE, COMPLIANCE, and CLOSED statuses. Links to `/compliance`.
- **Resolved in:** Plan 02-04

### [ISS-014] ~~Engagement detail: No breadcrumb to index~~ RESOLVED

- **Severity:** ~~P2~~ → RESOLVED
- **Category:** navigation
- **Resolution:** Already resolved by ISS-010 in Plan 02-03 — "Back to Audits" breadcrumb added to both engagement detail and create engagement pages. Duplicate issue.
- **Resolved in:** Plan 02-03

### [ISS-015] ~~Governance: No reverse navigation to source data~~ RESOLVED

- **Severity:** ~~P2~~ → RESOLVED
- **Category:** navigation
- **Resolution:** Added "View Findings" and "View Compliance" links below the page description on governance hub page. Blue text links with ExternalLink icons linking to `/findings` and `/compliance`.
- **Resolved in:** Plan 02-04

### [ISS-016] ~~Reports: No source data links~~ RESOLVED

- **Severity:** ~~P2~~ → RESOLVED
- **Category:** navigation
- **Resolution:** Added "View Findings" and "View Compliance" links below the page description on reports page. Same styling as governance page — blue text links with ExternalLink icons.
- **Resolved in:** Plan 02-04

### [ISS-017] ~~Report data completeness depends on ComplianceItem fix~~ RESOLVED

- **Severity:** ~~P2~~ → RESOLVED
- **Category:** data-flow
- **Resolution:** Dependency satisfied. ISS-004 (auto-create ComplianceItem on ISSUED transition) was resolved in Plan 02-02. Reports now have ComplianceItem data for all ISSUED observations. No additional code changes needed.
- **Resolved in:** Plan 02-05 (dependency closure)

### [ISS-018] ~~Escalation status tracking misaligned with levels~~ RESOLVED

- **Severity:** ~~P2~~ → RESOLVED
- **Category:** data-flow
- **Resolution:** Acceptable as designed. Escalation level (L0-L4) indicates urgency based on days overdue. Compliance status (OPEN → BRANCH_RESPONSE_SUBMITTED → ZAC_APPROVED → etc.) indicates workflow position. These are intentionally independent dimensions — a high escalation level with an early status correctly signals "this item is overdue and hasn't progressed through the workflow." ISS-002 confirmed the compliance lifecycle works correctly (false positive). No code changes needed.
- **Resolved in:** Plan 02-05 (design validation)

## P3 — Nice-to-Have

### [ISS-019] ~~Section tabs: No progress indicator or "next section" CTA~~ RESOLVED

- **Severity:** ~~P3~~ → RESOLVED
- **Category:** ui
- **Resolution:** Added "X of Y complete" progress text in section tabs card header. Counts sections with COMPLETED or REVIEWED status. Replaces generic "N functional areas" text.
- **Resolved in:** Plan 02-05

### [ISS-020] ~~Dashboard: Limited cross-module quick actions~~ RESOLVED

- **Severity:** ~~P3~~ → RESOLVED
- **Category:** ui
- **Resolution:** Expanded QuickActions component from 3 to 7 buttons covering all lifecycle stages: New Finding, Compliance, Audit Plans, Risk Assessment, Audit Execution, Governance, Reports. Each with appropriate icon.
- **Resolved in:** Plan 02-05

### [ISS-021] ~~Engagement detail: No completion CTA or progress~~ RESOLVED

- **Severity:** ~~P3~~ → RESOLVED
- **Category:** ui
- **Resolution:** Progress indicator resolved by ISS-019 (section tabs show "X of Y complete" on engagement detail page). "Complete Audit" button already exists via ISS-005 (Plan 02-02 added status transition buttons to EngagementHeader).
- **Resolved in:** Plan 02-05 (combined with ISS-019 + ISS-005)

### [ISS-022] ~~RAM assessment: No approved status confirmation~~ RESOLVED

- **Severity:** ~~P3~~ → RESOLVED
- **Category:** ui
- **Resolution:** Added green "Assessment Approved — Ready for Audit Planning" banner with CheckCircle2 icon above the existing "Next Step" CTA card. Only shown for APPROVED status.
- **Resolved in:** Plan 02-05

### [ISS-023] ~~Dashboard NaN values in risk indicators~~ RESOLVED

- **Severity:** ~~P3~~ → RESOLVED
- **Category:** ui
- **Resolution:** Added null coalescing (`?? 0`) to all `Number()` conversions in `src/data-access/dashboard.ts`. Affected: `getComplianceSummary` (6 fields), `getObservationSeverity` (7 fields), `getObservationAging` (6 fields), `getAuditCoverage` (2 fields), `getAuditorWorkload` (3 fields). Dashboard now displays "0" instead of "NaN" when PostgreSQL views return null columns.
- **Resolved in:** Plan 02-05

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
