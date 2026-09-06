# How to work with Excel: bulk import and report export

AEGIS uses [ExcelJS](https://github.com/exceljs/exceljs) for both directions
— parsing uploaded `.xlsx`/`.csv` files and generating downloadable
reports — never a browser-side spreadsheet library. Both directions are
server-only.

## Import: loan portfolio bulk upload

This is the most elaborate import in the codebase (`src/lib/loan-portfolio/`)
and the template to follow for any new bulk-upload feature. Three-stage
pipeline:

```
.xlsx/.csv buffer
   │  parseExcelBuffer() / csv-parser.ts
   ▼
{ headers: string[], rows: Record<string,string>[] }   — raw strings, no type coercion yet
   │  detectColumnMapping(headers, moduleCode)
   ▼
ColumnMapping[]  — each header tagged "exact" | "fuzzy" | "unmatched"
   │  validateAndTransformRows(rawRows, mapping, moduleCode)
   ▼
{ validRows, rejectedRows, warnings }
```

**Column matching is fuzzy on purpose.** Indian bank exports name the same
field a dozen different ways — `account_no`, `Account Number`, `acct_no`,
`loan_account_no` all map to canonical `accountNo`
(`CANONICAL_HEADERS` in `column-mapper.ts`). An unrecognized header first
tries an exact alias match, then — only for headers of 4+ characters — a
Levenshtein-distance fuzzy match capped at distance ≤ 2 against every known
alias; anything still unmatched is tagged `"unmatched"` and its column is
silently ignored during import; it is not rejected as an error.

**Validation classifies problems by field, not by row.** Five fields
(`accountNo`, `borrowerName`, `sanctionAmount`, `outstandingAmount`,
`loanType`) are mandatory — missing any of them rejects the whole row with a
field-specific error message. Everything else degrades gracefully with a
warning instead of a rejection: an invalid DPD defaults to 0, an
unrecognized asset class defaults to `STANDARD`, an unparseable sanction
date becomes `null` (set to import date downstream) — each with its own
warning string surfaced to the uploader, not silently swallowed.

**Amount parsing strips commas before parsing**, specifically to handle the
Indian numbering convention (`25,00,000`, lakhs/crores grouping) — `1234.56`
and `12,34,567` both parse correctly; a Western-grouped `1,234,567` also
happens to parse correctly since comma-stripping doesn't care about grouping
position.

**Date parsing tries three formats in order**: ISO `YYYY-MM-DD`, then
`DD/MM/YYYY` (and `-`/`.` separated variants — the Indian convention), then
falls back to `MM/DD/YYYY` only when the middle number is `>12` (i.e. can't
possibly be a day-first date). An ambiguous date like `03/04/2026` is always
read as DD/MM (3 April), never MM/DD — there is no locale setting to change
this, because the target users are exclusively Indian UCBs.

### Adding a new bulk-import feature

1. Reuse `parseExcelBuffer`/`parseCsvBuffer` for the raw-string stage — don't
   write a new ExcelJS reader; `getCellValue`'s handling of formula results,
   rich text, and date formatting is the part most worth not reimplementing.
2. Add your canonical field names and aliases to `CANONICAL_HEADERS` (or a
   new `MODULE_FIELD_CONFIGS` entry in `types.ts` if the fields are specific
   to your module rather than shared across loan-portfolio imports).
3. Write mandatory-field checks and graceful-degradation defaults following
   `validateAndTransformRows`'s pattern — reject on truly required fields,
   warn-and-default on everything else.
4. Gate the upload action on the narrowest permission that fits (loan
   portfolio import requires `rbia:examine`, not a generic `admin:*`).
5. Enforce a file size limit before parsing (10MB in
   `parse-excel-file.ts`) — parse the buffer only after the size check
   passes, not before.

## Export: XLSX report generation

`generateXlsxReport` (`src/actions/reports/generate-xlsx.ts`) gates on
`report:generate`, builds the workbook via
`generateAuditReportXLSX` (`src/lib/excel-export/audit-report-generator.ts`),
then uploads the result to S3 (`uploadToS3`) rather than streaming it
directly to the browser — the action returns a reference to fetch, not the
file bytes themselves. Report generation is itself an audited action
(`withAuditedMutation`), since generating a formal report is a recorded
event in the audit trail, not an incidental read.

If you're adding a new report type: follow `audit-report-generator.ts`'s
structure (one function builds the workbook, `report-utils.ts` holds shared
formatting helpers — column widths, header styling, number formats),
upload via `uploadToS3` rather than returning the buffer from the server
action, and gate on the specific `report:*` permission that matches what the
report actually contains (`report:generate` for a routine report,
`report:approve` if generating it constitutes sign-off).

## Related

- Onboarding also parses an uploaded Excel file
  (`src/lib/excel-parsers/org-structure-parser.ts`,
  `onboarding-excel-upload.ts`) for bulk department/branch setup — the same
  parse-then-validate shape, simpler because it has no fuzzy column
  matching (the onboarding template's headers are fixed, generated by
  `excel-templates/org-structure-template.ts`, not free-form bank exports).
- [`docs/reference/routes.md`](../reference/routes.md) lists every download
  and export API endpoint; [`docs/reference/api-reference.md`](../reference/api-reference.md)
  lists every server action, including the ones named here.
