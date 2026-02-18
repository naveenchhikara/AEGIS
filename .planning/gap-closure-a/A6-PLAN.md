---
phase: gap-closure-a
plan: A6
type: execute
wave: 1
depends_on: []
files_modified:
  - src/actions/audit-execution/loan-review.ts
  - src/actions/audit-execution/sma-npa.ts
  - src/actions/audit-execution/import-loan-csv.ts
  - src/actions/audit-execution/schemas.ts
  - src/data-access/loan-review.ts
  - src/components/audit-execution/loan-review-table.tsx
  - src/components/audit-execution/loan-review-form.tsx
  - src/components/audit-execution/loan-csv-import.tsx
  - src/components/audit-execution/sma-npa-summary.tsx
  - src/app/(dashboard)/audit-execution/[id]/loan-review/page.tsx
  - src/app/(dashboard)/audit-execution/[id]/sma-npa/page.tsx
autonomous: true
gap_closure: true
must_haves:
  truths:
    - "LoanReview records can be created, listed, and edited per engagement"
    - "Bulk CSV import creates multiple LoanReview records from uploaded CSV"
    - "SmaNpaEntry CRUD works with category-wise summaries per engagement"
    - "SMA/NPA summary page shows category breakdown (SMA0/SMA1/SMA2/NPA_SUB/NPA_DOUBTFUL/NPA_LOSS)"
    - "Loan review page is accessible at /audit-execution/[id]/loan-review"
    - "SMA/NPA page is accessible at /audit-execution/[id]/sma-npa"
  artifacts:
    - path: "src/actions/audit-execution/loan-review.ts"
      provides: "Server actions for LoanReview CRUD"
      exports: ["createLoanReview", "updateLoanReview", "deleteLoanReview"]
    - path: "src/actions/audit-execution/import-loan-csv.ts"
      provides: "Server action for bulk CSV import of loan reviews"
      exports: ["importLoanReviewCsv"]
    - path: "src/actions/audit-execution/sma-npa.ts"
      provides: "Server actions for SmaNpaEntry CRUD"
      exports: ["saveSmaNpaEntries"]
    - path: "src/data-access/loan-review.ts"
      provides: "DAL for LoanReview and SmaNpaEntry queries"
      exports: ["getLoanReviewsForEngagement", "getSmaNpaEntriesForEngagement"]
      min_lines: 40
    - path: "src/app/(dashboard)/audit-execution/[id]/loan-review/page.tsx"
      provides: "Loan review page with table + CSV import"
      contains: "LoanReviewTable"
    - path: "src/app/(dashboard)/audit-execution/[id]/sma-npa/page.tsx"
      provides: "SMA/NPA summary page"
      contains: "SmaNpaSummary"
  key_links:
    - from: "src/components/audit-execution/loan-csv-import.tsx"
      to: "src/actions/audit-execution/import-loan-csv.ts"
      via: "CSV file parse + server action call"
      pattern: "importLoanReviewCsv"
    - from: "src/components/audit-execution/sma-npa-summary.tsx"
      to: "src/actions/audit-execution/sma-npa.ts"
      via: "Batch save of category entries"
      pattern: "saveSmaNpaEntries"
---

## Objective

Implement R20 (LoanReview CRUD + CSV import), R21 (SmaNpaEntry category-wise summary), and R25 (loan review form with bulk import). All three Prisma models exist. This plan builds the complete loan portfolio review and asset quality capture workflow.

**Purpose:** Enable auditors to review individual loan accounts during audit execution, import loan data in bulk from CBS extracts, and capture SMA/NPA category summaries — core sections of the bank audit format.

**Output:**
- LoanReview CRUD + bulk CSV import action
- SmaNpaEntry batch save action
- Loan review table with add/edit/delete + CSV import UI
- SMA/NPA summary form with category-wise capture
- Two new pages within audit execution

## Execution Context

@/root/.openclaw/workspace/.claude/agents/gsd-planner.md
@/root/.openclaw/workspace/.claude/workflows/execute-plan.md

## Context

@AEGIS/.planning/REQUIREMENTS.md — R20, R21, R25 specifications
@AEGIS/.planning/VALIDATION-REPORT.md — LoanReview/SmaNpaEntry gaps
@AEGIS/.planning/codebase/CONVENTIONS.md — Server action + DAL + form patterns
@AEGIS/prisma/schema.prisma — LoanReview model, SmaNpaEntry model
@AEGIS/src/actions/audit-execution/submit-examination-response.ts — Reference action pattern
@AEGIS/src/data-access/audit-execution.ts — Reference DAL pattern

## Tasks

<task type="auto">
  <name>Task 1: DAL — Loan review and SMA/NPA data access</name>
  <files>src/data-access/loan-review.ts</files>
  <action>
  Create `src/data-access/loan-review.ts`:

  ```typescript
  import "server-only";
  import { prismaForTenant } from "./prisma";
  import type { Session } from "@/lib/auth";
  ```

  **Functions:**

  **`getLoanReviewsForEngagement(session, engagementId, options?)`:**
  - Query LoanReview where engagementId + tenantId
  - Optional filters: `assetClass`, `productType`
  - Order by: `accountNo` ascending
  - Return full records (no select subset — data table needs all fields)
  - Support pagination via `skip`/`take` if options provided

  **`getLoanReviewSummary(session, engagementId)`:**
  - Aggregate query:
    ```typescript
    const summary = await db.loanReview.groupBy({
      by: ["assetClass"],
      where: { engagementId, tenantId },
      _count: true,
      _sum: { outstandingAmount: true, sanctionAmount: true },
    });
    ```
  - Return aggregated counts and totals per asset class

  **`getSmaNpaEntriesForEngagement(session, engagementId)`:**
  - Query SmaNpaEntry where engagementId + tenantId
  - Order by: custom category order (SMA0, SMA1, SMA2, NPA_SUB_STANDARD, NPA_DOUBTFUL, NPA_LOSS)
  - Return all entries

  **`getEngagementForLoanReview(session, engagementId)`:**
  - Get engagement with branch select (for context display)
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/data-access/loan-review.ts 2>&1 | head -20
  ```
  </verify>
  <done>
  - All four functions exported
  - All use prismaForTenant with tenantId
  - getLoanReviewSummary uses groupBy aggregation
  - TypeScript compiles
  </done>
</task>

<task type="auto">
  <name>Task 2: Schemas — Loan review and SMA/NPA validation</name>
  <files>src/actions/audit-execution/schemas.ts</files>
  <action>
  Add to existing schemas file:

  ```typescript
  // ─── Loan Review ──────────────────────────────────────────────
  const ASSET_CLASSES = [
    "STANDARD", "SMA0", "SMA1", "SMA2",
    "NPA_SUB", "NPA_DOUBTFUL", "NPA_LOSS",
  ] as const;

  export const CreateLoanReviewSchema = z.object({
    engagementId: z.string().uuid(),
    accountNo: z.string().min(1, "Account number is required").max(50),
    borrowerName: z.string().min(1, "Borrower name is required").max(200),
    productType: z.string().min(1, "Product type is required"),
    sanctionAmount: z.number().positive("Sanction amount must be positive"),
    outstandingAmount: z.number().min(0, "Outstanding amount must be non-negative"),
    assetClass: z.enum(ASSET_CLASSES),
    dpd: z.number().int().min(0).default(0),
    auditObservation: z.string().max(2000).optional(),
  });

  export const UpdateLoanReviewSchema = CreateLoanReviewSchema.extend({
    id: z.string().uuid(),
  });

  export type CreateLoanReviewInput = z.infer<typeof CreateLoanReviewSchema>;
  export type UpdateLoanReviewInput = z.infer<typeof UpdateLoanReviewSchema>;

  // ─── CSV Import ───────────────────────────────────────────────
  export const ImportLoanCsvSchema = z.object({
    engagementId: z.string().uuid(),
    rows: z.array(CreateLoanReviewSchema.omit({ engagementId: true })).min(1).max(5000),
  });

  export type ImportLoanCsvInput = z.infer<typeof ImportLoanCsvSchema>;

  // ─── SMA/NPA Entries ──────────────────────────────────────────
  const SMA_NPA_CATEGORIES = [
    "SMA0", "SMA1", "SMA2",
    "NPA_SUB_STANDARD", "NPA_DOUBTFUL", "NPA_LOSS",
  ] as const;

  export const SaveSmaNpaEntriesSchema = z.object({
    engagementId: z.string().uuid(),
    entries: z.array(z.object({
      category: z.enum(SMA_NPA_CATEGORIES),
      accountCount: z.number().int().min(0),
      totalAmount: z.number().min(0),
      remarks: z.string().max(500).optional(),
    })),
  });

  export type SaveSmaNpaEntriesInput = z.infer<typeof SaveSmaNpaEntriesSchema>;
  ```
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/actions/audit-execution/schemas.ts 2>&1 | head -20
  ```
  </verify>
  <done>
  - All schemas exported with proper types
  - Asset class enum matches Prisma model comments
  - CSV import allows up to 5000 rows
  - SMA/NPA categories match SmaNpaEntry.category values
  - TypeScript compiles
  </done>
</task>

<task type="auto">
  <name>Task 3: Server actions — LoanReview CRUD</name>
  <files>src/actions/audit-execution/loan-review.ts</files>
  <action>
  Create `src/actions/audit-execution/loan-review.ts`:

  ```typescript
  "use server";
  ```

  **`createLoanReview(input: CreateLoanReviewInput)`:**
  - Auth + permission: `examination:respond`
  - Validate with CreateLoanReviewSchema
  - Verify engagement exists + belongs to tenant
  - Create LoanReview record with `tenantId`
  - Set audit context: `loan_review.created`
  - revalidatePath
  - Return `{ success: true, data: { id } }`

  **`updateLoanReview(input: UpdateLoanReviewInput)`:**
  - Auth + permission: `examination:respond`
  - Validate with UpdateLoanReviewSchema
  - Verify LoanReview exists + belongs to tenant (findFirst with id + tenantId)
  - Update record
  - Set audit context: `loan_review.updated`
  - revalidatePath
  - Return `{ success: true, data: { id } }`

  **`deleteLoanReview(input: { id: string; engagementId: string })`:**
  - Auth + permission: `examination:respond`
  - Verify record exists with tenantId
  - Delete record
  - Set audit context: `loan_review.deleted`
  - revalidatePath
  - Return `{ success: true }`
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/actions/audit-execution/loan-review.ts 2>&1 | head -20
  ```
  </verify>
  <done>
  - All three CRUD actions exported
  - Each follows standard boilerplate
  - TenantId in all where clauses
  - Audit context set for all mutations
  - TypeScript compiles
  </done>
</task>

<task type="auto">
  <name>Task 4: Server action — CSV import</name>
  <files>src/actions/audit-execution/import-loan-csv.ts</files>
  <action>
  Create `src/actions/audit-execution/import-loan-csv.ts`:

  ```typescript
  "use server";
  ```

  **`importLoanReviewCsv(input: ImportLoanCsvInput)`:**
  1. Auth + permission: `examination:respond`
  2. Validate with ImportLoanCsvSchema
  3. Verify engagement exists + belongs to tenant
  4. Use transaction to batch-create LoanReview records:
     ```typescript
     await db.$transaction(async (tx: any) => {
       await setAuditContext(tx, { actionType: "loan_review.csv_imported", ... });

       // Delete existing records for this engagement (replace mode)
       await tx.loanReview.deleteMany({
         where: { engagementId: validated.engagementId, tenantId },
       });

       // Create all rows
       await tx.loanReview.createMany({
         data: validated.rows.map(row => ({
           tenantId,
           engagementId: validated.engagementId,
           ...row,
         })),
       });
     });
     ```
  5. revalidatePath
  6. Return `{ success: true, data: { imported: validated.rows.length } }`

  **Note:** CSV parsing happens client-side (using PapaParse or manual split). The server action receives pre-parsed rows.
  The delete-and-recreate approach is intentional — CSV imports are full replacements.
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/actions/audit-execution/import-loan-csv.ts 2>&1 | head -20
  ```
  </verify>
  <done>
  - `importLoanReviewCsv` exported
  - Replace mode: deletes existing then creates all
  - createMany for bulk efficiency
  - tenantId in delete where clause
  - TypeScript compiles
  </done>
</task>

<task type="auto">
  <name>Task 5: Server action — SMA/NPA batch save</name>
  <files>src/actions/audit-execution/sma-npa.ts</files>
  <action>
  Create `src/actions/audit-execution/sma-npa.ts`:

  ```typescript
  "use server";
  ```

  **`saveSmaNpaEntries(input: SaveSmaNpaEntriesInput)`:**
  1. Auth + permission: `examination:respond`
  2. Validate with SaveSmaNpaEntriesSchema
  3. Verify engagement exists + belongs to tenant
  4. Transaction: upsert each entry using @@unique([engagementId, category]):
     ```typescript
     for (const entry of validated.entries) {
       await tx.smaNpaEntry.upsert({
         where: {
           engagementId_category: {
             engagementId: validated.engagementId,
             category: entry.category,
           },
         },
         update: {
           accountCount: entry.accountCount,
           totalAmount: entry.totalAmount,
           remarks: entry.remarks ?? null,
         },
         create: {
           tenantId,
           engagementId: validated.engagementId,
           category: entry.category,
           accountCount: entry.accountCount,
           totalAmount: entry.totalAmount,
           remarks: entry.remarks ?? null,
         },
       });
     }
     ```
  5. Set audit context: `sma_npa.saved`
  6. revalidatePath
  7. Return `{ success: true, data: { saved: entries.length } }`
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/actions/audit-execution/sma-npa.ts 2>&1 | head -20
  ```
  </verify>
  <done>
  - `saveSmaNpaEntries` exported
  - Upsert pattern per category
  - Uses compound unique key
  - tenantId in create data
  - TypeScript compiles
  </done>
</task>

<task type="auto">
  <name>Task 6: Client components — Loan review table, form, CSV import</name>
  <files>src/components/audit-execution/loan-review-table.tsx, src/components/audit-execution/loan-review-form.tsx, src/components/audit-execution/loan-csv-import.tsx</files>
  <action>
  **6a. Create `src/components/audit-execution/loan-review-table.tsx`:**

  "use client" — Data table for loan reviews:
  - Columns: Account No, Borrower, Product, Sanction (₹), Outstanding (₹), Asset Class, DPD, Actions
  - Asset class shown as colored badge (STANDARD=green, SMA*=amber, NPA*=red)
  - Actions: Edit (opens form dialog), Delete (confirmation dialog)
  - Footer row: Total sanction, Total outstanding
  - Use shadcn Table component
  - Props: `{ loanReviews: LoanReview[]; engagementId: string }`

  **6b. Create `src/components/audit-execution/loan-review-form.tsx`:**

  "use client" — Dialog form for add/edit:
  - Uses react-hook-form + zodResolver with CreateLoanReviewSchema
  - Fields: accountNo, borrowerName, productType (select: Term Loan, CC, OD, Gold Loan, etc.), sanctionAmount, outstandingAmount, assetClass (select), dpd, auditObservation (textarea)
  - Submit calls createLoanReview or updateLoanReview based on edit mode
  - Rendered inside Dialog/Sheet from shadcn
  - Props: `{ engagementId: string; existingData?: LoanReview; onClose: () => void }`

  **6c. Create `src/components/audit-execution/loan-csv-import.tsx`:**

  "use client" — CSV import component:
  - File input for CSV file (accept=".csv")
  - Parse CSV client-side using manual split (no PapaParse dependency) or simple parser:
    - Expected columns: account_no, borrower_name, product_type, sanction_amount, outstanding_amount, asset_class, dpd
    - First row = headers, subsequent rows = data
  - Preview table showing first 10 rows
  - "Import" button calls `importLoanReviewCsv` with parsed rows
  - Show row count + success/error counts
  - Warn: "This will replace all existing loan reviews for this engagement"
  - Props: `{ engagementId: string; onImportComplete: () => void }`
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/components/audit-execution/loan-review-table.tsx src/components/audit-execution/loan-review-form.tsx src/components/audit-execution/loan-csv-import.tsx 2>&1 | head -20
  ```
  </verify>
  <done>
  - LoanReviewTable shows data with edit/delete actions
  - LoanReviewForm handles create and edit modes
  - LoanCsvImport parses CSV client-side and sends to server action
  - All three are "use client" components
  - TypeScript compiles
  </done>
</task>

<task type="auto">
  <name>Task 7: Client component — SMA/NPA summary form</name>
  <files>src/components/audit-execution/sma-npa-summary.tsx</files>
  <action>
  Create `src/components/audit-execution/sma-npa-summary.tsx`:

  "use client" — Category-wise SMA/NPA entry form:
  - Fixed rows for 6 categories: SMA-0, SMA-1, SMA-2, NPA Sub-Standard, NPA Doubtful, NPA Loss
  - Columns: Category, Account Count, Total Amount (₹), Remarks
  - Account Count and Total Amount are editable number inputs
  - Remarks is a short text input
  - Total row at bottom (sum of all amounts)
  - "Save" button calls `saveSmaNpaEntries` with all entries
  - Pre-fill with existing data
  - Props:
    ```typescript
    interface SmaNpaSummaryProps {
      engagementId: string;
      existingEntries: Array<{
        category: string;
        accountCount: number;
        totalAmount: number;
        remarks: string | null;
      }>;
    }
    ```
  - Use a local state array with useForm or useState for the 6 rows
  - Toast on save success/error
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/components/audit-execution/sma-npa-summary.tsx 2>&1 | head -20
  ```
  </verify>
  <done>
  - SmaNpaSummary renders 6 category rows with editable fields
  - Pre-fills with existing entries
  - Save action calls saveSmaNpaEntries
  - Total row computed
  - TypeScript compiles
  </done>
</task>

<task type="auto">
  <name>Task 8: Pages — Loan review and SMA/NPA</name>
  <files>src/app/(dashboard)/audit-execution/[id]/loan-review/page.tsx, src/app/(dashboard)/audit-execution/[id]/sma-npa/page.tsx</files>
  <action>
  **8a. Create loan review page** (`/audit-execution/[id]/loan-review`):

  Server component:
  - Fetch engagement context + loan reviews via DAL
  - Fetch summary (getLoanReviewSummary) for stats display
  - Render header with branch name + stats (total loans, total outstanding)
  - Render LoanReviewTable + Add button + LoanCsvImport
  - Layout: Card with tabs "Manual Entry" / "CSV Import"

  **8b. Create SMA/NPA page** (`/audit-execution/[id]/sma-npa`):

  Server component:
  - Fetch engagement context + SMA/NPA entries
  - Convert Decimal types to numbers for client
  - Render SmaNpaSummary component
  - Also show auto-computed summary from loan reviews (getLoanReviewSummary) if available, for comparison
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/app/\(dashboard\)/audit-execution/\[id\]/loan-review/page.tsx src/app/\(dashboard\)/audit-execution/\[id\]/sma-npa/page.tsx 2>&1 | head -20
  ```
  </verify>
  <done>
  - Both pages exist at correct route paths
  - Both are server components fetching data via DAL
  - Decimal → number conversion for client props
  - Loan review page has table + CSV import
  - SMA/NPA page has category summary form
  - TypeScript compiles
  </done>
</task>

## Verification

```bash
# 1. TypeScript compilation
cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit

# 2. Verify loan review CRUD actions
grep -E "export async function (create|update|delete)LoanReview" src/actions/audit-execution/loan-review.ts | wc -l
# Expected: 3

# 3. Verify CSV import action
grep "importLoanReviewCsv" src/actions/audit-execution/import-loan-csv.ts && echo "PASS" || echo "FAIL"

# 4. Verify SMA/NPA action
grep "saveSmaNpaEntries" src/actions/audit-execution/sma-npa.ts && echo "PASS" || echo "FAIL"

# 5. Verify pages exist
test -f src/app/\(dashboard\)/audit-execution/\[id\]/loan-review/page.tsx && echo "PASS" || echo "FAIL"
test -f src/app/\(dashboard\)/audit-execution/\[id\]/sma-npa/page.tsx && echo "PASS" || echo "FAIL"
```

## Success Criteria

1. **R20 gap closed:** LoanReview CRUD fully operational
2. **R21 gap closed:** SmaNpaEntry category-wise summary capture works
3. **R25 gap closed:** Bulk CSV import for loan reviews
4. **Asset classes:** All 7 classes supported (STANDARD through NPA_LOSS)
5. **SMA/NPA categories:** All 6 categories captured
6. **CSV format:** Parses standard CBS export columns
7. **Aggregation:** Loan review summary computed via groupBy
8. **Navigation:** Both pages accessible from audit execution
9. **TypeScript:** All files compile
10. **Conventions:** All patterns follow CONVENTIONS.md
