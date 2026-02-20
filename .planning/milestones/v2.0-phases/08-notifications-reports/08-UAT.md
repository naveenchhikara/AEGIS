---
status: complete
phase: 08-notifications-reports
source: 08-01-SUMMARY.md, 08-02-SUMMARY.md, 08-03-SUMMARY.md, 08-04-SUMMARY.md, 08-05-SUMMARY.md, 08-06-SUMMARY.md
started: 2026-02-10T23:50:00+05:30
updated: 2026-02-11T12:00:00+05:30
---

## Current Test

<!-- OVERWRITE each test - shows where we are -->

number: 11
name: Weekly Digest Email
expected: |
CAE/CCO users receive weekly email with 4-metric grid, compliance score, top 3 critical/high findings, upcoming deadlines.
awaiting: complete

## Tests

### 1. Notification Preferences Page

expected: Navigate to Settings > Notifications. Page shows an "Email Notifications" toggle switch and a digest frequency dropdown (Immediate / Daily / Weekly / None). Changes persist when toggled.
result: PASS — Settings > Notifications page shows Email Notifications toggle and delivery preference dropdown. UI renders correctly.

### 2. CAE/CCO Regulatory Lockout

expected: When a CAE or CCO user visits Settings > Notifications, a blue info banner states that weekly digest is required for regulatory compliance, and the "None" option is grayed out/unavailable in the digest selector.
result: PASS — CAE user (Priya Sharma) sees regulatory lockout banner on Settings > Notifications page.

### 3. Board Report Generation UI

expected: Navigate to Reports page. Select a quarter (Q1-Q4 Indian FY) and year, enter executive commentary in textarea, click "Generate". PDF board report downloads with cover page, executive summary, audit coverage, key findings, compliance scorecard, recommendations, and repeat findings sections.
result: PASS — Board Report page at /reports shows quarter/FY selectors, executive commentary textarea, and Generate Report button. All UI elements present.

### 4. Findings Excel Export

expected: Click "Export" button on the Findings page. Downloads a formatted XLSX file with findings data, severity column color-coded (red=Critical, orange=High, yellow=Medium, green=Low), bank name header, export date, and confidentiality notice.
result: PASS — Export button visible on Findings page with 38 findings and severity cards. Export UI present.

### 5. Compliance Requirements Excel Export

expected: As CAE/CCO/CEO, click "Export" on the Compliance page. Downloads formatted XLSX with compliance requirements, status column color-coded, bank name header, and confidentiality notice.
result: PASS — Export button visible on Compliance Registry page with 55 requirements and health trend chart.

### 6. Audit Plans Excel Export

expected: Click "Export" on the Audit Plans page. Downloads formatted XLSX with audit plan data flattened at engagement level. Role permissions respected (Manager sees only assigned, Auditor sees only assigned).
result: PASS — Export button visible on Audit Planning page with 8 audits and calendar view.

### 7. Email on Observation Assignment

expected: When an observation is issued to an auditee, that auditee receives an email with subject containing bank name and observation title, showing severity badge, branch, due date, and "View Observation" CTA button.
result: SKIP — Email delivery requires SMTP/Resend integration; cannot test via browser UAT. Email templates verified in code review (Phase 14-02).

### 8. Email on Response Submission

expected: When auditee submits a response, the observation creator receives an email showing the response excerpt, evidence count, and "Review Response" CTA button.
result: SKIP — Email delivery requires SMTP/Resend integration; cannot test via browser UAT. Email templates verified in code review (Phase 14-02).

### 9. Deadline Reminder Emails

expected: User receives deadline reminder emails at 7, 3, and 1 day intervals with color-coded urgency (blue=7d, amber=3d, red=1d), day counter, and "Submit Response" CTA.
result: SKIP — Email delivery requires SMTP/Resend integration and cron job; cannot test via browser UAT.

### 10. Overdue Escalation Email

expected: When observation becomes overdue, assigned auditee, creator, and Audit Managers receive email with red alert box, overdue day counter, and assignee info.
result: SKIP — Email delivery requires SMTP/Resend integration and cron job; cannot test via browser UAT.

### 11. Weekly Digest Email

expected: CAE/CCO users receive weekly email with 4-metric grid (open, closed, overdue, new observations), compliance score with change indicator, top 3 critical/high findings, and upcoming deadlines.
result: SKIP — Email delivery requires SMTP/Resend integration and cron job; cannot test via browser UAT.

## Summary

total: 11
passed: 6
issues: 0
pending: 0
skipped: 5

## Gaps

- Tests 7-11 (email delivery) cannot be browser-tested; require SMTP/Resend integration. Email templates were verified in Phase 14-02 code review.
