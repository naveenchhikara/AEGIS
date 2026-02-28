---
phase: 29-sampling-engine
plan: "03"
subsystem: sampling-ui
tags: [sampling, rbia, ui, criteria-config, sample-display, client-components]
dependency_graph:
  requires: [29-02]
  provides: [sampling-tab-ui, criteria-config-form, sample-list-table]
  affects: [rbia-layout, audit-execution]
tech_stack:
  added: []
  patterns:
    [
      server-component-page,
      client-form-with-transitions,
      read-only-role-split,
      bucket-badge-table,
    ]
key_files:
  created:
    - src/app/(dashboard)/audit-execution/[engagementId]/rbia/sampling/page.tsx
    - src/components/sampling/criteria-config-form.tsx
    - src/components/sampling/sample-list-table.tsx
  modified:
    - src/app/(dashboard)/audit-execution/[engagementId]/rbia/layout.tsx
decisions:
  - "Sampling tab inserted between Loan Portfolio and Findings in RBIA TabNav — logical flow: upload → sample → examine → findings"
  - "CriteriaConfigForm split into ReadOnlyView + EditableForm subcomponents — keeps auditor branch clean with no edit controls"
  - "handleUnlock resets local isLocked state only — actual DB unlock happens when user saves new criteria via saveSamplingCriteria"
  - "SampleListTable rows wrapped in Link to /rbia/account/[id] — 404 expected until Phase 30 creates account examination route"
  - "DEFAULT_MODULE_CODE hardcoded as CRD-HLN for v7.0 — can be extended to searchParam-based selection later"
metrics:
  duration_minutes: 25
  completed_date: "2026-02-28"
  tasks_completed: 2
  tasks_total: 2
  files_created: 3
  files_modified: 1
---

# Phase 29 Plan 03: Sampling UI — Criteria Config Form and Sample Display Summary

Sampling tab UI wired to backend: HIA criteria config form with 5 bucket rows, running total validation, sample generation, and read-only auditor view; sample list table with colored bucket badges and sorting.

## What Was Built

**Task 1 — Sampling page route + RBIA layout tab:**

- Created `src/app/(dashboard)/audit-execution/[engagementId]/rbia/sampling/page.tsx` — server component that fetches config, sampled accounts, and portfolio count in parallel via `Promise.all`
- Added "Sampling" tab to RBIA TabNav in `layout.tsx` — inserted between Loan Portfolio and Findings tabs
- Page shows lock attribution text when criteria are locked (HIA name + date)
- Serializes Prisma `Decimal` fields to `number` before passing to client components

**Task 2 — CriteriaConfigForm + SampleListTable:**

- `CriteriaConfigForm` (`src/components/sampling/criteria-config-form.tsx`) — "use client" component with role-based branching:
  - HIA view: editable 5-row bucket table with number inputs, sample size input, running total (green when = 100%, red otherwise), Save/Generate buttons via `useTransition`
  - Auditor view (SMPL-03): `ReadOnlyView` renders criteria as plain text, no input controls, no buttons
  - Locked state: amber banner with Unlock button when `sampleGenerated = true`
  - Redistribution warnings: amber `Alert` component listing per-bucket shortfall details
  - Toasts via sonner for save success/error and generation result
- `SampleListTable` (`src/components/sampling/sample-list-table.tsx`) — "use client" component:
  - Columns: Account No, Borrower Name, Sanction Amount (₹), Outstanding (₹), DPD, Asset Class, Criteria Bucket
  - Colored bucket badges per BUCKET_BADGE_CLASSES mapping (blue/purple/amber/red/green)
  - Client-side sorting on all numeric and string columns with ArrowUpDown icons
  - Bucket filter dropdown via shadcn/ui Select
  - Clickable rows link to `/audit-execution/[id]/rbia/account/[accountId]` (Phase 30 integration)
  - INR currency formatting with `en-IN` locale

## Deviations from Plan

None — plan executed exactly as written.

## Success Criteria Verification

- [x] HIA sees editable criteria form with 5 bucket inputs, sample size input, and running total (SMPL-01 + SMPL-02)
- [x] Cannot save unless bucket allocations sum to 100% — running total shows green/red (SMPL-01)
- [x] Calculated count display shows "10% of 500 = 50 accounts" format (SMPL-02)
- [x] Auditor sees read-only display with no edit controls, lock icon, and attribution text (SMPL-03)
- [x] Generate Sample button triggers sample generation and displays results (SMPL-04)
- [x] Sample list shows accounts with colored bucket badges, sortable columns, and bucket filter (SMPL-04)
- [x] Redistribution warnings shown prominently in amber Alert after generation (SMPL-04)
- [x] Sampling tab appears in RBIA engagement tab navigation between Loan Portfolio and Findings
- [x] All icons imported from @/lib/icons, toasts via sonner

## Commits

| Hash     | Message                                                                     |
| -------- | --------------------------------------------------------------------------- |
| 60eee98e | feat(29-03): add Sampling tab to RBIA layout and create sampling page route |
| ad1d29e2 | feat(29-03): build criteria config form and sample list table components    |

## Self-Check: PASSED

- FOUND: src/app/(dashboard)/audit-execution/[engagementId]/rbia/sampling/page.tsx
- FOUND: src/components/sampling/criteria-config-form.tsx
- FOUND: src/components/sampling/sample-list-table.tsx
- FOUND commit: 60eee98e
- FOUND commit: ad1d29e2
