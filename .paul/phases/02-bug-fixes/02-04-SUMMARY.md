---
phase: 02-bug-fixes
plan: 04
status: complete
completed: 2026-02-22
issues_resolved: [ISS-012, ISS-013, ISS-014, ISS-015, ISS-016]
---

# Plan 02-04 Summary: P2 Navigation Polish

## What Was Built

### 1. Finding Detail "Next Steps" Card (ISS-012 P2 — RESOLVED)

**Files:** `src/components/findings/finding-detail.tsx`

Added a "Next Steps" Card after the ObservationActions component that shows contextual guidance based on the observation's current status:

- DRAFT: "Submit this observation for review by a senior auditor."
- SUBMITTED: "Awaiting review. The senior auditor will assess and transition this observation."
- REVIEWED: "Under review. This observation will be issued to the branch if confirmed."
- ISSUED: "Observation issued to the branch. Track compliance status." (with link to /compliance)
- RESPONSE: "Branch response received. Pending compliance review." (with link to /compliance)
- COMPLIANCE: "Under compliance review." (with link to /compliance)
- CLOSED: "This observation has been closed."

Uses ArrowRight icon in card header. Guidance only — no action buttons (ObservationActions handles transitions).

### 2. Auditee → Compliance Forward Link (ISS-013 P2 — RESOLVED)

**Files:** `src/app/(dashboard)/auditee/[observationId]/page.tsx`

When an observation has status RESPONSE, COMPLIANCE, or CLOSED, a "View Compliance Status" link with ExternalLink icon appears in the header badges area (after the status badge). Links to `/compliance`. Not shown for earlier statuses (DRAFT, SUBMITTED, REVIEWED, ISSUED) since auditees only need the compliance link after they've submitted a response.

### 3. ISS-014 Reclassified as Resolved (ISS-014 P2 — RESOLVED)

**Files:** `.paul/phases/01-e2e-audit-flow/ISSUES.md`

ISS-014 ("Engagement detail: No breadcrumb to index") was already resolved by ISS-010 in Plan 02-03, which added "Back to Audits" breadcrumbs to both the engagement detail and create engagement pages. Reclassified as duplicate/resolved. Summary table updated: 12 resolved, 11 open.

### 4. Governance → Source Data Links (ISS-015 P2 — RESOLVED)

**Files:** `src/app/(dashboard)/governance/page.tsx`

Added "View Findings" and "View Compliance" links below the page description, before the tabs. Both styled as small blue text links with ExternalLink icons, linking to `/findings` and `/compliance` respectively.

### 5. Reports → Source Data Links (ISS-016 P2 — RESOLVED)

**Files:** `src/app/(dashboard)/reports/page.tsx`

Added same "View Findings" and "View Compliance" links below the page description, before the quick actions grid. Same styling as governance page.

## Acceptance Criteria Results

- [x] AC-1: Finding detail shows "Next Steps" card with status-appropriate guidance
- [x] AC-2: Auditee detail shows "View Compliance Status" for RESPONSE/COMPLIANCE/CLOSED
- [x] AC-3: Governance page shows "View Findings" and "View Compliance" links
- [x] AC-4: Reports page shows "View Findings" and "View Compliance" links
- [x] AC-5: ISS-014 marked as RESOLVED in ISSUES.md

## Verification

- [x] `pnpm build` compiles without TypeScript errors
- [x] Finding detail "Next Steps" shows compliance links for ISSUED+ statuses
- [x] Auditee detail compliance link only for RESPONSE/COMPLIANCE/CLOSED
- [x] Governance and Reports pages show source data links
- [x] All imports from `@/lib/icons` (not directly from lucide-react)
- [x] No server actions, DAL functions, or schema changes made

## Deviations from Plan

None. All tasks executed as planned.

## Files Modified

| File                                                   | Action                                      |
| ------------------------------------------------------ | ------------------------------------------- |
| `src/components/findings/finding-detail.tsx`           | Modified (added "Next Steps" card)          |
| `src/app/(dashboard)/auditee/[observationId]/page.tsx` | Modified (added compliance link)            |
| `src/app/(dashboard)/governance/page.tsx`              | Modified (added source data links)          |
| `src/app/(dashboard)/reports/page.tsx`                 | Modified (added source data links)          |
| `.paul/phases/01-e2e-audit-flow/ISSUES.md`             | Modified (ISS-014 reclassified as resolved) |
