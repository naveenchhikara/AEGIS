---
phase: gap-closure-a
plan: A9
type: execute
wave: 2
depends_on: [A8]
files_modified:
  - src/actions/compliance/ace-processing.ts
  - src/actions/compliance/acb-reporting.ts
  - src/actions/compliance/schemas.ts
  - src/data-access/compliance-items.ts
  - src/components/compliance/ace-quarterly-review.tsx
  - src/components/compliance/acb-report-builder.tsx
  - src/app/(dashboard)/compliance/ace/page.tsx
  - src/app/(dashboard)/compliance/acb/page.tsx
autonomous: true
gap_closure: true
must_haves:
  truths:
    - "ACE quarterly processing pipeline filters compliance items at escalation level ≥ 3 (90+ days overdue)"
    - "ACE officer can review, annotate, and prepare items for ACB reporting"
    - "ACB report consolidation aggregates escalated items by branch, severity, and aging"
    - "ACB quarterly pack is generated as downloadable data for board meetings"
    - "ACE page accessible at /compliance/ace, ACB page at /compliance/acb"
  artifacts:
    - path: "src/actions/compliance/ace-processing.ts"
      provides: "Server actions for ACE quarterly review cycle"
      exports: ["processAceQuarterly", "reviewAceItem"]
    - path: "src/actions/compliance/acb-reporting.ts"
      provides: "Server action for ACB report consolidation"
      exports: ["generateAcbReport"]
    - path: "src/data-access/compliance-items.ts"
      provides: "DAL queries for ACE/ACB escalation filtering"
      exports: ["getAceEligibleItems", "getAcbEligibleItems"]
    - path: "src/app/(dashboard)/compliance/ace/page.tsx"
      provides: "ACE quarterly review page"
      contains: "AceQuarterlyReview"
    - path: "src/app/(dashboard)/compliance/acb/page.tsx"
      provides: "ACB report builder page"
      contains: "AcbReportBuilder"
  key_links:
    - from: "src/actions/compliance/ace-processing.ts"
      to: "src/data-access/compliance-items.ts"
      via: "Queries items at escalation level ≥ 3"
      pattern: "getAceEligibleItems"
    - from: "src/actions/compliance/acb-reporting.ts"
      to: "src/data-access/compliance-items.ts"
      via: "Queries items at escalation level ≥ 4 or ACE-reviewed"
      pattern: "getAcbEligibleItems"
---

## Objective

Implement R37 (ACE quarterly cycle processing) and R38 (ACB board reporting consolidation). The ComplianceItem model already has `aceReviewedById`, `aceReviewedAt`, `aceQuarter`, `acbReportedAt`, `acbMeetingRef` fields. The escalation engine (R39) computes levels. This plan builds the ACE/ACB processing workflows.

**Purpose:** Enable the ACE (Audit Committee of Executives) to process quarterly compliance escalations and prepare consolidated reports for the ACB (Audit Committee of the Board) — the final tier of the compliance escalation pipeline per SDD p.40.

**Output:**
- ACE quarterly processing action (filter L3+ items, review, annotate)
- ACB report consolidation action (aggregate for board pack)
- ACE review page with filterable compliance queue
- ACB report builder page with consolidated view + export

## Execution Context

@/root/.openclaw/workspace/.claude/agents/gsd-planner.md
@/root/.openclaw/workspace/.claude/workflows/execute-plan.md

## Context

@AEGIS/.planning/REQUIREMENTS.md — R37, R38 specifications
@AEGIS/.planning/VALIDATION-REPORT.md — ACE/ACB gaps
@AEGIS/.planning/codebase/CONVENTIONS.md — Server action + DAL patterns
@AEGIS/prisma/schema.prisma — ComplianceItem with ace/acb fields, ComplianceStatus enum
@AEGIS/src/actions/compliance/compute-escalation.ts — Existing escalation computation
@AEGIS/src/actions/compliance/zac-review.ts — Reference for review action pattern
@AEGIS/src/data-access/compliance-items.ts — Existing compliance DAL
@AEGIS/src/lib/escalation-engine.ts — Escalation level computation
@AEGIS/src/lib/fiscal-year.ts — Indian FY quarter helpers

## Tasks

<task type="auto">
  <name>Task 1: DAL — ACE/ACB eligible item queries</name>
  <files>src/data-access/compliance-items.ts</files>
  <action>
  Add to existing `src/data-access/compliance-items.ts`:

  **`getAceEligibleItems(session, quarter?: string)`:**
  - Query ComplianceItem where:
    - tenantId matches
    - escalationLevel >= 3 (90+ days overdue — L3 threshold)
    - status NOT in ["CLOSED", "ACB_REVIEW"] (not already processed to ACB)
    - Optionally filter by aceQuarter
  - Include: observation (title, severity), branch (name, code), audit engagement (auditNumber)
  - Order by: daysOpen DESC (most overdue first)
  - Return with computed fields (daysOverdue from dueDate)

  ```typescript
  export async function getAceEligibleItems(
    session: Session,
    options?: { quarter?: string },
  ) {
    const tenantId = (session.user as any).tenantId as string;
    const db = prismaForTenant(tenantId);

    return db.complianceItem.findMany({
      where: {
        tenantId,
        escalationLevel: { gte: 3 },
        status: { notIn: ["CLOSED", "ACB_REVIEW"] },
        ...(options?.quarter && { aceQuarter: options.quarter }),
      },
      include: {
        observation: {
          select: { id: true, title: true, severity: true, status: true },
        },
        branch: { select: { id: true, code: true, name: true } },
        audit: { select: { id: true, auditNumber: true } },
      },
      orderBy: { daysOpen: "desc" },
    });
  }
  ```

  **`getAcbEligibleItems(session, quarter?: string)`:**
  - Query ComplianceItem where:
    - tenantId matches
    - escalationLevel >= 4 OR status = "ACE_REVIEW" (items ACE has reviewed and forwarded)
    - status NOT in ["CLOSED"]
    - Optionally filter by aceQuarter
  - Include same relations
  - Order by severity (CRITICAL first), then daysOpen DESC

  **`getComplianceEscalationSummary(session)`:**
  - Aggregate query for dashboard cards:
    ```typescript
    const summary = await db.complianceItem.groupBy({
      by: ["escalationLevel"],
      where: { tenantId, status: { notIn: ["CLOSED"] } },
      _count: true,
    });
    ```
  - Return `{ l0: n, l1: n, l2: n, l3: n, l4: n, total: n }`
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/data-access/compliance-items.ts 2>&1 | head -20
  ```
  </verify>
  <done>
  - `getAceEligibleItems` filters escalation ≥ 3
  - `getAcbEligibleItems` filters escalation ≥ 4 or ACE-forwarded
  - `getComplianceEscalationSummary` provides aggregated counts
  - All use prismaForTenant
  - TypeScript compiles
  </done>
</task>

<task type="auto">
  <name>Task 2: Schemas — ACE/ACB processing</name>
  <files>src/actions/compliance/schemas.ts</files>
  <action>
  Add to existing `src/actions/compliance/schemas.ts`:

  ```typescript
  // ─── ACE Processing ───────────────────────────────────────────
  export const ReviewAceItemSchema = z.object({
    complianceItemId: z.string().uuid(),
    decision: z.enum(["FORWARD_TO_ACB", "MONITOR", "CLOSE"]),
    comments: z.string().min(1, "Comments are required").max(2000),
    quarter: z.string().regex(/^\d{4}-Q[1-4]$/, "Format: YYYY-Q1..Q4"),
  });

  export const ProcessAceQuarterlySchema = z.object({
    quarter: z.string().regex(/^\d{4}-Q[1-4]$/, "Format: YYYY-Q1..Q4"),
  });

  export type ReviewAceItemInput = z.infer<typeof ReviewAceItemSchema>;
  export type ProcessAceQuarterlyInput = z.infer<typeof ProcessAceQuarterlySchema>;

  // ─── ACB Reporting ────────────────────────────────────────────
  export const GenerateAcbReportSchema = z.object({
    quarter: z.string().regex(/^\d{4}-Q[1-4]$/, "Format: YYYY-Q1..Q4"),
    title: z.string().min(1).max(200),
    executiveCommentary: z.string().max(5000).optional(),
  });

  export type GenerateAcbReportInput = z.infer<typeof GenerateAcbReportSchema>;
  ```
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/actions/compliance/schemas.ts 2>&1 | head -20
  ```
  </verify>
  <done>
  - ACE and ACB schemas added with proper validation
  - Quarter format enforced
  - Decision enum for ACE review (FORWARD/MONITOR/CLOSE)
  - TypeScript compiles
  </done>
</task>

<task type="auto">
  <name>Task 3: Server action — ACE quarterly processing</name>
  <files>src/actions/compliance/ace-processing.ts</files>
  <action>
  Create `src/actions/compliance/ace-processing.ts`:

  ```typescript
  "use server";
  ```

  **`processAceQuarterly(input: ProcessAceQuarterlyInput)`:**
  1. Auth + permission check: user must have `ACE_OFFICER` or `CAE` role
  2. Validate quarter format
  3. Fetch all L3+ items via getAceEligibleItems
  4. Tag them with the quarter:
     ```typescript
     await db.$transaction(async (tx: any) => {
       await setAuditContext(tx, { actionType: "ace.quarterly_processed", ... });

       for (const item of eligibleItems) {
         if (!item.aceQuarter) {
           await tx.complianceItem.update({
             where: { id: item.id },
             data: {
               aceQuarter: validated.quarter,
               status: "ACE_REVIEW",
             },
           });
         }
       }
     });
     ```
  5. Return `{ success: true, data: { processed: count, quarter } }`

  **`reviewAceItem(input: ReviewAceItemInput)`:**
  1. Auth + permission check: ACE_OFFICER or CAE
  2. Validate input
  3. Fetch compliance item, verify it's in ACE_REVIEW status
  4. Transaction based on decision:
     - **FORWARD_TO_ACB:** Set status to "ACB_REVIEW", set aceReviewedById/At
     - **MONITOR:** Keep status as "ACE_REVIEW", record review comment (update daysOpen, add comment to a field)
     - **CLOSE:** Set status to "CLOSED", set closedAt/closedById
  5. revalidatePath("/compliance")
  6. Return success with updated status
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/actions/compliance/ace-processing.ts 2>&1 | head -20
  ```
  </verify>
  <done>
  - `processAceQuarterly` tags eligible items with quarter and ACE_REVIEW status
  - `reviewAceItem` supports FORWARD_TO_ACB, MONITOR, and CLOSE decisions
  - ACE_OFFICER role required
  - Audit context set
  - TypeScript compiles
  </done>
</task>

<task type="auto">
  <name>Task 4: Server action — ACB report consolidation</name>
  <files>src/actions/compliance/acb-reporting.ts</files>
  <action>
  Create `src/actions/compliance/acb-reporting.ts`:

  ```typescript
  "use server";
  ```

  **`generateAcbReport(input: GenerateAcbReportInput)`:**
  1. Auth + permission check: user must have `CAE` or `ACB_MEMBER` role
  2. Validate input
  3. Fetch all ACB-eligible items via getAcbEligibleItems(session, quarter)
  4. Aggregate data for board pack:
     ```typescript
     const consolidated = {
       quarter: validated.quarter,
       totalItems: items.length,
       bySeverity: {
         critical: items.filter(i => i.observation?.severity === "CRITICAL").length,
         high: items.filter(i => i.observation?.severity === "HIGH").length,
         medium: items.filter(i => i.observation?.severity === "MEDIUM").length,
         low: items.filter(i => i.observation?.severity === "LOW").length,
       },
       byBranch: groupByBranch(items),
       byEscalationLevel: groupByLevel(items),
       agingSummary: computeAgingSummary(items),
     };
     ```
  5. Create BoardReport record:
     ```typescript
     const report = await tx.boardReport.create({
       data: {
         tenantId,
         year: parseInt(validated.quarter.split("-Q")[0]),
         quarter: mapQuarterToEnum(validated.quarter), // "2025-Q3" → "Q3_OCT_DEC"
         title: validated.title,
         executiveCommentary: validated.executiveCommentary ?? null,
         generatedById: session.user.id,
         metricsSnapshot: consolidated,
       },
     });
     ```
  6. Mark compliance items as ACB-reported:
     ```typescript
     for (const item of items) {
       await tx.complianceItem.update({
         where: { id: item.id },
         data: {
           acbReportedAt: new Date(),
           acbMeetingRef: `ACB-${validated.quarter}`,
         },
       });
     }
     ```
  7. revalidatePath
  8. Return `{ success: true, data: { reportId, itemCount, consolidated } }`

  **Helper functions (local to this file):**
  - `groupByBranch(items)` — group and count by branch name
  - `groupByLevel(items)` — group by escalation level
  - `computeAgingSummary(items)` — buckets: 30-60d, 60-90d, 90-180d, 180d+
  - `mapQuarterToEnum(q)` — "2025-Q1" → "Q1_APR_JUN"
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/actions/compliance/acb-reporting.ts 2>&1 | head -20
  ```
  </verify>
  <done>
  - `generateAcbReport` consolidates and creates BoardReport
  - Aggregation by severity, branch, escalation level, aging
  - ComplianceItems marked as ACB-reported
  - Uses existing BoardReport model
  - TypeScript compiles
  </done>
</task>

<task type="auto">
  <name>Task 5: Client components — ACE review + ACB builder</name>
  <files>src/components/compliance/ace-quarterly-review.tsx, src/components/compliance/acb-report-builder.tsx</files>
  <action>
  **5a. Create `src/components/compliance/ace-quarterly-review.tsx`:**

  "use client" — ACE quarterly review queue:
  - Props: `{ items: AceItem[]; currentQuarter: string }`
  - Table with columns: Branch, Observation, Severity, Days Overdue, Escalation Level, Status, Actions
  - Severity column: colored badges
  - Actions column: "Review" button opens a sheet/dialog with:
    - Item details
    - Decision select: Forward to ACB / Continue Monitoring / Close
    - Comments textarea (required)
    - Submit button
  - "Process Quarter" button at top: calls processAceQuarterly to batch-tag items
  - Quarter selector (dropdown with current/previous quarters)
  - Stat cards at top: Total items, Critical, High, Avg days overdue

  **5b. Create `src/components/compliance/acb-report-builder.tsx`:**

  "use client" — ACB report preparation:
  - Props: `{ items: AcbItem[]; existingReports: BoardReport[] }`
  - Summary cards: Total items, By severity, By branch
  - Consolidated table showing all ACB-eligible items
  - "Generate Board Report" section:
    - Title input
    - Executive commentary textarea
    - Quarter selector
    - Generate button → calls generateAcbReport
  - Previous reports list (from existing BoardReport records)
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/components/compliance/ace-quarterly-review.tsx src/components/compliance/acb-report-builder.tsx 2>&1 | head -20
  ```
  </verify>
  <done>
  - AceQuarterlyReview renders filterable queue with review actions
  - AcbReportBuilder shows consolidated view with report generation
  - Both components handle loading/error states
  - TypeScript compiles
  </done>
</task>

<task type="auto">
  <name>Task 6: Pages — ACE and ACB</name>
  <files>src/app/(dashboard)/compliance/ace/page.tsx, src/app/(dashboard)/compliance/acb/page.tsx</files>
  <action>
  **6a. Create ACE page** (`/compliance/ace`):

  Server component:
  - Check user has ACE_OFFICER or CAE role
  - Compute current quarter using fiscal year helpers
  - Fetch ACE-eligible items via getAceEligibleItems
  - Fetch escalation summary via getComplianceEscalationSummary
  - Convert Decimal fields to numbers
  - Render AceQuarterlyReview component

  **6b. Create ACB page** (`/compliance/acb`):

  Server component:
  - Check user has CAE or ACB_MEMBER role
  - Fetch ACB-eligible items via getAcbEligibleItems
  - Fetch existing BoardReport records for this tenant
  - Render AcbReportBuilder component
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/app/\(dashboard\)/compliance/ace/page.tsx src/app/\(dashboard\)/compliance/acb/page.tsx 2>&1 | head -20
  ```
  </verify>
  <done>
  - ACE page at /compliance/ace with role-gated access
  - ACB page at /compliance/acb with role-gated access
  - Both fetch data via DAL and render appropriate components
  - TypeScript compiles
  </done>
</task>

## Verification

```bash
# 1. TypeScript compilation
cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit

# 2. Verify ACE actions
grep -E "export async function (processAceQuarterly|reviewAceItem)" src/actions/compliance/ace-processing.ts | wc -l
# Expected: 2

# 3. Verify ACB action
grep "generateAcbReport" src/actions/compliance/acb-reporting.ts && echo "PASS" || echo "FAIL"

# 4. Verify DAL
grep -E "getAceEligibleItems|getAcbEligibleItems" src/data-access/compliance-items.ts | wc -l
# Expected: 2+

# 5. Verify pages
test -f src/app/\(dashboard\)/compliance/ace/page.tsx && echo "PASS" || echo "FAIL"
test -f src/app/\(dashboard\)/compliance/acb/page.tsx && echo "PASS" || echo "FAIL"
```

## Success Criteria

1. **R37 gap closed:** ACE quarterly processing pipeline operational
2. **R38 gap closed:** ACB report consolidation creates BoardReport records
3. **Escalation integration:** ACE processes items at L3+ (90+ days overdue)
4. **ACE decisions:** Forward to ACB, Continue Monitoring, Close
5. **ACB aggregation:** By severity, branch, escalation level, and aging buckets
6. **Board report:** BoardReport record created with metricsSnapshot
7. **Quarter-based:** All processing scoped to Indian FY quarters
8. **Role-gated:** ACE_OFFICER for ACE, CAE/ACB_MEMBER for ACB
9. **TypeScript:** All files compile
10. **Conventions:** Standard patterns followed
