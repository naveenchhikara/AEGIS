---
status: testing
phase: 09-dashboards
source: 09-01-SUMMARY.md, 09-02-SUMMARY.md, 09-03-SUMMARY.md, 09-04-SUMMARY.md, 09-05-SUMMARY.md
started: 2026-02-10T23:50:00+05:30
updated: 2026-02-10T23:50:00+05:30
---

## Current Test

<!-- OVERWRITE each test - shows where we are -->

number: 1
name: Health Score Gauge Renders
expected: |
On the dashboard page, a radial gauge (0-100) displays with 4 color bands (red 0-40, amber 41-60, yellow-green 61-80, green 81-100). For empty data, shows empty state card.
awaiting: user response

## Tests

### 1. Health Score Gauge Renders

expected: Dashboard shows a radial health score gauge (0-100) with 4 color bands (red 0-40, amber 41-60, yellow-green 61-80, green 81-100). Empty data shows empty state card.
result: [pending]

### 2. Compliance Status Donut Chart

expected: Donut chart shows 4 compliance segments (Compliant=green, Partial=amber, Non-Compliant=red, Pending=gray) with percentage in center. Center text is non-interactive.
result: [pending]

### 3. Observation Severity KPI Cards

expected: 4 color-coded KPI cards display Critical (red), High (orange), Medium (yellow), Low (blue) observation counts with icons.
result: [pending]

### 4. Finding Aging Bar Chart

expected: Vertical bar chart with 5 aging buckets (Current, 0-30d, 31-60d, 61-90d, 90+d) with colors progressing from green to red.
result: [pending]

### 5. Auditor Dashboard — Personal Observations

expected: As Auditor, dashboard shows "My Observations" table (top 10), engagement progress bars per active engagement, and pending responses count.
result: [pending]

### 6. Audit Manager Dashboard — Team Workload

expected: As Audit Manager, dashboard shows horizontal bar chart with per-auditor breakdown, "Pending Reviews" table showing SUBMITTED observations awaiting review.
result: [pending]

### 7. CAE Dashboard — Branch Risk & Board Readiness

expected: As CAE, dashboard shows branch-risk heatmap table with color-coded risk scores and board-report-readiness checklist with check/X indicators per section.
result: [pending]

### 8. CCO Dashboard — Regulatory Calendar

expected: As CCO, dashboard shows upcoming deadlines with urgency coloring (≤7d red, ≤30d amber, >30d green), stacked progress bars per compliance category, RBI circular impact table.
result: [pending]

### 9. CEO Dashboard — Executive Summary

expected: As CEO, dashboard shows risk-indicator cards (critical/overdue/non-compliant counts, red if >0), PCA status badge, key-trends sparklines with trend direction arrows.
result: [pending]

### 10. DAKSH Score Display

expected: RBI DAKSH supervisory score displays as radial gauge (1-5 scale). When null, shows "Not yet assessed" badge instead of gauge.
result: [pending]

### 11. Fiscal Year & Quarter Selector

expected: Dashboard has dropdown for current/previous FY and toggle group for All/Q1/Q2/Q3/Q4. Selecting a quarter updates widget data. Feb 2026 shows FY 2025-26 as current.
result: [pending]

## Summary

total: 11
passed: 0
issues: 0
pending: 11
skipped: 0

## Gaps

[none yet]
