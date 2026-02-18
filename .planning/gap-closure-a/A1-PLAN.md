---
phase: gap-closure-a
plan: A1
type: execute
wave: 1
depends_on: []
files_modified:
  - src/actions/audit-plans/generate-annual-plan.ts
  - src/actions/audit-plans/schemas.ts
  - src/app/(dashboard)/audit-plans/page.tsx
  - src/data-access/audit-plans.ts
autonomous: true
gap_closure: true
must_haves:
  truths:
    - "/audit-plans page displays real auto-generated audit schedules from RAM scores and last_audit_date"
    - "Branches with higher RAM scores (>3.5) are scheduled for 12-month audits"
    - "Branches with medium RAM scores (2.5-3.5) are scheduled for 18-month audits"
    - "Branches with lower RAM scores (<2.5) are scheduled for 24-month audits"
    - "Users can preview generated plan before saving to AuditPlan/AuditEngagement"
  artifacts:
    - path: "src/actions/audit-plans/generate-annual-plan.ts"
      provides: "Annual audit plan generation logic from RAM + last_audit_date"
      exports: ["generateAnnualPlan"]
    - path: "src/data-access/audit-plans.ts"
      provides: "DAL function to compute branch audit schedules"
      min_lines: 40
    - path: "src/app/(dashboard)/audit-plans/page.tsx"
      provides: "UI to trigger and display generated audit plan"
      contains: "generateAnnualPlan"
  key_links:
    - from: "src/app/(dashboard)/audit-plans/page.tsx"
      to: "src/actions/audit-plans/generate-annual-plan.ts"
      via: "Server action call from generate button"
      pattern: "generateAnnualPlan"
    - from: "src/actions/audit-plans/generate-annual-plan.ts"
      to: "Branch.ramScore, Branch.lastAuditDate"
      via: "Query branches with RAM scores and compute next audit date"
      pattern: "prisma\\.branch\\.findMany.*ramScore"
---

## Objective

Implement R9: Annual audit plan generator that auto-schedules branch audits based on RAM scores and last_audit_date, replacing the mock data currently displayed on `/audit-plans` page.

**Purpose:** Enable audit planning automation per RBIA Policy §7.6 (frequency rules) and SDD p.33 (annual plan generation).

**Output:** 
- DAL function to compute next audit date based on RAM-derived frequency
- Server action to generate annual plan with branch audit schedules
- UI to trigger plan generation and display scheduled audits
- Preview mode before committing AuditPlan/AuditEngagement records

## Execution Context

@/root/.openclaw/workspace/.claude/agents/gsd-planner.md
@/root/.openclaw/workspace/.claude/workflows/execute-plan.md

## Context

@AEGIS/.planning/REQUIREMENTS.md — R9 specification
@AEGIS/.planning/VALIDATION-REPORT.md — R9 gap description
@AEGIS/prisma/schema.prisma — Branch.ramScore, Branch.lastAuditDate, Branch.auditFrequency, AuditPlan, AuditEngagement
@AEGIS/.planning/codebase/CONVENTIONS.md — server action pattern, DAL pattern
@AEGIS/src/lib/fiscal-year.ts — Indian FY helper functions
@AEGIS/src/data-access/ram.ts — existing RAM DAL for reference

## Tasks

<task type="auto">
  <name>Task 1: DAL — Audit plan computation logic</name>
  <files>src/data-access/audit-plans.ts</files>
  <action>
  Create `src/data-access/audit-plans.ts` with functions to:

  **1a. `computeNextAuditDate(lastAuditDate: Date | null, auditFrequency: number | null): Date`**
  - If lastAuditDate is null, return current date + 30 days (default: audit ASAP)
  - If auditFrequency is null, default to 12 months
  - Otherwise: return lastAuditDate + auditFrequency months
  - Use `addMonths` from `date-fns`

  **1b. `getBranchesForAnnualPlan(session: Session, fiscalYear: string): Promise<BranchAuditSchedule[]>`**
  - Extract tenantId from session
  - Use `prismaForTenant(tenantId)` to query branches
  - Fetch all branches with: id, code, name, ramScore, lastAuditDate, auditFrequency
  - For each branch, compute:
    - `nextAuditDate` using computeNextAuditDate()
    - `priority` from ramScore: HIGH (>3.5), MEDIUM (2.5-3.5), LOW (<2.5)
    - `quarterAssigned`: map nextAuditDate to Indian FY quarter (use fiscal-year helpers)
  - Sort by nextAuditDate ascending (urgent audits first)
  - Return array of `{ branchId, branchCode, branchName, ramScore, lastAuditDate, nextAuditDate, priority, quarterAssigned, auditFrequency }`

  **Type definition:**
  ```typescript
  export type BranchAuditSchedule = {
    branchId: string;
    branchCode: string;
    branchName: string;
    ramScore: number | null;
    lastAuditDate: Date | null;
    nextAuditDate: Date;
    priority: "HIGH" | "MEDIUM" | "LOW";
    quarterAssigned: "Q1_APR_JUN" | "Q2_JUL_SEP" | "Q3_OCT_DEC" | "Q4_JAN_MAR";
    auditFrequency: number | null;
  };
  ```

  **IMPORTANT:** Follow DAL conventions from existing files (e.g., `src/data-access/ram.ts`). Use session for auth, prismaForTenant for tenant isolation.
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/data-access/audit-plans.ts 2>&1 | head -20
  ```
  Must compile without errors. File must export `getBranchesForAnnualPlan` and `computeNextAuditDate`.
  </verify>
  <done>
  - `src/data-access/audit-plans.ts` exists with ≥40 lines
  - `computeNextAuditDate()` function implements frequency-based date calculation
  - `getBranchesForAnnualPlan()` queries branches, computes nextAuditDate + priority + quarter
  - TypeScript compiles successfully
  - Functions follow CONVENTIONS.md DAL pattern (session auth, prismaForTenant)
  </done>
</task>

<task type="auto">
  <name>Task 2: Server Action — Generate annual plan</name>
  <files>src/actions/audit-plans/schemas.ts, src/actions/audit-plans/generate-annual-plan.ts</files>
  <action>
  **2a. Create `src/actions/audit-plans/schemas.ts`:**
  ```typescript
  import { z } from "zod";

  export const GenerateAnnualPlanSchema = z.object({
    fiscalYear: z.string().regex(/^\d{4}-\d{2}$/, "Invalid fiscal year format (e.g., 2025-26)"),
    autoCreateEngagements: z.boolean().default(false), // Preview mode by default
  });

  export type GenerateAnnualPlanInput = z.infer<typeof GenerateAnnualPlanSchema>;
  ```

  **2b. Create `src/actions/audit-plans/generate-annual-plan.ts`:**

  Follow the standard server action boilerplate from CONVENTIONS.md:

  1. `"use server"` directive (first line)
  2. Import `getRequiredSession`, `prismaForTenant`, `setAuditContext`, `hasPermission`, `logger`
  3. Authentication check (getRequiredSession)
  4. Permission check: `hasPermission(userRoles, "audit_plan:create")`
  5. Input validation using GenerateAnnualPlanSchema
  6. Call `getBranchesForAnnualPlan(session, fiscalYear)` from DAL
  7. **If autoCreateEngagements = false:** return preview data (schedules array) without DB writes
  8. **If autoCreateEngagements = true:** 
     - Start transaction
     - Set audit context: `actionType: "audit_plan.generated"`
     - Create one AuditPlan record for the fiscal year (year, quarter=Q1 by default, status=PLANNED)
     - Create AuditEngagement records for each branch in schedules (branchId, scheduledStartDate=nextAuditDate, status=PLANNED, auditPlanId)
     - Return success with `{ planId, engagementsCount }`
  9. Error handling with logger
  10. revalidatePath("/audit-plans")

  **Return type:**
  ```typescript
  type ActionResult =
    | { success: true; data: { preview?: BranchAuditSchedule[]; planId?: string; engagementsCount?: number } }
    | { success: false; error: string };
  ```

  **IMPORTANT:** Follow exact boilerplate pattern from CONVENTIONS.md. Use fiscal year helpers from `@/lib/fiscal-year`.
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/actions/audit-plans/generate-annual-plan.ts 2>&1 | head -20
  ```
  Must compile without errors. Action must export `generateAnnualPlan` function.
  </verify>
  <done>
  - `src/actions/audit-plans/schemas.ts` exports GenerateAnnualPlanSchema with fiscalYear + autoCreateEngagements
  - `src/actions/audit-plans/generate-annual-plan.ts` implements full server action boilerplate
  - Action has preview mode (autoCreateEngagements=false) and commit mode (autoCreateEngagements=true)
  - Transaction creates AuditPlan + AuditEngagement records when committing
  - Action calls getBranchesForAnnualPlan() from DAL
  - revalidatePath("/audit-plans") is called on success
  - TypeScript compiles successfully
  </done>
</task>

<task type="auto">
  <name>Task 3: UI — Replace /audit-plans mock data with generator</name>
  <files>src/app/(dashboard)/audit-plans/page.tsx</files>
  <action>
  Replace the current mock data implementation in `/audit-plans` page with:

  **3a. Server component that fetches existing AuditPlan records:**
  - Query AuditPlan with engagements (include: { engagements: { include: { branch: true } } })
  - Display existing plans in a table (year, quarter, status, engagement count)

  **3b. Client component for plan generation (create separate file `src/components/audit-plans/plan-generator.tsx`):**
  - "use client" directive
  - Form with fiscal year selector (dropdown: current FY, next FY)
  - "Generate Preview" button → calls generateAnnualPlan({ fiscalYear, autoCreateEngagements: false })
  - Display preview table with columns: Branch Code, Branch Name, RAM Score, Last Audit, Next Audit, Priority, Quarter
  - "Commit Plan" button (only visible after preview) → calls generateAnnualPlan({ fiscalYear, autoCreateEngagements: true })
  - Use `useActionState` hook pattern from CONVENTIONS.md
  - Toast notifications on success/error (sonner)

  **3c. Update main page.tsx:**
  - Import and render `<PlanGenerator />` component
  - Display list of existing AuditPlan records below generator
  - Use Card components from shadcn/ui for layout

  **UI Structure:**
  ```tsx
  <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>Generate Annual Audit Plan</CardTitle>
        <CardDescription>Auto-schedule branch audits based on RAM scores</CardDescription>
      </CardHeader>
      <CardContent>
        <PlanGenerator />
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Existing Audit Plans</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Table of existing plans */}
      </CardContent>
    </Card>
  </div>
  ```

  **IMPORTANT:** Remove all mock data arrays. Follow component patterns from CONVENTIONS.md. Use existing UI components from `@/components/ui/*`.
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/app/(dashboard)/audit-plans/page.tsx src/components/audit-plans/plan-generator.tsx 2>&1 | head -20
  ```
  Must compile without errors. Check that mock data arrays are removed.
  </verify>
  <done>
  - `/audit-plans` page fetches real AuditPlan records from database
  - No mock data arrays remain in page.tsx
  - PlanGenerator component exists as client component with "use client" directive
  - Form has fiscal year selector and two-step flow (preview → commit)
  - Preview displays BranchAuditSchedule array in a table
  - useActionState pattern is used correctly
  - Toast notifications on success/error
  - TypeScript compiles successfully
  - Page uses Card/Table components from shadcn/ui
  </done>
</task>

## Verification

```bash
# 1. TypeScript compilation
cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit

# 2. Check that /audit-plans page no longer has mock data
grep -i "mock\|placeholder" src/app/(dashboard)/audit-plans/page.tsx && echo "FAIL: Mock data still present" || echo "PASS: No mock data"

# 3. Verify generateAnnualPlan action exists
grep -l "generateAnnualPlan" src/actions/audit-plans/generate-annual-plan.ts && echo "PASS: Action exists" || echo "FAIL: Action missing"

# 4. Verify DAL exports
grep -E "export.*(getBranchesForAnnualPlan|computeNextAuditDate)" src/data-access/audit-plans.ts && echo "PASS: DAL functions exported" || echo "FAIL: DAL exports missing"
```

## Success Criteria

1. **R9 gap closed:** Annual audit plan generator is implemented end-to-end
2. **DAL layer:** `src/data-access/audit-plans.ts` computes next audit dates using RAM-derived frequency rules
3. **Server action:** `generateAnnualPlan()` creates AuditPlan + AuditEngagement records in transaction
4. **UI:** `/audit-plans` page displays real data with two-step generation (preview → commit)
5. **Frequency rules applied:**
   - RAM >3.5 → 12-month audits
   - RAM 2.5-3.5 → 18-month audits
   - RAM <2.5 → 24-month audits
6. **No mock data:** All placeholder arrays removed from page
7. **TypeScript:** All files compile successfully
8. **Conventions followed:** Server action boilerplate, DAL pattern, component patterns all match CONVENTIONS.md

## Output

After completion, create `.planning/gap-closure-a/A1-SUMMARY.md` documenting:
- What was implemented (DAL + action + UI)
- How frequency rules are applied
- How preview mode works
- Any decisions made (e.g., default quarter assignment)
