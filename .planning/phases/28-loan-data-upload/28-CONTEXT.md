# Phase 28: Loan Data Upload - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

HIA uploads a branch loan portfolio as CSV or Excel, sees a validated import summary with accepted/rejected rows explained, and data is stored per branch per credit module for downstream sampling. This phase delivers the upload UI, parsing, validation, and storage — not the sampling or examination.

</domain>

<decisions>
## Implementation Decisions

### Upload Experience

- Support both CSV and Excel (.xlsx) — banks typically export from CBS as Excel, CSV is fallback
- ExcelJS already in project (used for report generation) — reuse for parsing
- Drag-and-drop zone with dashed border + click to open file picker (modern UX)
- Offer downloadable template button — Excel/CSV with correct headers and 2-3 example rows per credit module
- New "Loan Portfolio" tab within the engagement detail page (alongside RBIA, Cash Verification, etc.)

### Validation & Error Display

- Summary table with row-level errors: show a summary card (X accepted, Y rejected) + a table of rejected rows with specific error messages per row (e.g., "Row 5: missing account number")
- Client-side validation on file select — parse and validate immediately for instant feedback before import click
- Mandatory fields (core 5): account number, borrower name, sanction amount, outstanding amount, loan type
- Optional fields with defaults: DPD (default 0), sanction date (default null), asset class (default "STANDARD")
- Partial data handling: accept rows with valid required fields but invalid optional fields — import with defaults + warning (e.g., "Row 12: DPD defaulted to 0")

### Portfolio Replacement Behavior

- Confirmation dialog with counts when re-uploading: "This will replace 142 existing accounts for Housing Loans at Main Branch. Continue?" — show old vs new count
- HIA must select credit module before uploading (dropdown: Housing Loans, Gold Loans, etc.) — makes scope explicit, prevents wrong-module overwrites
- Block replacement if any loan accounts have examination responses — show: "Cannot replace — 45 accounts have examination responses. Clear responses first or create a new engagement."
- Branch inherited from engagement (no separate branch picker) — each engagement is scoped to a branch

### Column Mapping & Flexibility

- Smart fuzzy matching for column name variations (account_no, Account Number, acct_no, ACCOUNT NO, etc.)
- Show detected column mapping preview before import: "We mapped Column A → Account Number, Column B → Borrower Name..." User confirms before proceeding
- Extra columns in file are ignored silently — banks often export full CBS dumps with many extra fields
- All credit modules share the same 5 mandatory columns — module-specific fields (collateral type for Housing, gold purity for Gold) go into the JSONB metadata column
- Template download changes per credit module to include module-specific optional columns

### Claude's Discretion

- Exact fuzzy matching algorithm for column headers
- File size limits and performance optimization for large portfolios
- Loading states during parsing and import
- Error state design details
- How to surface the detected column mapping (table vs inline text)

</decisions>

<specifics>
## Specific Ideas

- Template should include 2-3 realistic example rows with Indian bank data (rupee amounts, Indian names)
- Confirmation dialog should show side-by-side old count vs new count to make the impact clear
- The mapping preview is important — it catches mismatches before data goes into the database
- Module-specific template columns: Housing Loans gets collateral_type, property_value; Gold Loans gets gold_purity, gold_weight

</specifics>

<code_context>

## Existing Code Insights

### Reusable Assets

- `LoanCsvImport` component (`src/components/audit-execution/loan-csv-import.tsx`): Existing CSV import with basic parsing, preview table, fuzzy header matching — can be refactored/replaced for new upload
- ExcelJS package: Already in project for report generation — reuse for .xlsx parsing
- `importLoanReviewCsv` server action (`src/actions/audit-execution/import-loan-csv.ts`): Existing import action writing to LoanReview model — pattern reference for new LoanAccount import
- shadcn/ui Table, Card, Alert, Button components: All used in existing loan-csv-import
- sonner toast: Standard notification pattern

### Established Patterns

- Server component page fetches data → passes to client component as props
- Server actions with `getRequiredSession()` + permission checks for mutations
- DAL functions in `src/data-access/` with tenant isolation via WHERE clause
- Tabs component for switching between views within a page (used in loan-review page)
- `formatDate()` from `src/lib/utils.ts` for Indian locale formatting

### Integration Points

- New tab in engagement detail page (pattern: existing tabs for RBIA, Cash Verification, etc.)
- LoanAccount model from Phase 27 schema — the upload target
- ExaminationQuestion model — check for existing responses before allowing replacement
- Engagement page route: `src/app/(dashboard)/audit-execution/[engagementId]/`

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 28-loan-data-upload_
_Context gathered: 2026-02-28_
