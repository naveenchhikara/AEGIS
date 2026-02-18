---
phase: gap-closure-a
plan: A8
type: execute
wave: 2
depends_on: [A7]
files_modified:
  - src/actions/reports/transition-report.ts
  - src/actions/reports/schemas.ts
  - src/data-access/reports.ts
  - src/components/reports/report-status-workflow.tsx
  - src/components/reports/report-approval-panel.tsx
  - src/app/(dashboard)/audit-execution/[id]/report/page.tsx
autonomous: true
gap_closure: true
must_haves:
  truths:
    - "Reports transition through: DRAFT → REVIEWED → APPROVED → ISSUED"
    - "Each transition is role-gated (FIELD_AUDITOR drafts, LEAD_AUDITOR reviews, AUDIT_MANAGER/CAE approves)"
    - "Transition history is recorded for audit trail"
    - "Only APPROVED reports can be issued (shared with auditees)"
    - "Report status is tracked on the AuditEngagement using a new reportStatus field or dedicated model"
  artifacts:
    - path: "src/actions/reports/transition-report.ts"
      provides: "Server action for report state transitions"
      exports: ["transitionReportStatus"]
    - path: "src/components/reports/report-status-workflow.tsx"
      provides: "Client component for report routing UI with approval actions"
      contains: "transitionReportStatus"
    - path: "src/app/(dashboard)/audit-execution/[id]/report/page.tsx"
      provides: "Report routing page within audit execution"
      contains: "ReportStatusWorkflow"
  key_links:
    - from: "src/components/reports/report-status-workflow.tsx"
      to: "src/actions/reports/transition-report.ts"
      via: "Transition action calls from approval buttons"
      pattern: "transitionReportStatus"
    - from: "src/actions/reports/transition-report.ts"
      to: "src/data-access/reports.ts"
      via: "DAL queries for report status and transition validation"
      pattern: "getReportStatusForEngagement"
---

## Objective

Implement R33: Report routing workflow with draft → reviewed → approved → issued transitions and role-based approval gates. Rather than creating a separate Report model (which would add complexity), extend AuditEngagement with a `reportStatus` field to track the report lifecycle.

**Purpose:** Enable formal report quality control before findings are shared with auditees and management — ensures proper review chain per audit standards.

**Output:**
- Report status field on AuditEngagement (schema extension)
- Transition action with role-based validation per step
- Report workflow UI showing current status, history, and available actions
- Report page within audit execution

## Execution Context

@/root/.openclaw/workspace/.claude/agents/gsd-planner.md
@/root/.openclaw/workspace/.claude/workflows/execute-plan.md

## Context

@AEGIS/.planning/REQUIREMENTS.md — R33 specification
@AEGIS/.planning/VALIDATION-REPORT.md — Report routing gap
@AEGIS/.planning/codebase/CONVENTIONS.md — Server action + component patterns
@AEGIS/prisma/schema.prisma — AuditEngagement model, EngagementStatus enum
@AEGIS/src/actions/reports/ — Existing report generation actions
@AEGIS/src/data-access/reports.ts — Existing report DAL
@AEGIS/src/actions/observations/transition.ts — Reference for status transition pattern

## Tasks

<task type="auto">
  <name>Task 1: Schema extension — Add reportStatus to AuditEngagement</name>
  <files>prisma/schema.prisma</files>
  <action>
  Add a `reportStatus` field to the AuditEngagement model. Since we want to avoid a new enum initially, use a String field with convention:

  ```prisma
  // Report routing workflow (R33)
  reportStatus       String?   @default("DRAFT") // "DRAFT", "REVIEWED", "APPROVED", "ISSUED"
  reportReviewedById String?   @db.Uuid
  reportReviewedAt   DateTime?
  reportApprovedById String?   @db.Uuid
  reportApprovedAt   DateTime?
  reportIssuedById   String?   @db.Uuid
  reportIssuedAt     DateTime?
  ```

  Place these after the existing BH cert fields in the AuditEngagement model.

  Then run:
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm prisma db push
  ```

  **Note:** If creating a migration is preferred:
  ```bash
  pnpm prisma migrate dev --name add-report-routing-fields
  ```
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm prisma validate 2>&1 | head -10
  ```
  Schema must validate without errors.
  </verify>
  <done>
  - AuditEngagement has reportStatus + reviewer/approver/issuer tracking fields
  - Prisma schema validates
  - Database schema applied
  </done>
</task>

<task type="auto">
  <name>Task 2: DAL — Report status data access</name>
  <files>src/data-access/reports.ts</files>
  <action>
  Add to existing `src/data-access/reports.ts`:

  ```typescript
  /**
   * Get engagement with report routing status and reviewer info.
   */
  export async function getReportStatusForEngagement(
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
        reportStatus: true,
        reportReviewedById: true,
        reportReviewedAt: true,
        reportApprovedById: true,
        reportApprovedAt: true,
        reportIssuedById: true,
        reportIssuedAt: true,
        branch: { select: { id: true, code: true, name: true } },
        auditPlan: { select: { year: true, quarter: true } },
        bhCertSignedAt: true,
        overallRiskRating: true,
        observations: {
          select: { id: true, severity: true, status: true },
        },
      },
    });
  }
  ```
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/data-access/reports.ts 2>&1 | head -20
  ```
  </verify>
  <done>
  - `getReportStatusForEngagement` exported
  - Includes all report routing fields + context data
  - Uses prismaForTenant
  - TypeScript compiles
  </done>
</task>

<task type="auto">
  <name>Task 3: Schemas + server action — Report transition</name>
  <files>src/actions/reports/schemas.ts, src/actions/reports/transition-report.ts</files>
  <action>
  **3a. Add to `src/actions/reports/schemas.ts`:**

  ```typescript
  export const REPORT_STATUSES = ["DRAFT", "REVIEWED", "APPROVED", "ISSUED"] as const;
  export type ReportStatus = typeof REPORT_STATUSES[number];

  // Valid transitions: DRAFT→REVIEWED, REVIEWED→APPROVED, APPROVED→ISSUED
  export const REPORT_TRANSITIONS: Record<string, ReportStatus[]> = {
    DRAFT: ["REVIEWED"],
    REVIEWED: ["APPROVED", "DRAFT"], // Can send back to DRAFT for rework
    APPROVED: ["ISSUED", "REVIEWED"], // Can send back for re-review
    ISSUED: [], // Terminal state
  };

  // Role requirements per transition
  export const TRANSITION_ROLES: Record<string, string[]> = {
    "DRAFT→REVIEWED": ["LEAD_AUDITOR", "AUDIT_MANAGER", "CAE"],
    "REVIEWED→APPROVED": ["AUDIT_MANAGER", "CAE"],
    "REVIEWED→DRAFT": ["LEAD_AUDITOR", "AUDIT_MANAGER", "CAE"], // Rework
    "APPROVED→ISSUED": ["CAE"],
    "APPROVED→REVIEWED": ["CAE"], // Re-review
  };

  export const TransitionReportSchema = z.object({
    engagementId: z.string().uuid(),
    targetStatus: z.enum(REPORT_STATUSES),
    comments: z.string().max(2000).optional(),
  });

  export type TransitionReportInput = z.infer<typeof TransitionReportSchema>;
  ```

  **3b. Create `src/actions/reports/transition-report.ts`:**

  ```typescript
  "use server";
  ```

  **`transitionReportStatus(input: TransitionReportInput)`:**
  1. Auth + extract roles
  2. Validate input with TransitionReportSchema
  3. Fetch current engagement (reportStatus)
  4. Validate transition is allowed: `REPORT_TRANSITIONS[currentStatus].includes(targetStatus)`
  5. Validate role is allowed: check `TRANSITION_ROLES[`${currentStatus}→${targetStatus}`]` against userRoles
  6. Transaction:
     - Set audit context: `report.transitioned`
     - Update engagement:
       ```typescript
       const updateData: Record<string, any> = {
         reportStatus: validated.targetStatus,
       };

       switch (validated.targetStatus) {
         case "REVIEWED":
           updateData.reportReviewedById = session.user.id;
           updateData.reportReviewedAt = new Date();
           break;
         case "APPROVED":
           updateData.reportApprovedById = session.user.id;
           updateData.reportApprovedAt = new Date();
           break;
         case "ISSUED":
           updateData.reportIssuedById = session.user.id;
           updateData.reportIssuedAt = new Date();
           break;
       }

       await tx.auditEngagement.update({
         where: { id: validated.engagementId },
         data: updateData,
       });
       ```
  7. revalidatePath
  8. Return `{ success: true, data: { newStatus, transitionedBy, transitionedAt } }`

  **Pre-conditions validation:**
  - DRAFT → REVIEWED: Requires at least one observation exists
  - REVIEWED → APPROVED: No additional check
  - APPROVED → ISSUED: Requires BH certificate to be signed (bhCertSignedAt not null)
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/actions/reports/transition-report.ts 2>&1 | head -20
  ```
  </verify>
  <done>
  - `transitionReportStatus` exported
  - Transition validation using REPORT_TRANSITIONS map
  - Role validation using TRANSITION_ROLES map
  - Pre-condition checks (observations exist, BH cert signed for issuance)
  - Appropriate fields updated per transition
  - TypeScript compiles
  </done>
</task>

<task type="auto">
  <name>Task 4: Client components — Report workflow UI</name>
  <files>src/components/reports/report-status-workflow.tsx, src/components/reports/report-approval-panel.tsx</files>
  <action>
  **4a. Create `src/components/reports/report-status-workflow.tsx`:**

  "use client" — Main workflow component:

  Props:
  ```typescript
  interface ReportStatusWorkflowProps {
    engagementId: string;
    currentStatus: ReportStatus;
    reviewedBy: { name: string; at: string } | null;
    approvedBy: { name: string; at: string } | null;
    issuedBy: { name: string; at: string } | null;
    currentUserRoles: string[];
    observationCount: number;
    bhCertSigned: boolean;
    branchName: string;
    overallRating: string | null;
  }
  ```

  Implementation:
  - **Status stepper:** 4-step horizontal stepper (DRAFT → REVIEWED → APPROVED → ISSUED)
    - Current step highlighted, completed steps shown with check
  - **Status details card:** Who performed each transition and when
  - **Available actions:** Based on current status + user roles:
    - Show relevant buttons (e.g., "Mark as Reviewed", "Approve Report", "Issue Report")
    - Disable with reason if pre-conditions not met (e.g., "BH Certificate must be signed before issuing")
  - **Rework option:** "Send Back" button for REVIEWED→DRAFT or APPROVED→REVIEWED
  - **Report generation links:** Link to generate PDF/XLSX (existing actions)
  - Use Card, Badge, Button, Alert components

  **4b. Create `src/components/reports/report-approval-panel.tsx`:**

  "use client" — Approval action panel:
  - Shows the next transition available
  - Optional comments textarea
  - Confirm button with loading state
  - Calls `transitionReportStatus` action
  - Toast on success/error
  - Shows pre-condition warnings as alerts
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/components/reports/report-status-workflow.tsx src/components/reports/report-approval-panel.tsx 2>&1 | head -20
  ```
  </verify>
  <done>
  - ReportStatusWorkflow renders 4-step stepper with status details
  - ReportApprovalPanel handles transition actions with comments
  - Role-based button visibility
  - Pre-condition warnings displayed
  - TypeScript compiles
  </done>
</task>

<task type="auto">
  <name>Task 5: Page — /audit-execution/[id]/report</name>
  <files>src/app/(dashboard)/audit-execution/[id]/report/page.tsx</files>
  <action>
  Create server component page:

  1. Fetch engagement report status via `getReportStatusForEngagement`
  2. Resolve reviewer/approver/issuer names from user IDs
  3. Compute observation count
  4. Check BH cert signed status
  5. Get current user's roles
  6. Render:
     - Header with branch name + report status badge
     - ReportStatusWorkflow component
     - Section with links to generate PDF and XLSX (existing actions)
     - Section showing observation summary

  ```typescript
  export default async function ReportPage({ params }: PageProps) {
    const { id: engagementId } = await params;
    const session = await getRequiredSession();

    const engagement = await getReportStatusForEngagement(session, engagementId);
    if (!engagement) notFound();

    const userRoles = ((session.user as any).roles ?? []) as string[];
    const currentStatus = (engagement.reportStatus ?? "DRAFT") as ReportStatus;

    // Resolve user names for display (simple approach: query users by IDs)
    // ... fetch reviewer/approver/issuer names

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Audit Report</h1>
            <p className="text-muted-foreground">
              {engagement.branch?.name} — Report routing & approval
            </p>
          </div>
          <Badge variant={currentStatus === "ISSUED" ? "default" : "secondary"}>
            {currentStatus}
          </Badge>
        </div>
        <ReportStatusWorkflow
          engagementId={engagementId}
          currentStatus={currentStatus}
          reviewedBy={...}
          approvedBy={...}
          issuedBy={...}
          currentUserRoles={userRoles}
          observationCount={engagement.observations.length}
          bhCertSigned={!!engagement.bhCertSignedAt}
          branchName={engagement.branch?.name ?? ""}
          overallRating={engagement.overallRiskRating}
        />
      </div>
    );
  }
  ```
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/app/\(dashboard\)/audit-execution/\[id\]/report/page.tsx 2>&1 | head -20
  ```
  </verify>
  <done>
  - Page exists at correct route
  - Server component fetches report status and context
  - Status badge in header
  - Workflow component rendered with all props
  - TypeScript compiles
  </done>
</task>

## Verification

```bash
# 1. TypeScript compilation
cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit

# 2. Verify transition action
grep "transitionReportStatus" src/actions/reports/transition-report.ts && echo "PASS" || echo "FAIL"

# 3. Verify transition map
grep "REPORT_TRANSITIONS" src/actions/reports/schemas.ts && echo "PASS" || echo "FAIL"

# 4. Verify role gates
grep "TRANSITION_ROLES" src/actions/reports/schemas.ts && echo "PASS" || echo "FAIL"

# 5. Verify page
test -f src/app/\(dashboard\)/audit-execution/\[id\]/report/page.tsx && echo "PASS" || echo "FAIL"

# 6. Verify schema
grep "reportStatus" prisma/schema.prisma && echo "PASS" || echo "FAIL"
```

## Success Criteria

1. **R33 gap closed:** Report routing workflow fully implemented
2. **Transitions:** DRAFT → REVIEWED → APPROVED → ISSUED with bidirectional rework
3. **Role gates:** Each transition requires appropriate role
4. **Pre-conditions:** BH cert must be signed before issuing; observations must exist before review
5. **Audit trail:** Each transition records who/when
6. **Visual workflow:** 4-step stepper with status details
7. **Schema extended:** AuditEngagement has reportStatus + tracking fields
8. **TypeScript:** All files compile
9. **Conventions:** All patterns follow CONVENTIONS.md
