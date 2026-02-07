---
status: complete
phase: 02-core-screens
source: 02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md, 02-05-SUMMARY.md
started: 2026-02-08T02:25:00Z
updated: 2026-02-08T02:37:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Dashboard Health Score Gauge
expected: Navigate to /dashboard. A radial gauge chart displays the compliance health score as a percentage with color coding (green/amber/red).
result: pass
note: Initially failed due to stale Turbopack cache showing old page. After cache refresh, widget renders correctly.

### 2. Dashboard Audit Coverage Donut Chart
expected: On /dashboard, a donut/pie chart shows audit coverage breakdown by status (completed, in-progress, planned, etc.) with colored segments and a tooltip on hover.
result: pass
note: Initially failed due to stale Turbopack cache. After cache refresh, widget renders correctly.

### 3. Dashboard Findings Count Cards
expected: On /dashboard, four metric cards display: Total findings, Critical findings, Open findings, and Overdue findings with counts and appropriate icons/colors.
result: pass
note: Initially failed due to stale Turbopack cache. After cache refresh, widget renders correctly.

### 4. Dashboard Risk Indicator Panel
expected: On /dashboard, a risk indicator panel shows the computed risk level (High/Medium/Low) with contributing factors listed below.
result: pass
note: Initially failed due to stale Turbopack cache. After cache refresh, widget renders correctly.

### 5. Dashboard Regulatory Calendar
expected: On /dashboard, a regulatory calendar section shows upcoming compliance deadlines sorted by date with status-colored indicators.
result: pass
note: Initially failed due to stale Turbopack cache. After cache refresh, widget renders correctly.

### 6. Dashboard Quick Actions
expected: On /dashboard, quick action buttons are visible (e.g., New Finding, New Compliance Task, View Audit Plan) and are clickable.
result: pass
note: Initially failed due to stale Turbopack cache. After cache refresh, widget renders correctly.

### 7. Compliance Table with 55 Requirements
expected: Navigate to /compliance. A table displays compliance requirements with columns for ID, Category, Description, Status, Due Date, Evidence, and Assigned To. The table should have data rows visible.
result: pass

### 8. Compliance Table Sorting
expected: On /compliance, click any column header (e.g., Status or Category). The table rows should re-sort by that column. Click again to reverse sort order.
result: pass

### 9. Compliance Category and Status Filters
expected: On /compliance, use the Category dropdown to filter by a category (e.g., Governance). The table should show only matching rows. Use the Status dropdown to filter by status. A Reset button clears filters.
result: pass

### 10. Compliance Detail Dialog
expected: On /compliance, click any row in the table. A dialog/modal opens showing full requirement details: description, category, priority, assignments, dates, and an evidence list.
result: pass

### 11. Compliance Trend Chart
expected: On /compliance, a trend chart (area chart) shows the compliance health trend over 6 months with data points and tooltips on hover.
result: pass

### 12. Compliance Status Badges
expected: On /compliance, status badges display correct colors: compliant=green, partial=yellow, non-compliant=red, pending=gray.
result: pass

### 13. Audit Calendar FY Grid
expected: Navigate to /audit-plans. A calendar grid displays the FY 2025-26 months (April to March) with audit engagements shown as colored pills within month cells.
result: pass

### 14. Audit Engagement Cards
expected: On /audit-plans, engagement cards show audit name, status badge with icon, progress bar, and findings count.
result: pass

### 15. Audit Type Filter
expected: On /audit-plans, a filter dropdown allows filtering audits by type. Selecting a type filters the displayed audits accordingly.
result: pass

### 16. Audit Engagement Detail Sheet
expected: On /audit-plans, clicking an audit engagement opens a side Sheet/panel showing full audit details including program linkages and checklist items.
result: pass

### 17. Top Bar Responsive Behavior
expected: On any dashboard page, the top bar shows: sidebar trigger (hamburger), bank name (hidden on mobile), language switcher, notifications bell, and user profile dropdown.
result: pass

### 18. Mobile Sidebar Collapse
expected: Resize browser to mobile width (<768px). The sidebar should collapse and a hamburger menu button appears. Clicking it opens the sidebar as a drawer/sheet overlay.
result: pass

### 19. Loading Skeleton on Navigation
expected: When navigating between pages (e.g., /dashboard to /compliance), a loading skeleton briefly appears showing placeholder shapes before the content loads.
result: pass

### 20. Skip-to-Content Link
expected: On any dashboard page, press Tab key when focus is at the top. A "Skip to content" link should appear. Pressing Enter should jump focus to the main content area.
result: pass

## Summary

total: 20
passed: 20
issues: 0
pending: 0
skipped: 0

## Gaps

[none]
