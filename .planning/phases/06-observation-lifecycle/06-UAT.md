---
status: complete
phase: 06-observation-lifecycle
source: 06-01-SUMMARY.md, 06-03-SUMMARY.md, 06-04-SUMMARY.md, 06-05-SUMMARY.md, 06-06-SUMMARY.md, 06-07-SUMMARY.md
started: 2026-02-10T23:30:00+05:30
updated: 2026-02-10T23:45:00+05:30
---

## Current Test

[testing complete]

## Tests

### 1. Findings List Page Loads from Database

expected: Navigate to /findings. Summary cards show observation counts by severity. Table shows observations with 7-state status badges, severity, branch, audit area, and age columns. "Create Observation" button visible in header.
result: pass

### 2. Findings Filters Work

expected: On /findings page, use status filter to select "DRAFT" — table shows only DRAFT observations. Use severity filter to select "HIGH" — table filters accordingly. Clear filters restores full list.
result: pass

### 3. Create Observation Form

expected: Click "Create Observation" button. Redirects to /findings/new. Form shows all 5C fields (Condition, Criteria, Cause, Effect, Recommendation) in two-column layout. Sidebar shows metadata inputs: severity dropdown, branch dropdown, audit area dropdown, risk category dropdown, due date picker.
result: pass

### 4. Submit New Observation

expected: Fill all 5C fields and metadata, click submit. Success toast appears. Redirects to /findings/[id] detail page. Timeline shows "Created" entry with your name and timestamp. Status badge shows "DRAFT".
result: pass

### 5. Observation Detail Page — 5C Fields and Tags

expected: On observation detail page, all 5C fields displayed in labeled card sections (Condition, Criteria, Cause, Effect, Recommendation). Tagging panel on right shows: severity badge, status badge, branch, audit area, risk category, assigned to, due date.
result: pass

### 6. State Transition — Submit for Review

expected: On a DRAFT observation, "Submit for Review" button visible. Click it — dialog opens requesting a comment. Enter comment and confirm. Status changes to SUBMITTED. Timeline shows new entry: "DRAFT → SUBMITTED" with your comment.
result: pass

### 7. State Transition — Manager Approves and Issues

expected: As Audit Manager on a SUBMITTED observation, "Approve" and "Return to Draft" buttons appear. Click "Approve" with comment — status becomes REVIEWED. Then "Issue to Auditee" button appears — click with comment, status becomes ISSUED. Timeline shows both transitions.
result: pass

### 8. Observation Timeline Display

expected: Open an observation with multiple transitions. Timeline shows all events in chronological order. Each entry has: actor name, timestamp, event type icon, and comment. Color-coded dots by type (green=created, blue=status change, orange=severity escalation, red=repeat confirmed). No edit/delete buttons on entries.
result: pass

### 9. Resolve During Fieldwork

expected: On a DRAFT observation, "Resolve During Fieldwork" button visible. Click it — dialog asks for resolution reason (min 10 characters). Submit — amber "Resolved During Fieldwork" badge appears on detail page. Timeline shows "resolved_during_fieldwork" entry.
result: pass

### 10. Repeat Finding Detection Banner

expected: Create a new observation. Select same branch and audit area as an existing CLOSED observation. Type a similar title. After brief delay (~500ms), amber repeat finding banner appears below the form showing up to 3 candidates with similarity %, occurrence count, and "Confirm as Repeat" / "Dismiss" buttons.
result: pass

## Summary

total: 10
passed: 10
issues: 0
pending: 0
skipped: 0

## Gaps

[none]
