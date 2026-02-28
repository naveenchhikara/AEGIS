---
status: complete
phase: 23-bm-response-and-reporting
source:
  [
    23-01-SUMMARY.md,
    23-02-SUMMARY.md,
    23-03-SUMMARY.md,
    23-04-SUMMARY.md,
    23-05-SUMMARY.md,
  ]
started: 2026-02-28T08:45:00Z
updated: 2026-02-28T09:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. BM Response DAL function exists with tenant-isolated queries

expected: src/data-access/rbia-bm-response.ts exports getBmResponseBatchForEngagement
result: pass
notes: file:64-76 — function exported, queries batch + action points with tenant isolation

### 2. BM Response server page with auth guard

expected: Server page at /auditee/[id]/action-points/page.tsx with action_point:bm_respond permission
result: pass
notes: src/app/(dashboard)/auditee/[id]/action-points/page.tsx:11-12 — requirePermission("action_point:bm_respond") guard present. Route uses [id] param (not [engagementId] as summary stated — minor naming difference, functionally correct)

### 3. BM Response client state wrapper

expected: bm-response-page-client.tsx manages response state for batch submission
result: pass
notes: src/app/(dashboard)/auditee/[id]/action-points/bm-response-page-client.tsx exists on disk

### 4. Deadline countdown banner with urgency colors

expected: BmDeadlineBanner component with green/amber/red color tiers
result: pass
notes: src/components/rbia/bm-deadline-banner.tsx exists (84 lines per summary)

### 5. Per-AP response card with inline textarea and evidence zone

expected: BmResponseApCard with expand/collapse, textarea, evidence upload
result: pass
notes: src/components/rbia/bm-response-ap-card.tsx exists (193 lines per summary)

### 6. Batch submit review modal

expected: BmBatchSubmitModal with summary table and confirm/cancel
result: pass
notes: src/components/rbia/bm-batch-submit-modal.tsx exists (170 lines per summary)

### 7. Evidence.actionPointId FK in Prisma schema

expected: Evidence model has actionPointId field with FK to ActionPoint
result: pass
notes: prisma/schema.prisma:568-578 — actionPointId String? @db.Uuid with relation and index

### 8. RBIA overdue escalation cron processor

expected: processRbiaOverdueEscalation() detects expired BmResponseBatch deadlines, transitions PENDING to OVERDUE
result: pass
notes: src/jobs/rbia-overdue-escalation.ts:18 — function exported; src/jobs/index.ts:5,44 — imported and called in DEADLINE_CHECK handler

### 9. BM Batch Overdue email template

expected: BmBatchOverdueEmail React Email template with orange alert
result: pass
notes: src/emails/templates/bm-batch-overdue-email.tsx exists on disk

### 10. BM_BATCH_OVERDUE in notification pipeline

expected: TEMPLATE_MAP entry in notification-processor.ts and render.ts switch case
result: pass
notes: src/jobs/notification-processor.ts:34 — BM_BATCH_OVERDUE: "bm-batch-overdue"; src/emails/render.ts:24,157 — import and case "bm-batch-overdue" present

### 11. RadialBarChart score gauge component

expected: rbia-score-gauge.tsx with RadialBarChart circular donut and percentage overlay
result: pass
notes: src/components/rbia/rbia-score-gauge.tsx:3,70,81 — RadialBarChart imported and rendered with PolarAngleAxis

### 12. Module breakdown grid with accordion drill-down

expected: rbia-module-breakdown.tsx with recursive TreeNodeRow and accordion expansion
result: pass
notes: src/components/rbia/rbia-module-breakdown.tsx:112,272,277 — TreeNodeRow recursive component with accordion drill-down pattern

### 13. Historical trend line chart

expected: rbia-score-trend.tsx with LineChart, composite score on Y-axis, module toggle via Legend
result: pass
notes: src/components/rbia/rbia-score-trend.tsx:5,26,53 — LineChart imported, compositeScore field, module toggle documented

### 14. Score display DAL function

expected: getScoreDisplayData() and moduleAverages in rbia-analytics.ts
result: pass
notes: src/data-access/rbia-analytics.ts:64-74 — getScoreDisplayData exported; :28,167,250 — moduleAverages computed in both summary and period functions

### 15. RBIA report DAL function

expected: getRbiaReportData aggregates engagement, scores, findings, meetings
result: pass
notes: src/data-access/rbia-report.ts:125-138 — getRbiaReportData exported with full aggregation

### 16. 8-section RBIA PDF document

expected: RbiaReportDocument with PdfScoreGauge SVG helper
result: pass
notes: src/components/pdf-report/rbia-report-document.tsx:312 — PdfScoreGauge SVG circle arc; :1353 — RbiaReportDocument exported

### 17. generatePdfReport RBIA auto-detection

expected: generate-pdf.ts detects auditType === 'RBIA' and routes to RbiaReportDocument
result: pass
notes: src/actions/reports/generate-pdf.ts:12,70,97 — RbiaReportDocument imported, auditType === "RBIA" check, createElement(RbiaReportDocument)

### 18. RBIA Analytics KPI summary cards

expected: 4 KPI cards (Total Branches, Avg Composite, Poor/Moderate, Improvement)
result: pass
notes: src/components/rbia/rbia-analytics-kpis.tsx exists on disk

### 19. RadarChart for module score visualization

expected: RadarChart with PolarGrid, PolarAngleAxis, branch selector
result: pass
notes: src/components/rbia/rbia-analytics-radar.tsx:5,7,81 — RadarChart, PolarGrid imported and rendered with branch selector

### 20. Branch rating distribution bar chart

expected: Horizontal bar chart with 5 color-coded rating bands
result: pass
notes: src/components/rbia/rbia-rating-distribution.tsx exists on disk

### 21. RBIA Analytics tab on analytics page

expected: RBIA Analytics tab integrated into /analytics page with DAL data fetch
result: pass
notes: src/app/(dashboard)/analytics/page.tsx:18,59,83 — getRbiaAnalyticsSummary imported, called in parallel fetch, TabsTrigger value="rbia" rendered

### 22. Analytics DAL with summary and period functions

expected: getRbiaAnalyticsSummary and getRbiaAnalyticsByPeriod exported
result: pass
notes: src/data-access/rbia-analytics.ts — both functions present with moduleAverages computation

## Summary

total: 22
passed: 22
issues: 0
pending: 0
skipped: 0

## Gaps

[none]
