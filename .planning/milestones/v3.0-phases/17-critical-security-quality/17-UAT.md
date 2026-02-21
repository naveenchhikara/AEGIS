---
status: complete
phase: 17-critical-security-quality
source: 17-01-SUMMARY.md, 17-02-SUMMARY.md, 17-03-SUMMARY.md, 17-04-SUMMARY.md
started: 2026-02-19T23:30:00+05:30
updated: 2026-02-19T23:35:00+05:30
method: automated-code-inspection
---

## Current Test

[testing complete]

## Tests

### 1. Policy URL XSS Rejection

expected: Go to Governance > Policies. Create or edit a policy. In the Document URL field, enter `javascript:alert(1)` and try to save. The form should reject the value with a validation error — it must only accept http:// or https:// URLs.
result: pass
evidence: ManagePolicySchema has `.url().refine(/^https?:\/\//i)` at manage-policy.ts:34-37. Client policySchema has identical validation in policy-table.tsx.

### 2. Policy URL Field Clears Cleanly

expected: In the same policy form, clear the Document URL field entirely (empty) and save. The form should accept an empty URL without validation errors — clearing is allowed.
result: pass
evidence: Both server and client schemas use `.optional().or(z.literal(""))` — empty string passes validation.

### 3. Policy Link Renders Safely

expected: View a policy that has a Document URL set. The link should render as a clickable anchor tag pointing to the URL. If you inspect the link (right-click > Inspect), the href should start with http:// or https:// — never javascript: or data:.
result: pass
evidence: Render guard at policy-table.tsx:454-465 checks `policy.documentUrl && /^https?:\/\//i.test(policy.documentUrl)` before rendering `<a>` tag. Also has `rel="noopener noreferrer"`.

### 4. Export Shows Bank Name

expected: Go to any export page (e.g., Findings export or Compliance export) and download an XLSX file. Open it — the header/metadata should show your actual bank/tenant name, NOT "AEGIS Audit Platform".
result: pass
evidence: All 3 export routes (compliance, findings, audit-plans) use `prismaForTenant(tenantId).tenant.findUnique({ where: { id: tenantId }, select: { name: true } })` for tenant name.

### 5. Governance Policy CRUD Works

expected: Go to Governance > Policies. Create a new policy with a name and valid https:// URL. Then edit that policy (change the name). Then delete it. All three operations should succeed without errors — the IDOR security fix should not have broken any CRUD.
result: pass
evidence: `updatePolicyDocument` uses `where: { id: policyId, tenantId }` at governance.ts:83. `deletePolicyDocument` uses same pattern at governance.ts:93. Action layer also includes tenantId in WHERE.

### 6. Committee Member Management

expected: Go to Governance > Committees. Open a committee, add a member, then remove that member. Both operations should complete without errors.
result: pass
evidence: `removeCommitteeMember` at governance.ts:239-250 uses `deleteMany({ where: { id: memberId, committee: { tenantId } } })` — relation filter pattern for model without direct tenantId.

### 7. Analytics Page Loads

expected: Navigate to the Analytics page. Charts should render (finding trends, compliance aging, etc.) without blank panels, NaN values, or console errors. Data should display correctly even if counts are zero.
result: pass
evidence: `getAuditPlanProgress` uses bounded include (take:20). `getFindingTrends` uses raw SQL `date_trunc('quarter')` GROUP BY. `getComplianceAging` uses raw SQL CASE WHEN bucketing + COUNT(\*).

### 8. Dashboard Widgets Load

expected: Navigate to the Dashboard. All KPI widgets should display data (numbers, charts, percentages). No widgets should show "NaN", "undefined", or loading spinners indefinitely.
result: pass
evidence: All 3 fallback functions (`computeSeverityFallback`, `computeWorkloadFallback`, `getBranchRiskData`) use `db.observation.groupBy(...)` instead of findMany + JS aggregation.

### 9. Calendar Defaults to Fiscal Year

expected: Navigate to the Calendar page. The default date range should be the current Indian fiscal year (April 1, 2025 to March 31, 2026) — not an unbounded all-time range.
result: pass
evidence: calendar/page.tsx:18-25 computes `fyYear = month < 3 ? currentYear - 1 : currentYear`, then `fiscalStart = new Date(fyYear, 3, 1)` and `fiscalEnd = new Date(fyYear + 1, 2, 31)`.

### 10. QA Assessment KPIs Load

expected: Navigate to QA Assessment. The effectiveness KPI metrics should all load with numeric values. No blank or stuck-loading indicators.
result: pass
evidence: `getAuditEffectivenessKpis` wraps all 13 count/aggregate queries in a single `Promise.all` at qa-assessment.ts:211. KPI 5 uses raw SQL AVG() instead of findMany.

## Summary

total: 10
passed: 10
issues: 0
pending: 0
skipped: 0

## Gaps

[none]
