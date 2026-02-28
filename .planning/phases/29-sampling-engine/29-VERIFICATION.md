---
phase: 29-sampling-engine
verified: 2026-02-28T22:30:00Z
status: passed
score: 4/4 must-haves verified
---

# Phase 29: Sampling Engine — Verification Report

**Phase Goal:** HIA can define sampling criteria with locked % share allocations that auditors cannot modify, and the system auto-selects a representative sample of accounts from the uploaded portfolio based on those criteria.

**Verified:** 2026-02-28
**Status:** PASSED
**Score:** 4/4 observable truths verified

## Observable Truths Verification

### Truth 1: HIA can set overall sample size % and allocate across 5 criteria buckets with locked % share

**Status:** VERIFIED

**Evidence:**

1. **Sample size input field exists:**
   - File: `/Users/admin/Developer/AEGIS/src/components/sampling/criteria-config-form.tsx` (lines 316-341)
   - HIA can input percentage (1-100%) with display "% of N accounts = M accounts" showing real-world impact

2. **5 criteria bucket rows with percentage inputs:**
   - File: `/Users/admin/Developer/AEGIS/src/components/sampling/criteria-config-form.tsx` (lines 343-414)
   - Fixed buckets: NEWLY_SANCTIONED, AMOUNT_WISE, AGE_WISE, DPD_WISE, PRIOR_OBSERVATIONS
   - Each row has editable percentage input (0-100, step 1)

3. **Running total validation - must sum to 100%:**
   - File: `/Users/admin/Developer/AEGIS/src/components/sampling/criteria-config-form.tsx` (lines 226-227, 398-413)
   - Total shown in green when = 100%, red otherwise
   - Save button disabled until sum = 100% (line 418: `disabled={!isValid || isDisabled}`)

4. **Allocations persist and lock on generation:**
   - File: `/Users/admin/Developer/AEGIS/src/actions/sampling/save-criteria.ts` (lines 23-113)
   - Server action `saveSamplingCriteria` validates bucket sum = 100% via Zod schema (schemas.ts)
   - Config upserted to SamplingConfig model with criteriaBuckets JSONB

5. **Config locks on sample generation:**
   - File: `/Users/admin/Developer/AEGIS/src/actions/sampling/generate-sample.ts` (lines 144-154)
   - Config marked with `isLocked: true, sampleGenerated: true` in transaction
   - Locked state displayed in UI with "Criteria are locked" banner (criteria-config-form.tsx, lines 299-314)

### Truth 2: Auditors viewing sampling page see read-only criteria display with no edit controls visible

**Status:** VERIFIED

**Evidence:**

1. **Read-only view branch for auditors:**
   - File: `/Users/admin/Developer/AEGIS/src/components/sampling/criteria-config-form.tsx` (lines 76-149)
   - `ReadOnlyView` component renders plain text table with no input fields
   - Main component checks `canEdit` prop (line 161) to render read-only vs editable

2. **Page-level role check before component render:**
   - File: `/Users/admin/Developer/AEGIS/src/app/\(dashboard\)/audit-execution/\[engagementId\]/rbia/sampling/page.tsx` (lines 49-52)
   - `hasPermission(userRoles, "audit_execution:manage_sections")` determines `canConfigureSampling`
   - Passed to CriteriaConfigForm as `canEdit={canConfigureSampling}` (line 70-71)

3. **No hidden or disabled inputs for auditors:**
   - File: `/Users/admin/Developer/AEGIS/src/components/sampling/criteria-config-form.tsx` (lines 85-148)
   - ReadOnlyView only renders Card with text display, no Button or Input components
   - Auditors see bucket names, descriptions, and percentages as plain text

4. **Lock icon and attribution text:**
   - File: `/Users/admin/Developer/AEGIS/src/app/\(dashboard\)/audit-execution/\[engagementId\]/rbia/sampling/page.tsx` (lines 55-65)
   - Lock icon and "Sampling criteria configured by [name] on [date]" shown when config.isLocked
   - Uses `getSamplingConfigWithCreator` DAL function to fetch creator attribution

### Truth 3: After HIA saves criteria and clicks "Generate Sample", system auto-selects accounts and displays them

**Status:** VERIFIED

**Evidence:**

1. **Generate Sample button triggers sample generation:**
   - File: `/Users/admin/Developer/AEGIS/src/components/sampling/criteria-config-form.tsx` (lines 260-280)
   - `handleGenerate` calls `generateSampleAction` server action with confirmation prompt
   - Button shown only when `savedConfig && !isLocked` (line 427)

2. **Pure sampling algorithm with deterministic bucket-fill:**
   - File: `/Users/admin/Developer/AEGIS/src/lib/sampling-engine.ts` (lines 246-367)
   - `generateSample(input: SamplingInput): SamplingResult` function
   - Selects accounts based on 5 criteria: DPD-wise (highest DPD first), Amount-wise (largest outstanding), Age-wise (oldest sanction dates), Newly Sanctioned (within 12 months), Prior Observations (flagged accounts)
   - Deterministic ordering ensures same input always produces same output (tie-breaker: account id)

3. **Selected accounts visible in sample list table:**
   - File: `/Users/admin/Developer/AEGIS/src/components/sampling/sample-list-table.tsx` (lines 90-310)
   - Displays Account No, Borrower Name, Sanction Amount (₹), Outstanding (₹), DPD, Asset Class, and Criteria Bucket badge
   - Each row is clickable linking to account examination page (line 235: href `/audit-execution/[id]/rbia/account/[accountId]`)

4. **Sample generation marks accounts in database:**
   - File: `/Users/admin/Developer/AEGIS/src/actions/sampling/generate-sample.ts` (lines 92-155)
   - Transaction resets previous sample, marks new accounts with `isSampled: true, sampledAt: now`
   - `samplingBucket` stored in LoanAccount.metadata JSONB for UI display

5. **Sample list loads and displays:**
   - File: `/Users/admin/Developer/AEGIS/src/app/\(dashboard\)/audit-execution/\[engagementId\]/rbia/sampling/page.tsx` (lines 66-72)
   - Page fetches sampled accounts via `getSampledAccounts` DAL function
   - Passed to SampleListTable component for display

### Truth 4: If bucket requests more accounts than exist, system fills from next bucket and displays warning

**Status:** VERIFIED

**Evidence:**

1. **Overflow redistribution algorithm:**
   - File: `/Users/admin/Developer/AEGIS/src/lib/sampling-engine.ts` (lines 309-359)
   - First pass fills each bucket, tracking shortfalls
   - Redistribution pass: if bucket has insufficient accounts, redirects to next-largest bucket (by pct)
   - Records `RedistributionWarning` for each underfilled bucket with: requested, filled, shortfall, redistributedTo

2. **Warnings returned to UI:**
   - File: `/Users/admin/Developer/AEGIS/src/actions/sampling/generate-sample.ts` (lines 174-181)
   - Return includes `warnings: RedistributionWarning[]` from engine
   - Toast notification: "Sample generated: N accounts selected. See warnings below." (criteria-config-form.tsx, line 274)

3. **Warnings displayed prominently:**
   - File: `/Users/admin/Developer/AEGIS/src/components/sampling/criteria-config-form.tsx` (lines 441-465)
   - Amber Alert component shown when `warnings.length > 0`
   - Lists each warning: "Bucket: X/Y filled, Z redistributed to OtherBucket"

4. **No errors or crashes on empty segment:**
   - File: `/Users/admin/Developer/AEGIS/src/lib/sampling-engine.ts` (lines 288-307)
   - Algorithm handles empty pools gracefully with `eligible.length === 0` check
   - Edge case test: empty portfolio returns `{ sampledAccounts: [], warnings: [], ... }`

## Required Artifacts Verification

| Artifact                                                                    | Expected                                | Status     | Evidence                                                                                                                                         |
| --------------------------------------------------------------------------- | --------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/sampling-engine.ts`                                                | Pure sampling algorithm (375 lines)     | ✓ VERIFIED | Exports: BucketAllocation, SamplingInput, SampledAccount, RedistributionWarning, SamplingResult, generateSample function                         |
| `src/lib/__tests__/sampling-engine.test.ts`                                 | 25+ unit tests                          | ✓ VERIFIED | 643 lines, 25 tests across 11 describe blocks; all pass                                                                                          |
| `src/data-access/sampling.ts`                                               | 5 DAL functions with tenant isolation   | ✓ VERIFIED | getSamplingConfig, getSamplingConfigWithCreator, getLoanAccountsForSampling, getSampledAccounts, getLoanAccountCount; all include WHERE tenantId |
| `src/actions/sampling/save-criteria.ts`                                     | Server action with validation           | ✓ VERIFIED | "use server" directive, hasPermission check, bucket sum validation via Zod                                                                       |
| `src/actions/sampling/generate-sample.ts`                                   | Server action wired to engine           | ✓ VERIFIED | Imports generateSample, calls engine, marks isSampled in transaction, locks config                                                               |
| `src/actions/sampling/schemas.ts`                                           | Zod schemas for input validation        | ✓ VERIFIED | SaveCriteriaSchema with bucket sum refine, GenerateSampleSchema                                                                                  |
| `src/components/sampling/criteria-config-form.tsx`                          | HIA criteria config + auditor read-only | ✓ VERIFIED | "use client", canEdit branching, ReadOnlyView for auditors, EditableForm for HIA                                                                 |
| `src/components/sampling/sample-list-table.tsx`                             | Sample display with bucket badges       | ✓ VERIFIED | Colored badges, sortable columns, bucket filter dropdown                                                                                         |
| `src/app/(dashboard)/audit-execution/[engagementId]/rbia/sampling/page.tsx` | Sampling tab page route                 | ✓ VERIFIED | Server component, fetches config + sampled accounts, renders components                                                                          |
| `src/app/(dashboard)/audit-execution/[engagementId]/rbia/layout.tsx`        | Sampling tab in RBIA nav                | ✓ VERIFIED | TabNav entry with href `/sampling` between Examination and Findings                                                                              |

## Key Wiring Verification

| Link                     | Expected                                     | Status     | Evidence                                                                                                    |
| ------------------------ | -------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------- |
| Page → DAL               | Page fetches config, accounts, count         | ✓ VERIFIED | Lines 66-72 in sampling/page.tsx call getSamplingConfigWithCreator, getSampledAccounts, getLoanAccountCount |
| Form → Save action       | Form calls saveSamplingCriteria on Save      | ✓ VERIFIED | Line 242 in criteria-config-form.tsx imports and calls saveSamplingCriteria                                 |
| Form → Generate action   | Form calls generateSampleAction on Generate  | ✓ VERIFIED | Line 267 in criteria-config-form.tsx imports and calls generateSampleAction                                 |
| Save action → DB         | Server action upserts SamplingConfig         | ✓ VERIFIED | Line 64 in save-criteria.ts calls db.samplingConfig.upsert                                                  |
| Generate action → Engine | Server action calls generateSample           | ✓ VERIFIED | Line 85 in generate-sample.ts calls generateSample with accounts + config                                   |
| Generate action → DB     | Server action marks isSampled + locks config | ✓ VERIFIED | Lines 92-155 in generate-sample.ts transaction updates LoanAccount and SamplingConfig                       |
| Table → Account exam     | Sample rows link to account exam page        | ✓ VERIFIED | Line 235 in sample-list-table.tsx: href `/audit-execution/[id]/rbia/account/[accountId]`                    |

## Requirements Coverage

| Requirement | Defined in    | Description                                            | Status      | Evidence                                                                            |
| ----------- | ------------- | ------------------------------------------------------ | ----------- | ----------------------------------------------------------------------------------- |
| SMPL-01     | 29-01-PLAN.md | HIA can configure sampling criteria with % allocations | ✓ SATISFIED | Criteria config form with 5 bucket percentage inputs, validation sum=100%           |
| SMPL-02     | 29-02-PLAN.md | HIA can set overall sample size %                      | ✓ SATISFIED | Sample size percentage input (1-100%) with calculated account count display         |
| SMPL-03     | 29-03-PLAN.md | Auditors see read-only view, cannot modify             | ✓ SATISFIED | ReadOnlyView component renders text-only, no edit controls; role check canEdit prop |
| SMPL-04     | 29-01-PLAN.md | System auto-selects sample from portfolio              | ✓ SATISFIED | Pure generateSample algorithm selects accounts per bucket criteria                  |

## Anti-Patterns Scan

| File                     | Pattern                                         | Severity | Status                                               |
| ------------------------ | ----------------------------------------------- | -------- | ---------------------------------------------------- |
| sampling-engine.ts       | Edge cases (empty portfolio, rounding)          | Info     | ✓ HANDLED — returns empty result, rounding corrected |
| criteria-config-form.tsx | No console.log, no TODOs, no placeholders       | Info     | ✓ CLEAN                                              |
| sample-list-table.tsx    | No stub implementations, full sorting/filtering | Info     | ✓ COMPLETE                                           |
| save-criteria.ts         | Permission check + validation before upsert     | Info     | ✓ SECURE                                             |
| generate-sample.ts       | Transaction wraps multi-step operation          | Info     | ✓ ATOMIC                                             |

**Verdict:** No anti-patterns found. All implementations substantive.

## Human Verification Items

### 1. HIA Criteria Configuration UX

**Test:** Log in as CAE/HIA role, navigate to sampling tab, enter sample size and bucket percentages

**Expected:**

- Save button enabled only when bucket percentages sum to 100%
- Running total shows red text when != 100%, green when = 100%
- After save, Generate Sample button appears

**Why human:** Visual feedback and button enable/disable logic best verified with actual interaction

### 2. Auditor Read-Only View

**Test:** Log in as AUDITOR role, navigate to sampling tab after HIA has configured criteria

**Expected:**

- No input fields visible (no textbox, no number inputs)
- Criteria table shows bucket names, descriptions, percentages as text only
- Lock icon visible with attribution "Sampling criteria configured by [HIA name] on [date]"
- No Save or Generate buttons

**Why human:** Role-based access control requires verifying actual user role in session

### 3. Sample Generation with Overflow Handling

**Test:** Configure sampling with skewed allocations (e.g., 60% on newly sanctioned, 10% each on others); generate sample on portfolio with few newly sanctioned accounts

**Expected:**

- Generate Sample succeeds without error
- Warning shown: "Newly Sanctioned: X/Y filled, Z redistributed to Amount-wise"
- Sample list displays all selected accounts with correct bucket badges
- Total selected accounts matches portfolio size × sample percentage

**Why human:** Overflow redistribution logic requires realistic data scenario to test

### 4. Sample List Sorting and Filtering

**Test:** View sample list table; click Account No column header, then filter by bucket dropdown

**Expected:**

- Table re-sorts by Account No ascending/descending
- Bucket filter dropdown shows 5 options (All Buckets, Newly Sanctioned, Amount-wise, Age-wise, DPD-wise, Prior Observations)
- Filtering displays only accounts in selected bucket

**Why human:** Client-side state management and React rendering best verified with interaction

### 5. Sample List Account Links (Phase 30 Integration)

**Test:** Click an account row in sample list

**Expected:**

- Navigates to `/audit-execution/[engagementId]/rbia/account/[accountId]` (404 expected — Phase 30 not yet built)
- Link structure correct for Phase 30 to implement account examination UI

**Why human:** Navigation to Phase 30 route not testable until Phase 30 exists

## Build and Test Status

```
Test Files: 7 passed (7)
Tests: 307 passed (307)
    - src/lib/__tests__/sampling-engine.test.ts: 25 tests ✓ PASS
    - Covers: bucket fill, overflow, deduplication, deterministic ordering, edge cases

Build: PASS
    - pnpm build completes successfully
    - Route compiled: /audit-execution/[engagementId]/rbia/sampling ✓
    - No TypeScript errors in sampling files
```

## Gaps Found

None. All four observable truths verified. All artifacts exist and are substantive. All key links wired. All requirements covered.

## Summary

Phase 29 successfully delivers a complete sampling engine system:

1. **Algorithm (Plan 01):** Pure, deterministic, deterministic bucket-fill with overflow redistribution. 25 tests verify all edge cases.

2. **Backend (Plan 02):** DAL functions with tenant isolation + server actions for criteria management and sample generation. Config locking enforces immutability.

3. **UI (Plan 03):** HIA gets editable criteria form with real-time validation and calculated counts. Auditors see read-only view with no edit controls. Sample list displays with colored bucket badges, sorting, and filtering.

4. **Integration:** All components wired together. Page fetches data, forms call actions, actions call engine, engine persists results.

**Goal achieved:** HIA can define locked sampling criteria with % allocations, and the system auto-selects a representative sample that auditors view in read-only mode.

---

_Verified: 2026-02-28T22:30:00Z_
_Verifier: Claude (gsd-verifier)_
