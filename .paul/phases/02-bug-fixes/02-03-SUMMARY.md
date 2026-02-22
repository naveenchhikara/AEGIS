---
phase: 02-bug-fixes
plan: 03
status: complete
completed: 2026-02-22
issues_resolved: [ISS-006, ISS-007, ISS-008, ISS-009, ISS-010]
---

# Plan 02-03 Summary: Navigation CTAs

## What Was Built

### 1. RAM → Audit Planning CTA (ISS-006 P1 — RESOLVED)

**Files:** `src/app/(dashboard)/ram/[assessmentId]/page.tsx`

When a RAM assessment has status APPROVED, a green "Next Step" card appears below the result card:

- Title: "Next Step"
- Description: "Assessment approved. Generate audit plans based on this risk assessment."
- Button: "Proceed to Audit Planning" linking to `/audit-plans`
- Only shown for APPROVED status — not DRAFT or COMPUTED

### 2. Audit Plans → Engagements Link (ISS-007 P1 — RESOLVED)

**Files:** `src/app/(dashboard)/audit-plans/page.tsx`

The engagement count column in the existing plans table is now clickable:

- Count > 0: renders as a blue link to `/audit-execution`
- Count = 0: renders as plain text (no link)

### 3. Finding Detail → Compliance Link (ISS-008 P1 — RESOLVED)

**Files:** `src/components/findings/finding-detail.tsx`

When an observation has status ISSUED, RESPONSE, COMPLIANCE, or CLOSED, a "View Compliance" link appears in the header badges area:

- Blue text link with ExternalLink icon
- Links to `/compliance`
- Not shown for DRAFT, SUBMITTED, or REVIEWED statuses

### 4. Compliance → Findings + Governance Navigation (ISS-009 P1 — RESOLVED)

**Files:** `src/components/compliance/compliance-table.tsx`, `src/app/(dashboard)/compliance/page.tsx`

- Compliance table: observation title column is now a clickable blue link to `/findings/{observationId}`
- Falls back to "—" text when no observation is linked
- Compliance page: new "Board Reporting" card at bottom with "Prepare Board Report" button linking to `/governance`

### 5. Audit Execution Back Navigation (ISS-010 P1 — RESOLVED)

**Files:** `src/app/(dashboard)/audit-execution/[engagementId]/page.tsx`, `src/app/(dashboard)/audit-execution/create/page.tsx`

Both the engagement detail page and create engagement page now show a "Back to Audits" breadcrumb at the top:

- Uses ChevronLeft icon + "Back to Audits" text
- Links to `/audit-execution`
- Follows the same pattern as the finding detail page's "Back to Findings"

## Acceptance Criteria Results

- [x] AC-1: RAM detail shows "Proceed to Audit Planning" when APPROVED
- [x] AC-2: Audit Plans engagement count is clickable link to /audit-execution
- [x] AC-3: Finding detail shows "View Compliance" for ISSUED+ statuses
- [x] AC-4: Compliance table titles link to findings; "Prepare Board Report" card visible
- [x] AC-5: Engagement detail and create pages have "Back to Audits" breadcrumb

## Verification

- [x] `pnpm build` compiles without TypeScript errors
- [x] RAM CTA only appears for APPROVED status
- [x] Audit Plans links only appear for count > 0
- [x] Finding compliance link uses correct status set (ISSUED, RESPONSE, COMPLIANCE, CLOSED)
- [x] Compliance table observation links use correct `/findings/{id}` format
- [x] All imports from `@/lib/icons` (not directly from lucide-react)
- [x] No server actions, DAL functions, or schema changes made

## Deviations from Plan

None. All tasks executed as planned.

## Files Modified

| File                                                          | Action                                  |
| ------------------------------------------------------------- | --------------------------------------- |
| `src/app/(dashboard)/ram/[assessmentId]/page.tsx`             | Modified (added APPROVED CTA card)      |
| `src/app/(dashboard)/audit-plans/page.tsx`                    | Modified (engagement count as link)     |
| `src/components/findings/finding-detail.tsx`                  | Modified (added "View Compliance" link) |
| `src/components/compliance/compliance-table.tsx`              | Modified (observation titles as links)  |
| `src/app/(dashboard)/compliance/page.tsx`                     | Modified (added "Board Reporting" card) |
| `src/app/(dashboard)/audit-execution/[engagementId]/page.tsx` | Modified (added back breadcrumb)        |
| `src/app/(dashboard)/audit-execution/create/page.tsx`         | Modified (added back breadcrumb)        |
