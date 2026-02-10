---
status: testing
phase: 10-onboarding-compliance
source: 10-01-SUMMARY.md, 10-02-SUMMARY.md, 10-03-SUMMARY.md, 10-04-SUMMARY.md
started: 2026-02-10T23:50:00+05:30
updated: 2026-02-10T23:50:00+05:30
---

## Current Test

<!-- OVERWRITE each test - shows where we are -->

number: 1
name: Onboarding Welcome Screen
expected: |
Navigate to onboarding URL. User sees a clean screen (no sidebar) with AEGIS header, pre-onboarding requirements checklist, and "Begin Setup" button.
awaiting: user response

## Tests

### 1. Onboarding Welcome Screen

expected: Navigate to onboarding URL. User sees a clean screen (no sidebar) with AEGIS header, pre-onboarding requirements checklist, and "Begin Setup" button.
result: [pending]

### 2. Step Progress Indicator

expected: 5-step progress indicator displays with circles showing completed steps (checkmark), current step (filled), upcoming steps (outlined). Labels: Bank Registration, Tier Selection, RBI Directions, Org Structure, User Invites.
result: [pending]

### 3. Step 1 — Bank Registration Form

expected: Form accepts RBI License (format: UCB-XX-YYYY-NNNN), PAN (ABCDE1234F), CIN. Conditionally requires "Scheduled Date" for SCHEDULED bank type. Invalid formats show validation errors.
result: [pending]

### 4. Step 2 — Tier Selection with DAKSH Score

expected: Tier options (TIER_1 through TIER_4) displayed with DAKSH score input (0-100 range) and PCA status dropdown. Deposit amount field present. Form validates before advancing.
result: [pending]

### 5. Step 3 — RBI Master Directions Selection

expected: Displays 10 RBI Master Directions grouped by category. When tier is selected in Step 2, applicable checklist items auto-filter. Items marked "N/A" require 20+ character justification before advancing.
result: [pending]

### 6. Step 4 — Organization Structure Entry

expected: Add multiple departments (unique dept codes) and branches (unique branch codes and emails). Requires minimum 1 department and 1 branch. Validates uniqueness before advancing.
result: [pending]

### 7. Step 5 — User Invites

expected: Form to invite users with email addresses, role selection, and for AUDITEE role, branch assignment. Warns if no CAE or CCO invited but does not block submission. Can skip (empty invites allowed).
result: [pending]

### 8. Back Navigation Between Steps

expected: "Back" button returns to previous step with data retained and re-displayed. "Back" is disabled on Step 1.
result: [pending]

### 9. Save & Exit Wizard State

expected: "Save & Exit" button at any step persists current data. Re-entering onboarding resumes from last saved step with data pre-populated.
result: [pending]

### 10. Complete Onboarding and Redirect

expected: After completing Step 5, clicking "Complete Onboarding" redirects to dashboard. Re-visiting onboarding URL automatically redirects to dashboard.
result: [pending]

## Summary

total: 10
passed: 0
issues: 0
pending: 10
skipped: 0

## Gaps

[none yet]
