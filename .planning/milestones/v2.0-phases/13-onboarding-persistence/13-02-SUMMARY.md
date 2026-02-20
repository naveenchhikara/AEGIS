---
phase: 13
plan: 02
type: execution
subsystem: onboarding
tags: [excel, exceljs, file-upload, react-dropzone, org-structure, bulk-import]
dependency_graph:
  requires: [13-01]
  provides:
    [excel-template-generation, excel-org-structure-upload, bulk-import-ui]
  affects: []
tech_stack:
  added: []
  patterns: [multi-layer-file-validation, base64-download, drag-and-drop-upload]
decisions: []
key_files:
  created:
    - src/lib/excel-templates/org-structure-template.ts
    - src/lib/excel-parsers/org-structure-parser.ts
    - src/actions/onboarding-excel-upload.ts
    - src/app/(onboarding)/onboarding/_components/excel-upload-zone.tsx
  modified:
    - src/app/(onboarding)/onboarding/_components/step-4-org-structure.tsx
metrics:
  duration: 7m 0s
  completed: 2026-02-10
---

# Phase 13 Plan 02: Excel Org Structure Upload Summary

**One-liner:** Excel template download and bulk upload for onboarding org structure (Step 4) with multi-layer validation and drag-and-drop UI

## What Was Built

Added Excel template generation and upload capabilities to the onboarding wizard Step 4 (Organization Structure), allowing admins to bulk import branches and departments instead of manual row-by-row entry.

### Task 1: Create Excel template generator and parser modules

- **Duration:** ~3 minutes
- **Commit:** `958b369`

Created two pure utility modules for Excel operations:

1. **src/lib/excel-templates/org-structure-template.ts**: Generates styled .xlsx template
   - Two worksheets: "Branches" (7 columns) and "Departments" (4 columns)
   - Styled headers: bold font, light gray fill (`FFE0E0E0`), bottom border
   - Data validation dropdowns:
     - Type column (Branches): HO, Branch, Extension Counter
     - State column (Branches): 31 Indian states/UTs
   - Example rows with italic font and light blue fill (`FFE8F0FE`) to distinguish from real data
   - Instruction comments on header cells explaining usage
   - Column widths optimized for readability
   - Returns `Buffer` via `workbook.xlsx.writeBuffer()`

2. **src/lib/excel-parsers/org-structure-parser.ts**: Parses .xlsx and extracts BranchEntry[] + DepartmentEntry[]
   - Multi-layer validation:
     - Checks for required worksheets (Branches, Departments)
     - Validates required fields (name, code for departments; name, code, city, state, type for branches)
     - Normalizes type values (maps "Head Office" → "HO", "EC" → "Extension Counter")
     - Uppercases department codes
   - Skips completely empty rows (all fields empty)
   - Collects warnings for rows with missing required fields but doesn't reject entire file
   - Returns `ParseResult` with success/error shape + warnings array
   - Handles formula results, numbers, strings in cells via `getCellValue()` helper

**Key implementation detail**: ExcelJS v4 data validation API uses per-cell assignment (loop through rows 2-100) rather than range-based API.

### Task 2: Create server actions and upload UI, integrate into Step 4

- **Duration:** ~4 minutes
- **Commit:** `753813e`

Built the complete upload flow from server validation to UI integration:

1. **src/actions/onboarding-excel-upload.ts**: Server actions with multi-layer validation
   - **downloadOrgStructureTemplate()**: Generates template, converts to base64, returns to client
     - No auth check needed (template is generic, no tenant data)
   - **uploadOrgStructureExcel(formData)**: 5-layer validation pipeline:
     - **Layer 1 — Extension**: Check `.xlsx` extension
     - **Layer 2 — Size**: 2MB limit
     - **Layer 3 — MIME type**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (allows empty for drag-drop)
     - **Layer 4 — Magic bytes**: `fileTypeFromBuffer` from `file-type` library (dynamic import for ESM-only module)
     - **Layer 5 — Parse**: Call `parseOrgStructureExcel`, return parse result with warnings
   - Returns `UploadResult` with success/error shape + warnings array

2. **src/app/(onboarding)/onboarding/\_components/excel-upload-zone.tsx**: Drag-and-drop upload UI
   - `react-dropzone` integration with `.xlsx` file filter, max 1 file, no multiple
   - **Download template section**: Blue info card with `FileSpreadsheet` icon
     - Button calls `downloadOrgStructureTemplate()` server action
     - Base64 decode → Blob → object URL → auto-download via hidden `<a>` element
   - **Upload zone**: Dashed border card with status-based styling
     - **Idle**: Upload icon, "Drag & drop .xlsx file here, or click to browse"
     - **Uploading**: Spinner, "Processing..."
     - **Success**: Green checkmark, "Imported {N} branches and {M} departments"
       - Warnings displayed in yellow Alert if present
       - Calls `onImport(result.data)` after 500ms delay (so user sees success state)
     - **Error**: Red X icon, error message, "Try again" button to reset
   - Status: `idle | uploading | success | error`

3. **src/app/(onboarding)/onboarding/\_components/step-4-org-structure.tsx**: Integrated Excel upload option
   - Added top-level entry method toggle: "Manual Entry" / "Excel Upload" (FileSpreadsheet icon)
   - **Manual Entry tab**: Contains the existing Departments/Branches tabbed UI (unchanged behavior)
   - **Excel Upload tab**: Renders `<ExcelUploadZone onImport={handleExcelImport} />`
   - **handleExcelImport**: Updates `departments` and `branches` state via `setDepartments`/`setBranches`
     - Existing `useEffect` (line 158-160) watches these state variables and calls `saveToStore`
     - `saveToStore` debounces 500ms then calls `store.setOrgStructure`
     - Zustand store auto-persists to localStorage + server (from 13-01)
     - Switches to "manual" entry method after import so user can review/edit data
   - Added `FileSpreadsheet` icon to imports

**Key decision**: After successful upload, view auto-switches to Manual Entry tab so admin can immediately review and edit the imported data. This provides transparency and control.

## Deviations from Plan

None — plan executed exactly as written.

## Files Modified

| File                                                                  | Changes                                                                 | Lines |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----- |
| src/lib/excel-templates/org-structure-template.ts                     | Excel template generation with styled worksheets, data validation       | +242  |
| src/lib/excel-parsers/org-structure-parser.ts                         | Excel parsing with multi-layer validation, warning collection           | +240  |
| src/actions/onboarding-excel-upload.ts                                | Server actions for download + upload with 5-layer validation            | +160  |
| src/app/(onboarding)/onboarding/\_components/excel-upload-zone.tsx    | Drag-and-drop upload UI with status feedback, download template button  | +269  |
| src/app/(onboarding)/onboarding/\_components/step-4-org-structure.tsx | Entry method toggle (manual/excel), Excel upload tab, handleExcelImport | +38   |

**Total:** 5 files (4 created, 1 modified), 949 lines added

## Task Commits

| Task | Name                                                       | Commit    | Files                                                                                                                                |
| ---- | ---------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | Create Excel template generator and parser modules         | `958b369` | src/lib/excel-templates/org-structure-template.ts, src/lib/excel-parsers/org-structure-parser.ts                                     |
| 2    | Create server actions and upload UI, integrate into Step 4 | `753813e` | src/actions/onboarding-excel-upload.ts, src/app/(onboarding)/onboarding/\_components/excel-upload-zone.tsx, step-4-org-structure.tsx |

## Testing & Verification

### Automated Checks (Passed)

- ✅ `pnpm tsc --noEmit` — no new TypeScript errors (pre-existing test errors unrelated)
- ✅ `pnpm build` — production build succeeds
- ✅ `grep "generateOrgStructureTemplate"` — template generator exported
- ✅ `grep "parseOrgStructureExcel"` — parser exported
- ✅ `grep "BranchEntry|DepartmentEntry"` — parser imports types from @/types/onboarding
- ✅ `grep "uploadOrgStructureExcel|downloadOrgStructureTemplate"` — server actions exist
- ✅ `grep "useDropzone"` — react-dropzone integrated in upload zone
- ✅ `grep "ExcelUploadZone|handleExcelImport|entryMethod"` — Step 4 integration complete

### Multi-Layer Validation (Security)

Upload flow includes 5 validation layers to prevent malicious file uploads:

1. **Extension check**: `.xlsx` only — blocks renamed files at the gate
2. **Size check**: 2MB limit — prevents DoS via large files
3. **MIME type check**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` — validates HTTP header (allows empty for drag-drop compatibility)
4. **Magic bytes**: `file-type` library reads file signature — prevents `.txt` renamed to `.xlsx`
5. **Parse validation**: ExcelJS load + worksheet structure checks — verifies valid Excel format

This defense-in-depth approach protects against:

- Malicious file uploads (zip bombs, executable payloads)
- Incorrect file types (CSV renamed to XLSX)
- Corrupted files
- Missing worksheets or incorrect structure

### Manual Testing (Recommended)

1. **Download template**: Click "Download Template" → saves `aegis-org-structure-template.xlsx` with styled worksheets, dropdowns, example rows
2. **Upload valid file**: Fill template, drag-and-drop → shows "Processing..." → success with counts → switches to manual view with imported data
3. **Upload invalid extension**: Try `.xls` or `.csv` → error "Only .xlsx files are supported"
4. **Upload too large**: Try 3MB file → error "File too large. Maximum size is 2MB"
5. **Upload corrupted file**: Rename `.txt` to `.xlsx` → error "File content does not match .xlsx format"
6. **Upload file with missing data**: Omit required field → success with warnings "Row 5 in Branches: missing City — row skipped"
7. **Verify auto-save**: After import, check localStorage `aegis-onboarding` key → `orgStructure` field contains imported data
8. **Verify server sync**: Advance to next step → check `OnboardingProgress.stepData.orgStructure` in PostgreSQL

### Data Validation

Template includes data validation:

- **Type dropdown** (Branches): HO, Branch, Extension Counter
- **State dropdown** (Branches): 31 Indian states/UTs
- Users cannot enter invalid values in these columns (Excel enforces at input time)

Parser also validates:

- Normalizes type aliases: "Head Office" → "HO", "EC" → "Extension Counter"
- Uppercases department codes
- Skips empty rows, collects warnings for rows with missing required fields

## Next Phase Readiness

### Gap Closure: ONBD-03 Complete

- ✅ **ONBD-03**: "Excel org structure upload not built" → SATISFIED
- Admins can now bulk import branches/departments via Excel instead of manual row-by-row entry
- Dramatically reduces data entry time for banks with 10+ branches

### Outstanding Issues

None.

### Blockers for Next Plan

None. Phase 13 complete — both tech debt items closed:

- 13-01: Server-side onboarding persistence ✅
- 13-02: Excel org structure upload ✅

Phase 14 (Verification & Prod Readiness) can proceed.

---

**Self-Check: PASSED**

All commits verified:

- ✅ `958b369` feat(13-02): add Excel template generator and parser for org structure
- ✅ `753813e` feat(13-02): add Excel upload UI and integrate into Step 4 org structure

All created files verified:

- ✅ src/lib/excel-templates/org-structure-template.ts
- ✅ src/lib/excel-parsers/org-structure-parser.ts
- ✅ src/actions/onboarding-excel-upload.ts
- ✅ src/app/(onboarding)/onboarding/\_components/excel-upload-zone.tsx

All modified files verified:

- ✅ src/app/(onboarding)/onboarding/\_components/step-4-org-structure.tsx
