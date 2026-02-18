---
phase: gap-closure-a
plan: A5
type: execute
wave: 1
depends_on: []
files_modified:
  - src/actions/audit-execution/cash-verification.ts
  - src/actions/audit-execution/schemas.ts
  - src/data-access/cash-verification.ts
  - src/components/audit-execution/cash-verification-form.tsx
  - src/components/audit-execution/denomination-table.tsx
  - src/app/(dashboard)/audit-execution/[id]/cash-verification/page.tsx
autonomous: true
gap_closure: true
must_haves:
  truths:
    - "CashCheck CRUD operations work end-to-end (create, read, update)"
    - "Denomination-level data is captured via JSONB (₹2000, ₹500, ₹200, ₹100, ₹50, ₹20, ₹10, ₹5, ₹2, ₹1)"
    - "ATM balance fields captured as JSONB key-value pairs"
    - "Retention limit validation warns when cashInHand exceeds retentionLimit"
    - "Cash verification page accessible at /audit-execution/[id]/cash-verification"
    - "Difference field auto-computes as cashInHand - bookBalance"
  artifacts:
    - path: "src/actions/audit-execution/cash-verification.ts"
      provides: "Server actions for CashCheck CRUD"
      exports: ["saveCashVerification", "getCashVerificationAction"]
    - path: "src/data-access/cash-verification.ts"
      provides: "DAL for CashCheck queries"
      exports: ["getCashCheckForEngagement"]
      min_lines: 25
    - path: "src/components/audit-execution/cash-verification-form.tsx"
      provides: "Client form component for cash verification with denomination capture"
      contains: "denominationData"
    - path: "src/app/(dashboard)/audit-execution/[id]/cash-verification/page.tsx"
      provides: "Cash verification page within audit execution"
      contains: "CashVerificationForm"
  key_links:
    - from: "src/app/(dashboard)/audit-execution/[id]/cash-verification/page.tsx"
      to: "src/data-access/cash-verification.ts"
      via: "Server component data fetching"
      pattern: "getCashCheckForEngagement"
    - from: "src/components/audit-execution/cash-verification-form.tsx"
      to: "src/actions/audit-execution/cash-verification.ts"
      via: "Form submission via server action"
      pattern: "saveCashVerification"
---

## Objective

Implement R19 (CashCheck model CRUD) and R24 (cash verification form with denomination-level capture). The CashCheck Prisma model exists with all required fields (cashInHand, bookBalance, difference, retentionLimit, atmBalances JSONB, denominationData JSONB). This plan builds the full CRUD + UI.

**Purpose:** Enable auditors to capture cash verification data during branch audits, including physical denomination counts, ATM balances, and retention limit compliance checks — matching Section 1 of the IA Format.

**Output:**
- DAL functions for CashCheck queries
- Server action for create/update (upsert pattern since one CashCheck per engagement)
- Cash verification form with denomination table, ATM balances, and retention limit warning
- New page within audit execution navigation

## Execution Context

@/root/.openclaw/workspace/.claude/agents/gsd-planner.md
@/root/.openclaw/workspace/.claude/workflows/execute-plan.md

## Context

@AEGIS/.planning/REQUIREMENTS.md — R19, R24 specifications
@AEGIS/.planning/VALIDATION-REPORT.md — CashCheck gap
@AEGIS/.planning/codebase/CONVENTIONS.md — Server action + DAL + form patterns
@AEGIS/prisma/schema.prisma — CashCheck model (engagementId unique, denomination JSONB, ATM JSONB)
@AEGIS/src/data-access/audit-execution.ts — Existing engagement DAL
@AEGIS/src/actions/audit-execution/submit-examination-response.ts — Reference action pattern

## Tasks

<task type="auto">
  <name>Task 1: DAL — CashCheck data access</name>
  <files>src/data-access/cash-verification.ts</files>
  <action>
  Create `src/data-access/cash-verification.ts`:

  ```typescript
  import "server-only";
  import { prismaForTenant } from "./prisma";
  import type { Session } from "@/lib/auth";

  /**
   * Get the cash check record for an engagement.
   * CashCheck has @@unique([engagementId]) so there's at most one per engagement.
   */
  export async function getCashCheckForEngagement(
    session: Session,
    engagementId: string,
  ) {
    const tenantId = (session.user as any).tenantId as string;
    const db = prismaForTenant(tenantId);

    return db.cashCheck.findFirst({
      where: { engagementId, tenantId },
    });
  }

  /**
   * Get engagement details needed for cash verification context.
   * Returns branch name, engagement status, etc.
   */
  export async function getEngagementForCashVerification(
    session: Session,
    engagementId: string,
  ) {
    const tenantId = (session.user as any).tenantId as string;
    const db = prismaForTenant(tenantId);

    return db.auditEngagement.findFirst({
      where: { id: engagementId, tenantId },
      select: {
        id: true,
        status: true,
        branch: { select: { id: true, code: true, name: true } },
        auditPlan: { select: { year: true, quarter: true } },
      },
    });
  }
  ```
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/data-access/cash-verification.ts 2>&1 | head -20
  ```
  Must compile. Both functions exported.
  </verify>
  <done>
  - `getCashCheckForEngagement()` returns existing cash check or null
  - `getEngagementForCashVerification()` returns engagement context
  - Both use `prismaForTenant()` with tenantId filter
  - TypeScript compiles
  </done>
</task>

<task type="auto">
  <name>Task 2: Schemas + server action — Cash verification CRUD</name>
  <files>src/actions/audit-execution/schemas.ts, src/actions/audit-execution/cash-verification.ts</files>
  <action>
  **2a. Add to `src/actions/audit-execution/schemas.ts`:**

  ```typescript
  // ─── Denomination keys for Indian currency ────────────────────
  const DenominationDataSchema = z.object({
    "2000": z.number().int().min(0).default(0),
    "500": z.number().int().min(0).default(0),
    "200": z.number().int().min(0).default(0),
    "100": z.number().int().min(0).default(0),
    "50": z.number().int().min(0).default(0),
    "20": z.number().int().min(0).default(0),
    "10": z.number().int().min(0).default(0),
    "5": z.number().int().min(0).default(0),
    "2": z.number().int().min(0).default(0),
    "1": z.number().int().min(0).default(0),
  }).partial();

  const AtmBalancesSchema = z.record(z.string(), z.number().min(0));

  export const SaveCashVerificationSchema = z.object({
    engagementId: z.string().uuid(),
    cashInHand: z.number().min(0, "Cash in hand must be non-negative"),
    bookBalance: z.number().min(0, "Book balance must be non-negative"),
    retentionLimit: z.number().min(0).optional(),
    denominationData: DenominationDataSchema.optional(),
    atmBalances: AtmBalancesSchema.optional(),
    remarks: z.string().max(2000).optional(),
  });

  export type SaveCashVerificationInput = z.infer<typeof SaveCashVerificationSchema>;
  ```

  **2b. Create `src/actions/audit-execution/cash-verification.ts`:**

  ```typescript
  "use server";
  ```

  **`saveCashVerification(input: SaveCashVerificationInput)`:**
  1. Standard auth + permission check: `examination:respond`
  2. Validate input with SaveCashVerificationSchema
  3. Compute difference: `cashInHand - bookBalance`
  4. Verify engagement exists and belongs to tenant
  5. Upsert CashCheck (unique on engagementId):
     ```typescript
     const result = await tx.cashCheck.upsert({
       where: { engagementId: validated.engagementId },
       update: {
         cashInHand: validated.cashInHand,
         bookBalance: validated.bookBalance,
         difference: validated.cashInHand - validated.bookBalance,
         retentionLimit: validated.retentionLimit ?? null,
         denominationData: validated.denominationData ?? null,
         atmBalances: validated.atmBalances ?? null,
         remarks: validated.remarks ?? null,
         verifiedById: session.user.id,
         verifiedAt: new Date(),
       },
       create: {
         tenantId,
         engagementId: validated.engagementId,
         cashInHand: validated.cashInHand,
         bookBalance: validated.bookBalance,
         difference: validated.cashInHand - validated.bookBalance,
         retentionLimit: validated.retentionLimit ?? null,
         denominationData: validated.denominationData ?? null,
         atmBalances: validated.atmBalances ?? null,
         remarks: validated.remarks ?? null,
         verifiedById: session.user.id,
         verifiedAt: new Date(),
       },
     });
     ```
  6. Set audit context: `actionType: "cash_check.saved"`
  7. revalidatePath for the cash verification page
  8. Return `{ success: true, data: { id: result.id, retentionExceeded: ... } }`
     - Include `retentionExceeded: boolean` if `retentionLimit` is set and `cashInHand > retentionLimit`
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/actions/audit-execution/cash-verification.ts 2>&1 | head -20
  ```
  Must compile. `saveCashVerification` must be exported.
  </verify>
  <done>
  - `saveCashVerification` action follows standard boilerplate
  - Difference auto-computed server-side
  - Upsert pattern (one CashCheck per engagement)
  - retentionExceeded flag returned in response
  - DenominationData and AtmBalances validated as proper JSON structures
  - TypeScript compiles
  </done>
</task>

<task type="auto">
  <name>Task 3: Client components — Cash verification form + denomination table</name>
  <files>src/components/audit-execution/cash-verification-form.tsx, src/components/audit-execution/denomination-table.tsx</files>
  <action>
  **3a. Create `src/components/audit-execution/denomination-table.tsx`:**

  ```typescript
  "use client";
  ```

  Props:
  ```typescript
  interface DenominationTableProps {
    value: Record<string, number>;
    onChange: (data: Record<string, number>) => void;
    disabled?: boolean;
  }
  ```

  Implementation:
  - Table with columns: Denomination (₹), Count, Amount (₹)
  - Rows for: 2000, 500, 200, 100, 50, 20, 10, 5, 2, 1
  - Count column: number input per denomination
  - Amount column: auto-computed (denomination × count), read-only
  - Total row at bottom: sum of all amounts
  - Use Input components from shadcn/ui
  - `onChange` callback fires on each count change with the full denomination object

  **3b. Create `src/components/audit-execution/cash-verification-form.tsx`:**

  ```typescript
  "use client";
  ```

  Props:
  ```typescript
  interface CashVerificationFormProps {
    engagementId: string;
    branchName: string;
    existingData: {
      cashInHand: number;
      bookBalance: number;
      difference: number;
      retentionLimit: number | null;
      denominationData: Record<string, number> | null;
      atmBalances: Record<string, number> | null;
      remarks: string | null;
    } | null;
  }
  ```

  Implementation:
  - Use `useForm` from react-hook-form with zodResolver and SaveCashVerificationSchema
  - Sections:
    1. **Cash Summary:** cashInHand, bookBalance, difference (auto-computed, read-only)
    2. **Denomination Breakdown:** `<DenominationTable />` component
       - Auto-fill cashInHand from denomination total
    3. **ATM Balances:** Dynamic key-value form (Add ATM button → ATM name + balance)
    4. **Retention Limit:** Optional field with warning alert if cash > limit
    5. **Remarks:** Textarea
  - Submit button calls `saveCashVerification` action
  - Show toast on success/error
  - If retentionExceeded in response, show amber warning: "⚠️ Cash in hand exceeds retention limit"
  - Pre-fill form with existingData if available (edit mode)

  Use Card + CardHeader + CardContent for each section. Use Alert component for retention warning.
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/components/audit-execution/cash-verification-form.tsx src/components/audit-execution/denomination-table.tsx 2>&1 | head -20
  ```
  Must compile. Both components exported.
  </verify>
  <done>
  - DenominationTable renders editable denomination grid with auto-computed amounts
  - CashVerificationForm has all sections (cash summary, denominations, ATM, retention, remarks)
  - Difference auto-computed on client side as cashInHand - bookBalance
  - Retention limit warning shown when exceeded
  - Form pre-fills with existing data
  - react-hook-form + zodResolver pattern used
  - TypeScript compiles
  </done>
</task>

<task type="auto">
  <name>Task 4: Page — /audit-execution/[id]/cash-verification</name>
  <files>src/app/(dashboard)/audit-execution/[id]/cash-verification/page.tsx</files>
  <action>
  Create the page as a server component:

  ```typescript
  import { notFound } from "next/navigation";
  import { getRequiredSession } from "@/data-access/session";
  import { getCashCheckForEngagement, getEngagementForCashVerification } from "@/data-access/cash-verification";
  import { CashVerificationForm } from "@/components/audit-execution/cash-verification-form";

  interface PageProps {
    params: Promise<{ id: string }>;
  }

  export default async function CashVerificationPage({ params }: PageProps) {
    const { id: engagementId } = await params;
    const session = await getRequiredSession();

    const engagement = await getEngagementForCashVerification(session, engagementId);
    if (!engagement) notFound();

    const cashCheck = await getCashCheckForEngagement(session, engagementId);

    // Transform Decimal to number for client component
    const existingData = cashCheck ? {
      cashInHand: Number(cashCheck.cashInHand),
      bookBalance: Number(cashCheck.bookBalance),
      difference: Number(cashCheck.difference),
      retentionLimit: cashCheck.retentionLimit ? Number(cashCheck.retentionLimit) : null,
      denominationData: cashCheck.denominationData as Record<string, number> | null,
      atmBalances: cashCheck.atmBalances as Record<string, number> | null,
      remarks: cashCheck.remarks,
    } : null;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cash Verification</h1>
          <p className="text-muted-foreground">
            {engagement.branch?.name} — {engagement.auditPlan?.year} {engagement.auditPlan?.quarter}
          </p>
        </div>
        <CashVerificationForm
          engagementId={engagementId}
          branchName={engagement.branch?.name ?? "Unknown"}
          existingData={existingData}
        />
      </div>
    );
  }
  ```

  Also ensure the cash verification page is linked from the audit execution layout/navigation. If there's an existing nav for audit execution sections, add "Cash Verification" as a tab/link.
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/app/\(dashboard\)/audit-execution/\[id\]/cash-verification/page.tsx 2>&1 | head -20
  ```
  Must compile. Page must render CashVerificationForm.
  </verify>
  <done>
  - Page exists at the correct route path
  - Server component fetches engagement + existing CashCheck data
  - Decimal values converted to numbers for client
  - 404 if engagement not found
  - CashVerificationForm rendered with correct props
  - Branch name and audit plan context shown in header
  - TypeScript compiles
  </done>
</task>

## Verification

```bash
# 1. TypeScript compilation
cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit

# 2. Verify action exists
grep -l "saveCashVerification" src/actions/audit-execution/cash-verification.ts && echo "PASS" || echo "FAIL"

# 3. Verify DAL exists
grep -l "getCashCheckForEngagement" src/data-access/cash-verification.ts && echo "PASS" || echo "FAIL"

# 4. Verify page exists
test -f src/app/\(dashboard\)/audit-execution/\[id\]/cash-verification/page.tsx && echo "PASS" || echo "FAIL"

# 5. Verify denomination data handling
grep "denominationData" src/components/audit-execution/cash-verification-form.tsx && echo "PASS" || echo "FAIL"

# 6. Verify retention limit validation
grep "retentionLimit\|retentionExceeded" src/actions/audit-execution/cash-verification.ts && echo "PASS" || echo "FAIL"
```

## Success Criteria

1. **R19 gap closed:** CashCheck CRUD fully operational with denomination + ATM data
2. **R24 gap closed:** Cash verification form with denomination-level capture at section level
3. **Denomination capture:** All Indian denominations (₹2000 down to ₹1) with count + amount columns
4. **ATM balances:** Dynamic key-value capture for multiple ATMs
5. **Retention limit:** Warning when cash exceeds limit (visual alert, not block)
6. **Auto-compute:** Difference = cashInHand - bookBalance computed server-side
7. **Upsert pattern:** Single CashCheck per engagement (unique constraint)
8. **Navigation:** Page accessible from audit execution context
9. **TypeScript:** All files compile successfully
10. **Conventions:** Server action boilerplate, DAL pattern, react-hook-form + zod
