---
phase: 28-loan-data-upload
plan: 01
subsystem: api
tags: [exceljs, csv, prisma, zod, loan-portfolio, file-upload, rbia]

# Dependency graph
requires:
  - phase: 27-schema-and-data-models
    provides: LoanAccount and AccountExamResponse models in Prisma schema

provides:
  - CSV parser (parseCsvText) handling quoted fields and mixed line endings
  - Excel parser (parseExcelBuffer) using ExcelJS for .xlsx files
  - Fuzzy column mapper (detectColumnMapping) with Levenshtein distance matching
  - Row validator (validateAndTransformRows) with per-row error reporting
  - Excel template generator (generateLoanTemplate) per module with dropdowns
  - GET /api/loan-portfolio/template download endpoint
  - DAL functions: getLoanAccountsForEngagement, getLoanAccountSummary, countLoanAccountsForModule, countLoanAccountsWithResponses, deleteLoanAccountsForModule
  - importLoanPortfolio server action with atomic delete+createMany
  - getPortfolioSummary server action with aggregated stats

affects:
  - 28-02 (UI will call these parsers + server actions directly)
  - 29-sampling-engine (reads LoanAccount table)
  - 30-account-examination-ui (reads LoanAccount table)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Fuzzy column matching via Levenshtein distance (≤2 edit distance, ≥4 char strings)
    - Uniform CSV/Excel parse shape: { headers: string[]; rows: Record<string, string>[] }
    - MODULE_FIELD_CONFIGS pattern for per-module metadata field definitions
    - Atomic portfolio replacement: countResponses → deleteMany → createMany in one transaction
    - sanctionDate null-fallback to import timestamp (DB requires DateTime, file may omit date)

key-files:
  created:
    - src/lib/loan-portfolio/types.ts
    - src/lib/loan-portfolio/column-mapper.ts
    - src/lib/loan-portfolio/csv-parser.ts
    - src/lib/loan-portfolio/excel-parser.ts
    - src/lib/loan-portfolio/template-generator.ts
    - src/data-access/loan-account.ts
    - src/actions/loan-portfolio/schemas.ts
    - src/actions/loan-portfolio/import-loan-portfolio.ts
    - src/actions/loan-portfolio/get-portfolio-summary.ts
    - src/app/api/loan-portfolio/template/route.ts
  modified: []

key-decisions:
  - "sanctionDate is required in DB (DateTime non-nullable) but optional in uploads — null input is defaulted to import timestamp rather than rejecting the row"
  - "MODULE_FIELD_CONFIGS supports both HOUSING_LOANS and CRD-HLN style codes for same module — maps both to same metadata config"
  - "z.record() in Zod v4 requires two arguments (key + value schema) — used z.record(z.string(), z.unknown()) for metadata field"
  - "ExcelJS default import works with tsconfig esModuleInterop:true — standalone tsc without tsconfig shows false positive for default export"
  - "deleteLoanAccountsForModule uses any-typed tx to avoid complex Prisma generic constraints — same pattern as existing import-loan-csv.ts"

patterns-established:
  - "Loan portfolio parsing: file → parseCsv/parseExcel → detectColumnMapping → validateAndTransformRows → ImportLoanPortfolioSchema → importLoanPortfolio"
  - "Template API: GET /api/loan-portfolio/template?moduleCode=X → generateLoanTemplate(X) → xlsx buffer response"

requirements-completed:
  - DATA-01
  - DATA-02
  - DATA-03

# Metrics
duration: 35min
completed: 2026-02-28
---

# Phase 28 Plan 01: Loan Portfolio Backend Summary

**CSV/Excel parsing pipeline with fuzzy column mapping, per-module typed metadata, atomic portfolio replacement server action, and styled Excel template download API.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-02-28T~14:30Z
- **Completed:** 2026-02-28T~15:05Z
- **Tasks:** 3
- **Files created:** 10

## Accomplishments

- Full parsing pipeline: CSV text and .xlsx buffer → uniform { headers, rows } shape → fuzzy column mapping → validated ParsedLoanRow[]
- Fuzzy column matcher handles Indian bank header variations: "account_no", "Account Number", "acct_no" etc. with Levenshtein distance ≤ 2
- Atomic importLoanPortfolio server action: checks exam responses → deletes old → createMany new — replacement blocked if examination has started
- Per-module Excel template with styled headers, example rows, asset class dropdown validation
- All 10 files compile with zero TypeScript errors against project tsconfig

## Task Commits

Each task was committed atomically:

1. **Task 1: Create loan portfolio types and column mapper** - `ee147f59` (feat)
2. **Task 2: Create CSV/Excel parsers and template generator** - `552e5f82` (feat)
3. **Task 3: Create DAL functions and server action for loan portfolio import** - `64f0c99e` (feat)

## Files Created

- `src/lib/loan-portfolio/types.ts` - ParsedLoanRow, ValidationResult, ColumnMapping, ImportSummary, MODULE_FIELD_CONFIGS, MANDATORY_FIELDS
- `src/lib/loan-portfolio/column-mapper.ts` - CANONICAL_HEADERS, detectColumnMapping (Levenshtein fuzzy), validateAndTransformRows (per-row errors, Indian date formats)
- `src/lib/loan-portfolio/csv-parser.ts` - parseCsvText with quoted field support and CRLF normalization
- `src/lib/loan-portfolio/excel-parser.ts` - parseExcelBuffer using ExcelJS with getCellValue helper (handles dates, formulas, rich text)
- `src/lib/loan-portfolio/template-generator.ts` - generateLoanTemplate with per-module columns, example rows, asset class dropdown
- `src/data-access/loan-account.ts` - getLoanAccountsForEngagement, getLoanAccountSummary, countLoanAccountsForModule, countLoanAccountsWithResponses, deleteLoanAccountsForModule (all with tenant isolation)
- `src/actions/loan-portfolio/schemas.ts` - ImportLoanPortfolioSchema (Zod v4, 10k row limit), GetPortfolioSummarySchema
- `src/actions/loan-portfolio/import-loan-portfolio.ts` - importLoanPortfolio server action with rbia:examine permission, atomic transaction, audit context
- `src/actions/loan-portfolio/get-portfolio-summary.ts` - getPortfolioSummary action with aggregated by-assetClass stats
- `src/app/api/loan-portfolio/template/route.ts` - GET endpoint with rbia:examine auth, xlsx Content-Disposition response

## Decisions Made

- **sanctionDate nullability**: DB schema has `sanctionDate DateTime` (non-nullable) but bank files often omit sanction dates. Rather than rejecting rows with missing dates, null input defaults to import timestamp. A parser warning is added.
- **Dual module codes**: MODULE_FIELD_CONFIGS maps both `HOUSING_LOANS` and `CRD-HLN` to the same metadata config, allowing the UI to pass either format.
- **z.record Zod v4**: Zod v4 requires two arguments for z.record() — used `z.record(z.string(), z.unknown())` for metadata validation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed RowValidationError missing from column-mapper.ts import**

- **Found during:** Task 1 (TypeScript verification)
- **Issue:** Type was imported as part of a group but `RowValidationError` was missing from the import statement
- **Fix:** Added explicit import for `RowValidationError` from types.ts
- **Files modified:** src/lib/loan-portfolio/column-mapper.ts
- **Verification:** `npx tsc --noEmit` passes
- **Committed in:** ee147f59 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed Map iterator compatibility in column-mapper.ts**

- **Found during:** Task 1 (TypeScript verification)
- **Issue:** `for...of aliasMap.entries()` requires `--downlevelIteration` flag or ES2015+ target in standalone mode
- **Fix:** Changed to `Array.from(aliasMap.entries())` — compatible with all targets
- **Files modified:** src/lib/loan-portfolio/column-mapper.ts
- **Verification:** `npx tsc --noEmit` passes
- **Committed in:** ee147f59 (Task 1 commit)

**3. [Rule 1 - Bug] Fixed Buffer-to-Response typing in template API route**

- **Found during:** Task 2 (TypeScript verification)
- **Issue:** `new Response(buffer)` where buffer is `Buffer<ArrayBufferLike>` — TS doesn't accept this as BodyInit directly
- **Fix:** Cast to `buffer as unknown as BodyInit` (same pattern used in other Next.js API routes)
- **Files modified:** src/app/api/loan-portfolio/template/route.ts
- **Verification:** Full project `npx tsc --noEmit` — zero errors in new files
- **Committed in:** 552e5f82 (Task 2 commit)

**4. [Rule 1 - Bug] Fixed z.record() signature for Zod v4**

- **Found during:** Task 3 (TypeScript verification)
- **Issue:** `z.record(z.unknown())` — Zod v4 requires key schema + value schema (2 args minimum)
- **Fix:** Changed to `z.record(z.string(), z.unknown())`
- **Files modified:** src/actions/loan-portfolio/schemas.ts
- **Verification:** TypeScript check passes
- **Committed in:** 64f0c99e (Task 3 commit)

**5. [Rule 3 - Blocking] Removed unused Decimal import from get-portfolio-summary.ts**

- **Found during:** Task 3 (TypeScript verification)
- **Issue:** Imported `Decimal` from prisma/runtime which doesn't exist at that path — unused type
- **Fix:** Removed import; conversion to Number is handled inline
- **Files modified:** src/actions/loan-portfolio/get-portfolio-summary.ts
- **Verification:** TypeScript check passes
- **Committed in:** 64f0c99e (Task 3 commit)

---

**Total deviations:** 5 auto-fixed (4 type errors, 1 missing import)
**Impact on plan:** All fixes were TypeScript compilation errors discovered during verification — no scope changes.

## Issues Encountered

- ExcelJS default import shows false positive in standalone `tsc` invocation (missing tsconfig context) — the project-level `npx tsc --noEmit` correctly resolves with `esModuleInterop: true`.
- LoanAccount DB schema has `sanctionDate DateTime` (non-nullable) vs plan spec saying `DateTime?` (nullable) — handled by defaulting to import timestamp with a warning, no DB schema change needed.

## Next Phase Readiness

- Plan 02 (UI) can call `importLoanPortfolio`, `getPortfolioSummary`, and the parsers directly — all API contracts are stable
- Template download works immediately at `/api/loan-portfolio/template?moduleCode=CRD-HLN`
- DAL functions ready for Plan 03 (sampling engine queries)

## Self-Check: PASSED

All 11 created files verified to exist. All 3 task commits confirmed in git log:

- `ee147f59` — Task 1: types and column mapper
- `552e5f82` — Task 2: parsers, template generator, API route
- `64f0c99e` — Task 3: DAL functions and server actions

---

_Phase: 28-loan-data-upload_
_Completed: 2026-02-28_
