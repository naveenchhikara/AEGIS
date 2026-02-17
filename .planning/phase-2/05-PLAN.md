---
phase: 2
plan: 5
type: standard
wave: 3
depends_on: [1, 2]
files_modified:
  - src/actions/compliance/submit-branch-response.ts (new)
  - src/actions/compliance/zac-review.ts (new)
  - src/actions/compliance/ace-process.ts (new)
  - src/actions/compliance/escalate-compliance.ts (new)
  - src/lib/cron/compliance-escalation.ts (new)
autonomous: true
must_haves:
  truths:
    - "Branch can submit response with compliance:branch_response permission"
    - "ZAC can accept/reject/request info with compliance:zac_review permission"
    - "CAE can process for ACE with compliance:ace_process permission"
    - "Escalation engine runs daily cron: L1 (+15d email), L2 (+30d ZAC), L3 (+90d ACE), L4 (+180d ACB)"
    - "Status history recorded in ComplianceStatusHistory on each transition"
    - "Escalation events recorded in ComplianceEscalation with notifiedUserIds"
  artifacts:
    - path: "src/actions/compliance/submit-branch-response.ts"
      provides: "Server action for branch response submission"
    - path: "src/actions/compliance/zac-review.ts"
      provides: "Server action for ZAC accept/reject/request-info"
    - path: "src/actions/compliance/ace-process.ts"
      provides: "Server action for ACE processing"
    - path: "src/actions/compliance/escalate-compliance.ts"
      provides: "Server action for manual escalation + cron job entry point"
    - path: "src/lib/cron/compliance-escalation.ts"
      provides: "Daily cron job to check and escalate overdue compliance items"
---

## Objective

Implement the full compliance lifecycle: branch response submission (R35), ZAC review (R36), ACE processing (R37), ACB reporting (R38), and the escalation engine (R39) that automatically escalates overdue items at +15d, +30d, +90d, +180d intervals with notifications.

This plan covers R35-R39 (compliance lifecycle and escalation).

## Context

@AEGIS/prisma/schema.prisma — ComplianceItem, ComplianceEscalation, ComplianceStatusHistory
@AEGIS/src/data-access/compliance-items.ts — ComplianceItem DAL from Plan 02
@AEGIS/.planning/REQUIREMENTS.md — R35-R39
@AEGIS/.planning/codebase/CONVENTIONS.md — server action patterns

## Tasks

<task type="auto">
  <name>Task 1: Branch response submission action</name>
  <files>src/actions/compliance/submit-branch-response.ts (new)</files>
  <action>
  Create `src/actions/compliance/submit-branch-response.ts`:

  ```typescript
  "use server";

  import { getRequiredSession } from "@/data-access/session";
  import { prismaForTenant } from "@/data-access/prisma";
  import { setAuditContext } from "@/data-access/audit-context";
  import { hasPermission, type Role } from "@/lib/permissions";
  import { logger } from "@/lib/logger";
  import { z } from "zod";

  const SubmitBranchResponseSchema = z.object({
    complianceItemId: z.string().uuid(),
    responseText: z.string().min(10, "Response must be at least 10 characters"),
  });

  /**
   * Submit branch response for a compliance item (R35).
   * Transitions: OPEN → PENDING_ZAC_REVIEW
   * Security: Requires compliance:branch_response permission
   */
  export async function submitBranchResponse(
    input: z.infer<typeof SubmitBranchResponseSchema>
  ) {
    const session = await getRequiredSession();
    const userRoles = ((session.user as any).roles ?? []) as Role[];
    const tenantId = (session.user as any).tenantId as string;

    if (!hasPermission(userRoles, "compliance:branch_response")) {
      return {
        success: false as const,
        error: "You do not have permission to submit compliance responses.",
      };
    }

    const parsed = SubmitBranchResponseSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues[0].message,
      };
    }

    const db = prismaForTenant(tenantId);

    try {
      const result = await db.$transaction(async (tx: any) => {
        await setAuditContext(tx, {
          actionType: "compliance.branch_response_submitted",
          userId: session.user.id,
          tenantId,
          sessionId: session.session.id,
        });

        const complianceItem = await tx.complianceItem.findFirst({
          where: { id: parsed.data.complianceItemId, tenantId },
        });

        if (!complianceItem) {
          throw new Error("Compliance item not found");
        }

        if (complianceItem.status !== "OPEN" && complianceItem.status !== "PENDING_BRANCH_RESPONSE") {
          throw new Error(`Cannot submit response for item in ${complianceItem.status} status`);
        }

        // Update compliance item
        const updated = await tx.complianceItem.update({
          where: { id: parsed.data.complianceItemId },
          data: {
            status: "PENDING_ZAC_REVIEW",
            branchResponseSubmittedAt: new Date(),
            branchResponseSubmittedBy: session.user.id,
          },
        });

        // Update observation with auditee response
        await tx.observation.update({
          where: { id: complianceItem.observationId },
          data: {
            auditeeResponse: parsed.data.responseText,
          },
        });

        // Record status history
        await tx.complianceStatusHistory.create({
          data: {
            tenantId,
            complianceItemId: complianceItem.id,
            fromStatus: complianceItem.status,
            toStatus: "PENDING_ZAC_REVIEW",
            changedById: session.user.id,
            comments: "Branch response submitted",
          },
        });

        return updated;
      });

      logger.info(
        { complianceItemId: result.id, tenantId },
        "Branch response submitted"
      );

      return {
        success: true as const,
        data: { complianceItemId: result.id },
      };
    } catch (error: any) {
      logger.error(
        { error, complianceItemId: input.complianceItemId, tenantId },
        "Failed to submit branch response"
      );

      return {
        success: false as const,
        error: error.message || "Failed to submit response. Please try again.",
      };
    }
  }
  ```
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/actions/compliance/submit-branch-response.ts
  ```
  </verify>
  <done>
  - submit-branch-response.ts exists with submitBranchResponse() action
  - Transitions OPEN → PENDING_ZAC_REVIEW
  - Updates observation.auditeeResponse
  - Records ComplianceStatusHistory
  - Permission check: compliance:branch_response
  - TypeScript compiles successfully
  </done>
</task>

<task type="auto">
  <name>Task 2: ZAC review action</name>
  <files>src/actions/compliance/zac-review.ts (new)</files>
  <action>
  Create `src/actions/compliance/zac-review.ts`:

  ```typescript
  "use server";

  import { getRequiredSession } from "@/data-access/session";
  import { prismaForTenant } from "@/data-access/prisma";
  import { setAuditContext } from "@/data-access/audit-context";
  import { hasPermission, type Role } from "@/lib/permissions";
  import { logger } from "@/lib/logger";
  import { z } from "zod";

  const ZACReviewSchema = z.object({
    complianceItemId: z.string().uuid(),
    decision: z.enum(["ACCEPTED", "REJECTED", "REQUEST_INFO"]),
    comments: z.string().optional(),
  });

  /**
   * ZAC review of branch response (R36).
   * Transitions:
   * - ACCEPTED: PENDING_ZAC_REVIEW → PENDING_ACE
   * - REJECTED: PENDING_ZAC_REVIEW → PENDING_BRANCH_RESPONSE
   * - REQUEST_INFO: PENDING_ZAC_REVIEW → PENDING_BRANCH_RESPONSE
   * 
   * Security: Requires compliance:zac_review permission (ZONAL_AUDITOR role)
   */
  export async function zacReview(input: z.infer<typeof ZACReviewSchema>) {
    const session = await getRequiredSession();
    const userRoles = ((session.user as any).roles ?? []) as Role[];
    const tenantId = (session.user as any).tenantId as string;

    if (!hasPermission(userRoles, "compliance:zac_review")) {
      return {
        success: false as const,
        error: "You do not have permission to perform ZAC review.",
      };
    }

    const parsed = ZACReviewSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues[0].message,
      };
    }

    const db = prismaForTenant(tenantId);

    try {
      const result = await db.$transaction(async (tx: any) => {
        await setAuditContext(tx, {
          actionType: "compliance.zac_reviewed",
          userId: session.user.id,
          tenantId,
          sessionId: session.session.id,
        });

        const complianceItem = await tx.complianceItem.findFirst({
          where: { id: parsed.data.complianceItemId, tenantId },
        });

        if (!complianceItem) {
          throw new Error("Compliance item not found");
        }

        if (complianceItem.status !== "PENDING_ZAC_REVIEW") {
          throw new Error(`Cannot review item in ${complianceItem.status} status`);
        }

        // Determine new status based on decision
        let newStatus: string;
        if (parsed.data.decision === "ACCEPTED") {
          newStatus = "PENDING_ACE";
        } else {
          newStatus = "PENDING_BRANCH_RESPONSE";
        }

        // Update compliance item
        const updated = await tx.complianceItem.update({
          where: { id: parsed.data.complianceItemId },
          data: {
            status: newStatus,
            zacReviewedAt: new Date(),
            zacReviewedBy: session.user.id,
            zacDecision: parsed.data.decision,
            zacComments: parsed.data.comments,
          },
        });

        // Record status history
        await tx.complianceStatusHistory.create({
          data: {
            tenantId,
            complianceItemId: complianceItem.id,
            fromStatus: complianceItem.status,
            toStatus: newStatus,
            changedById: session.user.id,
            comments: `ZAC ${parsed.data.decision}: ${parsed.data.comments ?? ""}`,
          },
        });

        return updated;
      });

      logger.info(
        { complianceItemId: result.id, decision: parsed.data.decision, tenantId },
        "ZAC review completed"
      );

      return {
        success: true as const,
        data: { complianceItemId: result.id },
      };
    } catch (error: any) {
      logger.error(
        { error, complianceItemId: input.complianceItemId, tenantId },
        "Failed to complete ZAC review"
      );

      return {
        success: false as const,
        error: error.message || "Failed to complete review. Please try again.",
      };
    }
  }
  ```
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/actions/compliance/zac-review.ts
  ```
  </verify>
  <done>
  - zac-review.ts exists with zacReview() action
  - Supports ACCEPTED, REJECTED, REQUEST_INFO decisions
  - Transitions: PENDING_ZAC_REVIEW → PENDING_ACE or PENDING_BRANCH_RESPONSE
  - Records ComplianceStatusHistory with ZAC decision
  - Permission check: compliance:zac_review
  - TypeScript compiles successfully
  </done>
</task>

<task type="auto">
  <name>Task 3: ACE processing action</name>
  <files>src/actions/compliance/ace-process.ts (new)</files>
  <action>
  Create `src/actions/compliance/ace-process.ts`:

  ```typescript
  "use server";

  import { getRequiredSession } from "@/data-access/session";
  import { prismaForTenant } from "@/data-access/prisma";
  import { setAuditContext } from "@/data-access/audit-context";
  import { hasPermission, type Role } from "@/lib/permissions";
  import { logger } from "@/lib/logger";
  import { z } from "zod";
  import type { Quarter } from "@/generated/prisma/enums";

  const ACEProcessSchema = z.object({
    complianceItemId: z.string().uuid(),
    quarter: z.enum(["Q1_APR_JUN", "Q2_JUL_SEP", "Q3_OCT_DEC", "Q4_JAN_MAR"]),
    year: z.number().int().min(2000).max(2100),
    comments: z.string().optional(),
  });

  /**
   * Process compliance item for ACE reporting (R37).
   * Transitions: PENDING_ACE → PENDING_ACB
   * 
   * Security: Requires compliance:ace_process permission (CAE role)
   */
  export async function aceProcess(input: z.infer<typeof ACEProcessSchema>) {
    const session = await getRequiredSession();
    const userRoles = ((session.user as any).roles ?? []) as Role[];
    const tenantId = (session.user as any).tenantId as string;

    if (!hasPermission(userRoles, "compliance:ace_process")) {
      return {
        success: false as const,
        error: "You do not have permission to process ACE items.",
      };
    }

    const parsed = ACEProcessSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false as const,
        error: parsed.error.issues[0].message,
      };
    }

    const db = prismaForTenant(tenantId);

    try {
      const result = await db.$transaction(async (tx: any) => {
        await setAuditContext(tx, {
          actionType: "compliance.ace_processed",
          userId: session.user.id,
          tenantId,
          sessionId: session.session.id,
        });

        const complianceItem = await tx.complianceItem.findFirst({
          where: { id: parsed.data.complianceItemId, tenantId },
        });

        if (!complianceItem) {
          throw new Error("Compliance item not found");
        }

        if (complianceItem.status !== "PENDING_ACE") {
          throw new Error(`Cannot process item in ${complianceItem.status} status`);
        }

        const updated = await tx.complianceItem.update({
          where: { id: parsed.data.complianceItemId },
          data: {
            status: "PENDING_ACB",
            aceProcessedAt: new Date(),
            aceProcessedBy: session.user.id,
            aceQuarter: parsed.data.quarter,
            aceYear: parsed.data.year,
          },
        });

        await tx.complianceStatusHistory.create({
          data: {
            tenantId,
            complianceItemId: complianceItem.id,
            fromStatus: complianceItem.status,
            toStatus: "PENDING_ACB",
            changedById: session.user.id,
            comments: `ACE processed for ${parsed.data.quarter} ${parsed.data.year}`,
          },
        });

        return updated;
      });

      logger.info(
        { complianceItemId: result.id, quarter: parsed.data.quarter, year: parsed.data.year, tenantId },
        "ACE processing completed"
      );

      return {
        success: true as const,
        data: { complianceItemId: result.id },
      };
    } catch (error: any) {
      logger.error(
        { error, complianceItemId: input.complianceItemId, tenantId },
        "Failed to process ACE item"
      );

      return {
        success: false as const,
        error: error.message || "Failed to process ACE item. Please try again.",
      };
    }
  }

  /**
   * Mark compliance item as reported to ACB (R38).
   * Transitions: PENDING_ACB → CLOSED (or COMPLIED)
   * 
   * Security: Requires compliance:acb_report permission (CEO role)
   */
  export async function acbReport(complianceItemId: string, meetingDate: Date) {
    const session = await getRequiredSession();
    const userRoles = ((session.user as any).roles ?? []) as Role[];
    const tenantId = (session.user as any).tenantId as string;

    if (!hasPermission(userRoles, "compliance:acb_report")) {
      return {
        success: false as const,
        error: "You do not have permission to report to ACB.",
      };
    }

    const db = prismaForTenant(tenantId);

    try {
      const result = await db.$transaction(async (tx: any) => {
        await setAuditContext(tx, {
          actionType: "compliance.acb_reported",
          userId: session.user.id,
          tenantId,
          sessionId: session.session.id,
        });

        const complianceItem = await tx.complianceItem.findFirst({
          where: { id: complianceItemId, tenantId },
        });

        if (!complianceItem) {
          throw new Error("Compliance item not found");
        }

        if (complianceItem.status !== "PENDING_ACB") {
          throw new Error(`Cannot report item in ${complianceItem.status} status`);
        }

        const updated = await tx.complianceItem.update({
          where: { id: complianceItemId },
          data: {
            status: "CLOSED",
            acbReportedAt: new Date(),
            acbReportedBy: session.user.id,
            acbMeetingDate: meetingDate,
            closedAt: new Date(),
            closedBy: session.user.id,
            closureReason: "Reported to ACB",
          },
        });

        await tx.complianceStatusHistory.create({
          data: {
            tenantId,
            complianceItemId: complianceItem.id,
            fromStatus: complianceItem.status,
            toStatus: "CLOSED",
            changedById: session.user.id,
            comments: `Reported to ACB meeting on ${meetingDate.toISOString().split("T")[0]}`,
          },
        });

        return updated;
      });

      logger.info({ complianceItemId: result.id, tenantId }, "ACB report completed");

      return {
        success: true as const,
        data: { complianceItemId: result.id },
      };
    } catch (error: any) {
      logger.error({ error, complianceItemId, tenantId }, "Failed to report to ACB");

      return {
        success: false as const,
        error: error.message || "Failed to report to ACB. Please try again.",
      };
    }
  }
  ```
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/actions/compliance/ace-process.ts
  ```
  </verify>
  <done>
  - ace-process.ts exists with aceProcess() and acbReport() actions
  - aceProcess() transitions PENDING_ACE → PENDING_ACB with quarter/year tracking
  - acbReport() transitions PENDING_ACB → CLOSED with meeting date
  - Permission checks: compliance:ace_process, compliance:acb_report
  - TypeScript compiles successfully
  </done>
</task>

<task type="auto">
  <name>Task 4: Escalation engine (cron job + manual trigger)</name>
  <files>src/lib/cron/compliance-escalation.ts (new), src/actions/compliance/escalate-compliance.ts (new)</files>
  <action>
  **4a. Create `src/lib/cron/compliance-escalation.ts`:**

  ```typescript
  import { prismaForTenant } from "@/data-access/prisma";
  import { logger } from "@/lib/logger";
  import type { EscalationLevel } from "@/generated/prisma/enums";

  /**
   * Daily cron job to escalate overdue compliance items (R39).
   * Escalation levels:
   * - L1_EMAIL: +15 days (send email reminder)
   * - L2_ZAC: +30 days (escalate to ZAC)
   * - L3_ACE: +90 days (escalate to ACE)
   * - L4_ACB: +180 days (escalate to ACB)
   * 
   * Run daily via cron: 0 2 * * * (2 AM daily)
   */
  export async function escalateOverdueComplianceItems(tenantId: string) {
    const db = prismaForTenant(tenantId);

    try {
      const now = new Date();

      // Fetch all open compliance items
      const openItems = await db.complianceItem.findMany({
        where: {
          tenantId,
          status: {
            notIn: ["COMPLIED", "ACCEPTED_RISK", "CLOSED"],
          },
        },
        select: {
          id: true,
          daysOpen: true,
          escalationLevel: true,
          createdAt: true,
        },
      });

      for (const item of openItems) {
        const daysOpen = Math.floor(
          (now.getTime() - item.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        let newEscalationLevel: EscalationLevel | null = null;

        // Determine escalation level based on days open
        if (daysOpen >= 180 && item.escalationLevel !== "L4_ACB") {
          newEscalationLevel = "L4_ACB";
        } else if (daysOpen >= 90 && item.escalationLevel === "L2_ZAC") {
          newEscalationLevel = "L3_ACE";
        } else if (daysOpen >= 30 && item.escalationLevel === "L1_EMAIL") {
          newEscalationLevel = "L2_ZAC";
        } else if (daysOpen >= 15 && item.escalationLevel === "NONE") {
          newEscalationLevel = "L1_EMAIL";
        }

        if (newEscalationLevel) {
          // Update escalation level
          await db.complianceItem.update({
            where: { id: item.id },
            data: {
              escalationLevel: newEscalationLevel,
              daysOpen,
            },
          });

          // Record escalation event
          await db.complianceEscalation.create({
            data: {
              tenantId,
              complianceItemId: item.id,
              level: newEscalationLevel,
              notifiedUserIds: [], // TODO: Fetch relevant users (ZAC, ACE, ACB members)
              emailsSent: 0, // TODO: Send notification emails
            },
          });

          logger.info(
            { complianceItemId: item.id, escalationLevel: newEscalationLevel, daysOpen, tenantId },
            "Compliance item escalated"
          );
        }
      }

      logger.info({ tenantId, count: openItems.length }, "Compliance escalation cron completed");
    } catch (error) {
      logger.error({ error, tenantId }, "Failed to run compliance escalation cron");
      throw error;
    }
  }
  ```

  **4b. Create `src/actions/compliance/escalate-compliance.ts`:**

  ```typescript
  "use server";

  import { getRequiredSession } from "@/data-access/session";
  import { hasPermission, type Role } from "@/lib/permissions";
  import { logger } from "@/lib/logger";
  import { escalateOverdueComplianceItems } from "@/lib/cron/compliance-escalation";

  /**
   * Manual trigger for compliance escalation (admin utility).
   * Security: Requires compliance:manage permission
   */
  export async function triggerComplianceEscalation() {
    const session = await getRequiredSession();
    const userRoles = ((session.user as any).roles ?? []) as Role[];
    const tenantId = (session.user as any).tenantId as string;

    if (!hasPermission(userRoles, "compliance:manage")) {
      return {
        success: false as const,
        error: "You do not have permission to trigger escalation.",
      };
    }

    try {
      await escalateOverdueComplianceItems(tenantId);

      logger.info({ tenantId }, "Manual compliance escalation triggered");

      return {
        success: true as const,
        data: { message: "Escalation completed successfully" },
      };
    } catch (error) {
      logger.error({ error, tenantId }, "Failed to trigger compliance escalation");

      return {
        success: false as const,
        error: "Failed to trigger escalation. Please try again.",
      };
    }
  }
  ```
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/lib/cron/compliance-escalation.ts src/actions/compliance/escalate-compliance.ts
  ```
  </verify>
  <done>
  - compliance-escalation.ts exists with escalateOverdueComplianceItems()
  - Escalation thresholds: +15d (L1), +30d (L2), +90d (L3), +180d (L4)
  - Creates ComplianceEscalation records with level and timestamp
  - escalate-compliance.ts provides manual trigger action
  - TypeScript compiles successfully
  </done>
</task>

## Success Criteria

1. `pnpm exec tsc --noEmit` passes for all new files
2. submitBranchResponse() transitions OPEN → PENDING_ZAC_REVIEW
3. zacReview() supports ACCEPTED/REJECTED/REQUEST_INFO decisions
4. aceProcess() transitions PENDING_ACE → PENDING_ACB with quarter/year
5. acbReport() transitions PENDING_ACB → CLOSED with meeting date
6. escalateOverdueComplianceItems() cron job escalates at +15d, +30d, +90d, +180d
7. All actions record ComplianceStatusHistory for audit trail
8. Permission checks enforce role-based access (branch, ZAC, ACE, ACB)
