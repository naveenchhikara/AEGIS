---
phase: 28-loan-data-upload
plan: "02"
subsystem: loan-portfolio-ui
tags:
  - upload-ui
  - drag-drop
  - column-mapping
  - excel-parse
  - rbia-tab
dependency_graph:
  requires:
    - "28-01: backend parsing pipeline, DAL functions, import server action"
  provides:
    - "Loan Portfolio tab in RBIA engagement navigation"
    - "Upload interface with module selector, drag-drop, column mapping preview"
    - "Import summary with accepted/rejected/warning breakdown"
    - "Portfolio stats cards with asset class breakdown"
    - "parseExcelFile server action for .xlsx client upload flow"
  affects:
    - "src/app/(dashboard)/audit-execution/[engagementId]/rbia/layout.tsx — 5-tab navigation"
tech_stack:
  added:
    - "parseExcelFile server action (FormData + ExcelJS)"
  patterns:
    - "5-state machine for upload flow (idle/mapping/importing/summary/error)"
    - "CSV parsed client-side for instant feedback; Excel parsed server-side"
    - "AlertDialog for portfolio replacement confirmation"
    - "Collapsible sections for rejected row / warning details"
key_files:
  created:
    - src/components/loan-portfolio/loan-portfolio-upload.tsx
    - src/components/loan-portfolio/column-mapping-preview.tsx
    - src/components/loan-portfolio/import-summary.tsx
    - src/components/loan-portfolio/portfolio-stats.tsx
    - src/app/(dashboard)/audit-execution/[engagementId]/rbia/loan-portfolio/page.tsx
    - src/actions/loan-portfolio/parse-excel-file.ts
  modified:
    - src/app/(dashboard)/audit-execution/[engagementId]/rbia/layout.tsx
decisions:
  - "ValidationResult passed through runImport to avoid state race between pendingValidation and direct import"
  - "CREDIT_MODULE_CODES array in page.tsx uses canonical keys (HOUSING_LOANS/GOLD_LOANS/VEHICLE_LOANS) not RBIA module codes to deduplicate MODULE_FIELD_CONFIGS entries"
  - "parseExcelFile action enforces rbia:examine permission consistent with importLoanPortfolio"
metrics:
  duration_minutes: 20
  completed_date: "2026-02-28"
  tasks_completed: 2
  tasks_total: 2
  files_created: 6
  files_modified: 1
---

# Phase 28 Plan 02: Loan Portfolio Upload UI Summary

**One-liner:** Drag-drop upload UI with client-side CSV parse, server-side Excel parse, column mapping preview with confidence badges, import summary with collapsible error details, and Loan Portfolio tab wired into the RBIA engagement layout.

## Tasks Completed

| #   | Task                                                                 | Commit   | Key Files                                                                                      |
| --- | -------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| 1   | Create loan portfolio client components                              | 7312b0e0 | column-mapping-preview.tsx, import-summary.tsx, portfolio-stats.tsx, loan-portfolio-upload.tsx |
| 2   | Create loan portfolio page, Excel parse action, wire RBIA layout tab | 9bc0eb91 | parse-excel-file.ts, rbia/loan-portfolio/page.tsx, rbia/layout.tsx                             |

## What Was Built

### Client Components (`src/components/loan-portfolio/`)

**`loan-portfolio-upload.tsx`** (482 lines) — Main upload orchestration with a 5-state machine:

- `idle`: Module dropdown (Select), template download button, drag-drop zone accepting .csv/.xlsx
- `mapping`: ColumnMappingPreview with detected header mappings
- `importing`: Full-card loading spinner while server action runs
- `summary`: ImportSummaryView showing accepted/rejected/warnings
- `error`: Alert with "Try Again" button

CSV files are parsed client-side via `parseCsvText` for instant feedback. Excel (.xlsx) files are sent to the `parseExcelFile` server action (ExcelJS requires Node.js). Re-upload with existing data triggers an AlertDialog showing old account count vs new file row count.

**`column-mapping-preview.tsx`** (149 lines) — Table showing source column → canonical field with confidence badges (green Exact Match, amber Fuzzy Match, gray Ignored). Mandatory field check (accountNo, borrowerName, sanctionAmount, outstandingAmount, loanType) — Confirm button disabled if any are missing.

**`import-summary.tsx`** (175 lines) — Post-import results with stat badges (accepted/rejected/warnings). Two Collapsible sections: rejected rows table (Row #, Field, Error) and warnings list. "Done" button calls onDismiss → router.refresh().

**`portfolio-stats.tsx`** (110 lines) — 3-card grid (Total Accounts, Total Sanction ₹L, Total Outstanding ₹L) + asset class breakdown table. Matches the loan-review page stats card pattern.

### Server Files

**`parse-excel-file.ts`** — Server action accepting FormData with a `file` field. Auth check (rbia:examine permission), 10MB file size limit, parses via `parseExcelBuffer`, returns `{ success, data: { headers, rows } }`.

**`rbia/loan-portfolio/page.tsx`** (136 lines) — Server component loading engagement, portfolio summary stats, per-module account counts (HOUSING_LOANS, GOLD_LOANS, VEHICLE_LOANS). Converts Decimal → number before passing to client components. Shows PortfolioStats when data exists; shows upload UI only for users with rbia:examine permission.

**`rbia/layout.tsx`** — Added "Loan Portfolio" tab between Examination and Findings. RBIA engagement now has 5 tabs: Examination, Loan Portfolio, Findings, Meetings, Score.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ValidationResult threading in runImport**

- **Found during:** Task 1 implementation
- **Issue:** Original design called `runImport(validationResult.validRows)` in the non-replace path, losing rejected rows and warnings data needed for the summary display. `pendingValidation` state is only set in the replace-dialog path.
- **Fix:** Changed `runImport` signature to accept the full `ValidationResult` object instead of just `validRows`. Both paths (replace and direct) now pass the complete result.
- **Files modified:** `src/components/loan-portfolio/loan-portfolio-upload.tsx`
- **Commit:** 7312b0e0

## Verification Results

- TypeScript: No new errors (2 pre-existing errors in unrelated files: `.next/dev` validator + `tenant-isolation.test.ts`)
- Artifact line counts all meet minimums: upload 482 (min 200), mapping 149 (min 40), summary 175 (min 60), stats 110 (min 30), page 136 (min 40)
- RBIA layout has 5 tabs with "Loan Portfolio" tab at key index 1 (between Examination and Findings)
- Key links verified: upload component imports detectColumnMapping, validateAndTransformRows, importLoanPortfolio, parseExcelFile; page uses getLoanAccountSummary + countLoanAccountsForModule

## Self-Check: PASSED

Files created:

- src/components/loan-portfolio/loan-portfolio-upload.tsx: FOUND
- src/components/loan-portfolio/column-mapping-preview.tsx: FOUND
- src/components/loan-portfolio/import-summary.tsx: FOUND
- src/components/loan-portfolio/portfolio-stats.tsx: FOUND
- src/app/(dashboard)/audit-execution/[engagementId]/rbia/loan-portfolio/page.tsx: FOUND
- src/actions/loan-portfolio/parse-excel-file.ts: FOUND

Commits:

- 7312b0e0: FOUND (feat(28-02): add loan portfolio client components)
- 9bc0eb91: FOUND (feat(28-02): add loan portfolio page, excel parse action, and RBIA layout tab)
