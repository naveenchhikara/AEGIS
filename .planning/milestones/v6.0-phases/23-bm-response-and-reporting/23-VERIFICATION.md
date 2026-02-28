---
phase: 23-bm-response-and-reporting
verified: 2026-02-25T12:00:00Z
status: passed
score: 5/5 must-haves verified
re_verification: false
human_verification:
  - test: "Open /auditee/[engagementId]/action-points/ as a BRANCH_HEAD user with an active BmResponseBatch"
    expected: "Deadline banner shows correct urgency color, AP cards render with expand/collapse, progress counter updates as responses are typed, submit button enables only when all APs have text"
    why_human: "Real-time state interaction and color coding cannot be verified without a running browser session"
  - test: "Click Confirm & Submit in the batch modal"
    expected: "submitBmResponse server action is called once per unresponded AP, success toast shown, modal closes"
    why_human: "Requires live DB with BmResponseBatch and ActionPoint data seeded for a BRANCH_HEAD user"
  - test: "Manually trigger the DEADLINE_CHECK cron (or wait for 06:00 IST) with a past-deadline PENDING BmResponseBatch in DB"
    expected: "Batch transitions to OVERDUE, Zonal Auditor receives the BM batch overdue email via SES"
    why_human: "Requires live DB state and SES to be out of sandbox mode"
  - test: "Generate a PDF for an RBIA engagement via the Reports page"
    expected: "8-section PDF is produced: Cover, Executive Summary, Engagement Details, Score Summary with SVG gauge, Detailed Scores, ActionPoints, Observations, Meeting Minutes"
    why_human: "PDF rendering requires a live engagement with frozen BranchRbiaScore data"
  - test: "Open /analytics as a CAE or CEO user and click the RBIA Analytics tab"
    expected: "KPI cards show real counts, RadarChart renders with branch selector dropdown, rating distribution shows 5 colored bars"
    why_human: "Requires at least one frozen BranchRbiaScore in the DB for meaningful data; empty state shown otherwise"
---

# Phase 23: BM Response and Reporting Verification Report

**Phase Goal:** Branch Managers can submit batch responses to issued ActionPoints with deadline tracking and overdue escalation, and HIA can generate the full RBIA audit report PDF and view analytics — completing the v6.0 workflow end-to-end.
**Verified:** 2026-02-25
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                                            | Status   | Evidence                                                                                                                    |
| --- | ---------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------- |
| 1   | BM response page exists at `/auditee/[engagementId]/action-points/` with auth guard and DAL data fetching        | VERIFIED | `page.tsx` uses `requirePermission("action_point:bm_respond")` + `getBmResponseBatchForEngagement()` call                   |
| 2   | Each AP has an inline expand/collapse response card with textarea; progress counter and deadline banner rendered | VERIFIED | `bm-response-ap-card.tsx` 193 lines with expand/collapse state; client wrapper renders progress counter and deadline banner |
| 3   | Submit button disabled until all APs addressed; clicking opens review modal before final submission              | VERIFIED | `!allResponded` disables button; modal shows summary table; `handleConfirmSubmit` calls `submitBmResponse` per AP           |
| 4   | Cron job detects PENDING expired batches, transitions to OVERDUE, queues Zonal Auditor emails atomically         | VERIFIED | `rbia-overdue-escalation.ts` wraps status update + notification create in `$transaction`; wired in DEADLINE_CHECK           |
| 5   | RBIA PDF generates 8-section document; `generatePdfReport` auto-detects RBIA engagements                         | VERIFIED | `rbia-report-document.tsx` 1366 lines with 8 explicit section functions; `generate-pdf.ts` checks `auditType === "RBIA"`    |

**Score:** 5/5 truths verified

---

### Required Artifacts

#### Plan 23-01: BM Response Page (BMRP-05)

| Artifact                                                            | Expected                                                  | Status   | Details                                                                                                   |
| ------------------------------------------------------------------- | --------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------- |
| `src/app/(dashboard)/auditee/[engagementId]/action-points/page.tsx` | BM response page with auth guard and DAL data fetching    | VERIFIED | `requirePermission("action_point:bm_respond")` + `getBmResponseBatchForEngagement()` — substantive, wired |
| `src/components/rbia/bm-response-ap-card.tsx`                       | Per-AP response card with inline form (min 80 lines)      | VERIFIED | 193 lines, expand/collapse, textarea, evidence zone buttons                                               |
| `src/components/rbia/bm-batch-submit-modal.tsx`                     | Review summary modal for batch submission (min 40 lines)  | VERIFIED | 170 lines, Dialog with summary table, confirm/cancel, loading state                                       |
| `src/components/rbia/bm-deadline-banner.tsx`                        | Persistent deadline countdown banner (min 30 lines)       | VERIFIED | 84 lines, green/amber/red urgency, sticky top-0 z-10                                                      |
| `src/data-access/rbia-bm-response.ts`                               | DAL for BmResponseBatch + ActionPoints with `server-only` | VERIFIED | `import "server-only"`, `getBmResponseBatchForEngagement()` with tenant isolation                         |
| `prisma/schema.prisma` (Evidence.actionPointId)                     | `actionPointId String? @db.Uuid` with index               | VERIFIED | Line 567-568 in schema; `@@index([actionPointId])` at line 577                                            |
| `prisma/schema.prisma` (ActionPoint.evidence relation)              | `evidence Evidence[] @relation("ActionPointEvidence")`    | VERIFIED | Line 2264 in schema                                                                                       |

#### Plan 23-02: Overdue Escalation (BMRP-05)

| Artifact                                          | Expected                                       | Status   | Details                                                                             |
| ------------------------------------------------- | ---------------------------------------------- | -------- | ----------------------------------------------------------------------------------- |
| `src/jobs/rbia-overdue-escalation.ts`             | `processRbiaOverdueEscalation` cron processor  | VERIFIED | 125 lines, `processRbiaOverdueEscalation` exported, atomic `$transaction` per batch |
| `src/emails/templates/bm-batch-overdue-email.tsx` | BM batch overdue email template (min 30 lines) | VERIFIED | 115 lines, `BmBatchOverdueEmail` component, `getBmBatchOverdueSubject` export       |

#### Plan 23-03: Score Visualization (REPT-02)

| Artifact                                        | Expected                                              | Status   | Details                                                                                                    |
| ----------------------------------------------- | ----------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| `src/components/rbia/rbia-score-gauge.tsx`      | RadialBarChart gauge with `RadialBarChart`            | VERIFIED | Uses `RadialBarChart`, `startAngle=90 endAngle=-270`, `pointer-events-none` overlay                        |
| `src/components/rbia/rbia-module-breakdown.tsx` | Module grid with accordion drill-down (min 100 lines) | VERIFIED | 364 lines, recursive `ScoreTreeNode` rendering, in-page accordion                                          |
| `src/components/rbia/rbia-score-trend.tsx`      | Historical trend with `LineChart`                     | VERIFIED | Uses `LineChart` with composite + module lines, Legend, `getBranchScoreHistory` mentioned in comments      |
| `src/data-access/rbia-analytics.ts`             | Analytics DAL with `server-only`                      | VERIFIED | `import "server-only"`, `getScoreDisplayData()`, `getRbiaAnalyticsSummary()`, `getRbiaAnalyticsByPeriod()` |

#### Plan 23-04: RBIA PDF Report (REPT-04)

| Artifact                                             | Expected                                   | Status   | Details                                                                            |
| ---------------------------------------------------- | ------------------------------------------ | -------- | ---------------------------------------------------------------------------------- |
| `src/components/pdf-report/rbia-report-document.tsx` | 8-section PDF with `Document`              | VERIFIED | 1366 lines, `Document` from `@react-pdf/renderer`, all 8 section functions present |
| `src/data-access/rbia-report.ts`                     | `getRbiaReportData` DAL with `server-only` | VERIFIED | `import "server-only"`, `getRbiaReportData()` with Promise.all parallel fetch      |

#### Plan 23-05: Board Analytics (REPT-05)

| Artifact                                           | Expected                             | Status   | Details                                                                                       |
| -------------------------------------------------- | ------------------------------------ | -------- | --------------------------------------------------------------------------------------------- |
| `src/components/rbia/rbia-analytics-radar.tsx`     | RadarChart with `RadarChart`         | VERIFIED | Uses `RadarChart`, `PolarGrid`, `PolarAngleAxis`, `PolarRadiusAxis`, branch selector dropdown |
| `src/components/rbia/rbia-rating-distribution.tsx` | Horizontal bar chart with `BarChart` | VERIFIED | Uses `BarChart` with `layout="vertical"`, `Cell` per-bar coloring, 5 bands                    |
| `src/components/rbia/rbia-analytics-kpis.tsx`      | KPI summary cards (min 40 lines)     | VERIFIED | 148 lines, 4 KPI cards in responsive grid                                                     |

---

### Key Link Verification

| From                                     | To                                 | Via                                                         | Status | Details                                                                                                    |
| ---------------------------------------- | ---------------------------------- | ----------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| `action-points/page.tsx`                 | `rbia-bm-response.ts`              | `getBmResponseBatchForEngagement` call                      | WIRED  | Direct import and call on line 15 of page                                                                  |
| `bm-response-page-client.tsx`            | `src/actions/rbia/findings.ts`     | `submitBmResponse` import and call                          | WIRED  | Import on line 5; called in `handleConfirmSubmit` per AP                                                   |
| `bm-batch-submit-modal.tsx`              | `findings.ts` via `onConfirm` prop | Prop function triggering batch submit                       | WIRED  | `onConfirm` passed from client wrapper which calls `submitBmResponse`                                      |
| `src/lib/permissions.ts`                 | BRANCH_HEAD role                   | `action_point:bm_respond` in BRANCH_HEAD array              | WIRED  | Line 288 confirms permission assigned                                                                      |
| `prisma/schema.prisma`                   | Evidence model                     | `actionPointId` FK with `@@index`                           | WIRED  | Lines 567-577                                                                                              |
| `src/jobs/index.ts`                      | `rbia-overdue-escalation.ts`       | `processRbiaOverdueEscalation` in DEADLINE_CHECK            | WIRED  | Imported line 5; called at line 44 in DEADLINE_CHECK handler                                               |
| `src/jobs/notification-processor.ts`     | `bm-batch-overdue-email.tsx`       | `BM_BATCH_OVERDUE` in `TEMPLATE_MAP`                        | WIRED  | Line 34 of notification-processor.ts; `render.ts` has matching case                                        |
| `rbia-score-gauge.tsx`                   | `src/components/ui/chart.tsx`      | `ChartContainer` wrapper                                    | WIRED  | `ChartContainer` imported and used around `RadialBarChart`                                                 |
| `src/actions/reports/generate-pdf.ts`    | `rbia-report-document.tsx`         | `auditType === "RBIA"` check routes to `RbiaReportDocument` | WIRED  | Line 70: `const isRbia = auditData.auditType === "RBIA"`; `RbiaReportDocument` used in `if (isRbia)` block |
| `src/app/(dashboard)/analytics/page.tsx` | `rbia-analytics.ts`                | `getRbiaAnalyticsSummary` call in server component          | WIRED  | Import line 18; called in Promise.all at line 59; `rbiaData` destructured and passed to components         |
| `rbia-analytics-radar.tsx`               | `src/components/ui/chart.tsx`      | `ChartContainer` wrapper                                    | WIRED  | `ChartContainer` imported and used around `RadarChart`                                                     |

---

### Requirements Coverage

| Requirement | Source Plan  | Description                                                                                               | Status    | Evidence                                                                                      |
| ----------- | ------------ | --------------------------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------- |
| BMRP-05     | 23-01, 23-02 | System transitions BmResponseBatch to OVERDUE when deadline passes with email escalation to Zonal Auditor | SATISFIED | BM response page (Plan 01) + overdue cron job (Plan 02) fully implement this requirement      |
| REPT-02     | 23-03        | System shows historical RBIA score trend across engagements for each branch                               | SATISFIED | `rbia-score-trend.tsx` renders LineChart from `getBranchScoreHistory` data                    |
| REPT-04     | 23-04        | RBIA audit report PDF generated with dual sections: score summary + findings (8-section format)           | SATISFIED | 1366-line `rbia-report-document.tsx` with 8 sections; auto-detected in `generate-pdf.ts`      |
| REPT-05     | 23-05        | Board analytics includes RadarChart for module scores and branch rating distribution chart                | SATISFIED | `rbia-analytics-radar.tsx` + `rbia-rating-distribution.tsx` integrated in /analytics RBIA tab |

**Note on REPT-01 and REPT-03:** These requirements are assigned to Phase 22 in REQUIREMENTS.md traceability. Phase 23's Plan 23-03 extended Phase 22 stubs to full implementations but does not formally claim these requirement IDs. They remain under Phase 22's ownership per REQUIREMENTS.md. No orphaned requirements detected for Phase 23.

---

### Anti-Patterns Found

| File                                          | Line     | Pattern                                                                       | Severity | Impact                                                                                                                                                                                                            |
| --------------------------------------------- | -------- | ----------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/rbia/bm-response-ap-card.tsx` | 168, 178 | Evidence upload buttons are `disabled` — S3 presigned upload wiring deferred  | Warning  | Plan truth says "evidence upload zone" (UI element exists); the buttons render but do not upload. Schema FK is in place. Plan SUMMARY documents this as intentional deferral to an integration phase. No blocker. |
| `src/app/(dashboard)/analytics/page.tsx`      | 122, 132 | `{/* TODO: Period selector */}` comment + `scoreImprovement={null}` hardcoded | Info     | Period selector and score improvement computation explicitly deferred per SUMMARY. DAL (`getRbiaAnalyticsByPeriod`) is ready. Non-blocking placeholder.                                                           |

---

### Human Verification Required

#### 1. BM Response Page Flow

**Test:** Log in as a BRANCH_HEAD user. Navigate to `/auditee/{id}/action-points/` for an engagement with an active BmResponseBatch.
**Expected:** Deadline banner shows correct urgency tier (green/amber/red), AP cards render with expand/collapse, typing in each textarea updates the progress counter from N/total to (N+1)/total, submit button becomes enabled when all APs have responses, clicking opens the review modal, confirming calls submitBmResponse.
**Why human:** Real-time state interaction and color coding cannot be verified without a running browser session.

#### 2. Overdue Escalation Email

**Test:** Insert a BmResponseBatch record with status PENDING and deadline in the past. Trigger the DEADLINE_CHECK job (or call `processRbiaOverdueEscalation` directly in a test script).
**Expected:** Batch transitions to OVERDUE, Zonal Auditor receives the BM batch overdue email via SES.
**Why human:** Requires live DB state and SES outside sandbox mode.

#### 3. RBIA PDF Generation

**Test:** As HIA/CAE, click "Generate Report" for an RBIA engagement that has a frozen BranchRbiaScore.
**Expected:** PDF downloads with all 8 sections visible: Cover Page with bank name and rating band, Score Summary with circular gauge, Detailed Scores with indented tree, ActionPoints table, Observations with 5C fields, Meeting Minutes.
**Why human:** PDF rendering requires live engagement data; visual inspection needed.

#### 4. RBIA Analytics Tab

**Test:** Log in as CAE or CEO user, navigate to /analytics, click "RBIA Analytics" tab.
**Expected:** 4 KPI cards appear, RadarChart renders with branch selector dropdown, 5-bar horizontal distribution chart displays. Empty state shown correctly when no frozen scores exist.
**Why human:** Requires at least one frozen BranchRbiaScore; visual chart rendering verification.

---

## Gaps Summary

No blocking gaps identified. All must-have truths are verified, all artifacts exist and are substantive, all key links are wired.

Two non-blocking items noted:

- Evidence upload UI is present but buttons are disabled (wiring deferred to a future integration phase — documented in SUMMARY and plan context)
- Period selector in RBIA Analytics tab is a TODO placeholder; the DAL function exists and is ready

---

_Verified: 2026-02-25_
_Verifier: Claude (gsd-verifier)_
