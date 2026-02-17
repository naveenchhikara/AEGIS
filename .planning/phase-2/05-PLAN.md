---
phase: 2
plan: 5
type: standard
wave: 3
depends_on: [1]
files_modified:
  - src/data-access/compliance.ts
  - src/actions/compliance/schemas.ts
  - src/actions/compliance/create-compliance-items.ts
  - src/actions/compliance/submit-branch-response.ts
  - src/actions/compliance/zac-review.ts
autonomous: true
must_haves:
  truths:
    - "ComplianceItem auto-created for each issued observation with 30-day SLA"
    - "Branch can submit response with evidence attachments"
    - "ZAC can review, approve, reject, or request more info"
    - "Status transitions follow compliance lifecycle (OPEN → BRANCH_RESPONSE → ZAC_REVIEW → CLOSED)"
    - "All actions follow AEGIS conventions with proper permission checks"
  artifacts:
    - path: "src/data-access/compliance.ts"
      provides: "DAL queries for compliance item management"
      exports: ["getComplianceItems", "getComplianceItem", "getBranchComplianceItems"]
    - path: "src/actions/compliance/create-compliance-items.ts"
      provides: "Auto-create compliance items from issued observations"
    - path: "src/actions/compliance/submit-branch-response.ts"
      provides: "Branch response submission action"
    - path: "src/actions/compliance/zac-review.ts"
      provides: "ZAC review action"
  key_links:
    - from: "createComplianceItems"
      to: "Observation.status=ISSUED"
      via: "Triggers on observation transition to ISSUED status"
    - from: "submitBranchResponse"
      to: "ComplianceItem.branchResponseText"
      via: "Updates compliance item with branch response + evidence"
---

## Objective

Implement compliance lifecycle workflow from observation issuance to ZAC review. Auto-create ComplianceItem records when observations are issued, enable branches to submit responses with evidence within 30-day SLA, and provide ZAC reviewers with approval/rejection workflow. This forms the foundation for ACE/ACB escalation in future plans.

## Context

@AEGIS/src/data-access/compliance.ts — NEW: compliance DAL
@AEGIS/src/actions/compliance/*.ts — NEW: compliance actions
@AEGIS/.planning/REQUIREMENTS.md — R34, R35, R36
@AEGIS/.planning/codebase/CONVENTIONS.md — DAL patterns, server action patterns
@AEGIS/prisma/schema.prisma — ComplianceItem model (from Plan 1)

## Tasks

<task type="auto">
  <name>Task 1: Compliance DAL queries</name>
  <files>src/data-access/compliance.ts</files>
  <action>
  **Create `src/data-access/compliance.ts`:**

  ```typescript
  import "server-only";
  import { prismaForTenant } from "./prisma";
  import type { Session } from "@/lib/auth";

  /**
   * Get all compliance items for the tenant with filters.
   */
  export async function getComplianceItems(
    session: Session,
    options?: {
      status?: string;
      branchId?: string;
      escalationLevel?: number;
    }
  ) {
    const tenantId = (session.user as any).tenantId as string;
    const db = prismaForTenant(tenantId);

    return db.complianceItem.findMany({
      where: {
        tenantId,
        ...(options?.status && { status: options.status as any }),
        ...(options?.branchId && { branchId: options.branchId }),
        ...(options?.escalationLevel !== undefined && {
          escalationLevel: options.escalationLevel,
        }),
      },
      include: {
        observation: {
          select: {
            id: true,
            title: true,
            severity: true,
            status: true,
          },
        },
        branch: {
          select: { id: true, code: true, name: true, city: true },
        },
        audit: {
          select: {
            id: true,
            auditNumber: true,
            auditType: true,
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });
  }

  /**
   * Get a single compliance item by ID.
   */
  export async function getComplianceItem(
    session: Session,
    complianceItemId: string
  ) {
    const tenantId = (session.user as any).tenantId as string;
    const db = prismaForTenant(tenantId);

    return db.complianceItem.findFirst({
      where: { id: complianceItemId, tenantId },
      include: {
        observation: {
          include: {
            auditArea: { select: { name: true } },
            assignedTo: { select: { name: true, email: true } },
          },
        },
        branch: {
          select: { id: true, code: true, name: true, city: true },
        },
        audit: {
          select: {
            id: true,
            auditNumber: true,
            auditType: true,
            periodFrom: true,
            periodTo: true,
          },
        },
      },
    });
  }

  /**
   * Get compliance items for branches the user is assigned to.
   * Used by BRANCH_HEAD and AUDITEE roles.
   */
  export async function getBranchComplianceItems(
    session: Session,
    userId: string
  ) {
    const tenantId = (session.user as any).tenantId as string;
    const db = prismaForTenant(tenantId);

    // Get user's assigned branches
    const assignments = await db.userBranchAssignment.findMany({
      where: { userId, tenantId },
      select: { branchId: true },
    });

    const branchIds = assignments.map((a) => a.branchId);

    if (branchIds.length === 0) {
      return [];
    }

    return db.complianceItem.findMany({
      where: {
        tenantId,
        branchId: { in: branchIds },
      },
      include: {
        observation: {
          select: {
            id: true,
            title: true,
            severity: true,
            status: true,
          },
        },
        branch: {
          select: { id: true, code: true, name: true },
        },
      },
      orderBy: { dueDate: "asc" },
    });
  }
  ```
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit --pretty 2>&1 | grep "data-access/compliance" | head -10
  ```
  No TypeScript errors.
  </verify>
  <done>
  - src/data-access/compliance.ts exists with 3 DAL functions
  - getComplianceItems supports filtering by status, branchId, escalationLevel
  - getComplianceItem includes full nested observation + branch + audit data
  - getBranchComplianceItems filters by user's assigned branches
  - All functions use prismaForTenant and include tenantId in WHERE
  </done>
</task>

<task type="auto">
  <name>Task 2: Compliance lifecycle server actions</name>
  <files>src/actions/compliance/schemas.ts, src/actions/compliance/create-compliance-items.ts, src/actions/compliance/submit-branch-response.ts, src/actions/compliance/zac-review.ts</files>
  <action>
  **2a. Create `src/actions/compliance/schemas.ts`:**

  ```typescript
  import { z } from "zod";

  export const CreateComplianceItemsSchema = z.object({
    engagementId: z.string().uuid("Invalid engagement ID"),
  });

  export type CreateComplianceItemsInput = z.infer<typeof CreateComplianceItemsSchema>;

  export const SubmitBranchResponseSchema = z.object({
    complianceItemId: z.string().uuid("Invalid compliance item ID"),
    responseText: z.string().min(10, "Response must be at least 10 characters"),
    evidenceS3Keys: z.array(z.string()).optional(),
  });

  export type SubmitBranchResponseInput = z.infer<typeof SubmitBranchResponseSchema>;

  export const ZacReviewSchema = z.object({
    complianceItemId: z.string().uuid("Invalid compliance item ID"),
    decision: z.enum(["APPROVED", "REJECTED", "REQUEST_INFO"], {
      errorMap: () => ({ message: "Invalid decision" }),
    }),
    comments: z.string().min(5, "Comments must be at least 5 characters"),
  });

  export type ZacReviewInput = z.infer<typeof ZacReviewSchema>;
  ```

  **2b. Create `src/actions/compliance/create-compliance-items.ts`:**

  ```typescript
  "use server";

  import { revalidatePath } from "next/cache";
  import { getRequiredSession } from "@/data-access/session";
  import { prismaForTenant } from "@/data-access/prisma";
  import { setAuditContext } from "@/data-access/audit-context";
  import { hasPermission, type Role } from "@/lib/permissions";
  import { logger } from "@/lib/logger";
  import { CreateComplianceItemsSchema, type CreateComplianceItemsInput } from "./schemas";

  /**
   * Auto-create compliance items for all issued observations in an engagement.
   * Security: Requires compliance:create permission.
   * Atomicity: Creates ComplianceItem for each observation in transaction.
   * Side effects: Sets dueDate to 30 days from now per R35.
   */
  export async function createComplianceItems(input: CreateComplianceItemsInput) {
    const session = await getRequiredSession();
    const userRoles = ((session.user as any).roles ?? []) as Role[];
    const tenantId = (session.user as any).tenantId as string;

    if (!hasPermission(userRoles, "compliance:create")) {
      return {
        success: false as const,
        error: "You do not have permission to create compliance items.",
      };
    }

    const parsed = CreateComplianceItemsSchema.safeParse(input);
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
          actionType: "compliance.items_created",
          userId: session.user.id,
          tenantId,
          sessionId: session.session.id,
        });

        // Get all issued observations for the engagement
        const observations = await tx.observation.findMany({
          where: {
            tenantId,
            engagementId: parsed.data.engagementId,
            status: "ISSUED",
          },
          select: {
            id: true,
            branchId: true,
          },
        });

        if (observations.length === 0) {
          throw new Error("No issued observations found for this engagement");
        }

        // Create compliance item for each observation (if not exists)
        const createdItems = [];
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30); // 30-day SLA per R35

        for (const obs of observations) {
          // Check if compliance item already exists
          const existing = await tx.complianceItem.findUnique({
            where: { observationId: obs.id },
          });

          if (!existing) {
            const item = await tx.complianceItem.create({
              data: {
                tenantId,
                observationId: obs.id,
                auditId: parsed.data.engagementId,
                branchId: obs.branchId,
                status: "OPEN",
                dueDate,
                escalationLevel: 0,
                daysOpen: 0,
              },
            });
            createdItems.push(item);
          }
        }

        return { created: createdItems.length, total: observations.length };
      });

      revalidatePath("/compliance");
      revalidatePath(`/audit-plans/${parsed.data.engagementId}`);

      return {
        success: true as const,
        data: {
          created: result.created,
          total: result.total,
        },
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to create compliance items.";
      logger.error({ error, action: "create_compliance_items", tenantId }, message);
      return { success: false as const, error: message };
    }
  }
  ```

  **2c. Create `src/actions/compliance/submit-branch-response.ts`:**

  ```typescript
  "use server";

  import { revalidatePath } from "next/cache";
  import { getRequiredSession } from "@/data-access/session";
  import { prismaForTenant } from "@/data-access/prisma";
  import { setAuditContext } from "@/data-access/audit-context";
  import { hasPermission, type Role } from "@/lib/permissions";
  import { logger } from "@/lib/logger";
  import { SubmitBranchResponseSchema, type SubmitBranchResponseInput } from "./schemas";

  /**
   * Submit branch response to a compliance item.
   * Security: Requires compliance:branch_response permission (BRANCH_HEAD, AUDITEE).
   * Atomicity: Updates ComplianceItem with response + evidence in transaction.
   * Side effects: Transitions status to BRANCH_RESPONSE_SUBMITTED.
   */
  export async function submitBranchResponse(input: SubmitBranchResponseInput) {
    const session = await getRequiredSession();
    const userRoles = ((session.user as any).roles ?? []) as Role[];
    const tenantId = (session.user as any).tenantId as string;

    if (!hasPermission(userRoles, "compliance:branch_response")) {
      return {
        success: false as const,
        error: "You do not have permission to submit branch responses.",
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

        // Verify compliance item exists and is open
        const item = await tx.complianceItem.findFirst({
          where: { id: parsed.data.complianceItemId, tenantId },
        });

        if (!item) {
          throw new Error("Compliance item not found");
        }

        if (item.status !== "OPEN" && item.status !== "BRANCH_RESPONSE_DUE") {
          throw new Error("Can only respond to open compliance items");
        }

        // Update compliance item
        return tx.complianceItem.update({
          where: { id: item.id },
          data: {
            branchResponseText: parsed.data.responseText,
            branchResponseDate: new Date(),
            branchResponseEvidence: parsed.data.evidenceS3Keys || [],
            status: "BRANCH_RESPONSE_SUBMITTED",
          },
        });
      });

      revalidatePath("/compliance");
      revalidatePath(`/compliance/${result.id}`);

      return {
        success: true as const,
        data: { id: result.id, status: "BRANCH_RESPONSE_SUBMITTED" },
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to submit branch response.";
      logger.error({ error, action: "submit_branch_response", tenantId }, message);
      return { success: false as const, error: message };
    }
  }
  ```

  **2d. Create `src/actions/compliance/zac-review.ts`:**

  ```typescript
  "use server";

  import { revalidatePath } from "next/cache";
  import { getRequiredSession } from "@/data-access/session";
  import { prismaForTenant } from "@/data-access/prisma";
  import { setAuditContext } from "@/data-access/audit-context";
  import { hasPermission, type Role } from "@/lib/permissions";
  import { logger } from "@/lib/logger";
  import { ZacReviewSchema, type ZacReviewInput } from "./schemas";

  /**
   * ZAC review of branch response.
   * Security: Requires compliance:zac_review permission (ZONAL_AUDITOR).
   * Atomicity: Updates ComplianceItem with ZAC decision in transaction.
   * Side effects: Transitions to ZAC_APPROVED, ZAC_REJECTED, or keeps in BRANCH_RESPONSE_SUBMITTED.
   */
  export async function zacReviewCompliance(input: ZacReviewInput) {
    const session = await getRequiredSession();
    const userRoles = ((session.user as any).roles ?? []) as Role[];
    const tenantId = (session.user as any).tenantId as string;

    if (!hasPermission(userRoles, "compliance:zac_review")) {
      return {
        success: false as const,
        error: "You do not have permission to review compliance at ZAC level.",
      };
    }

    const parsed = ZacReviewSchema.safeParse(input);
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

        // Verify compliance item exists and has branch response
        const item = await tx.complianceItem.findFirst({
          where: { id: parsed.data.complianceItemId, tenantId },
        });

        if (!item) {
          throw new Error("Compliance item not found");
        }

        if (item.status !== "BRANCH_RESPONSE_SUBMITTED") {
          throw new Error("Can only review items with submitted branch response");
        }

        // Determine new status based on decision
        let newStatus: string;
        switch (parsed.data.decision) {
          case "APPROVED":
            newStatus = "ZAC_APPROVED";
            break;
          case "REJECTED":
            newStatus = "ZAC_REJECTED";
            break;
          case "REQUEST_INFO":
            newStatus = "BRANCH_RESPONSE_DUE"; // Send back to branch
            break;
        }

        // Update compliance item
        return tx.complianceItem.update({
          where: { id: item.id },
          data: {
            status: newStatus as any,
            zacReviewedById: session.user.id,
            zacReviewedAt: new Date(),
            zacReviewComments: parsed.data.comments,
            zacReviewDecision: parsed.data.decision,
          },
        });
      });

      revalidatePath("/compliance");
      revalidatePath(`/compliance/${result.id}`);

      return {
        success: true as const,
        data: { id: result.id, status: result.status, decision: parsed.data.decision },
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to review compliance.";
      logger.error({ error, action: "zac_review_compliance", tenantId }, message);
      return { success: false as const, error: message };
    }
  }
  ```
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit --pretty 2>&1 | grep -E "actions/compliance" | head -20
  ```
  No TypeScript errors in compliance actions.
  </verify>
  <done>
  - src/actions/compliance/schemas.ts has 3 Zod schemas
  - createComplianceItems auto-creates items for ISSUED observations with 30-day dueDate
  - submitBranchResponse accepts responseText + optional evidence S3 keys
  - submitBranchResponse transitions status to BRANCH_RESPONSE_SUBMITTED
  - zacReviewCompliance accepts APPROVED/REJECTED/REQUEST_INFO decision
  - ZAC approval → ZAC_APPROVED, rejection → ZAC_REJECTED, request info → BRANCH_RESPONSE_DUE
  - All actions follow AEGIS conventions (session, permissions, zod, transaction, audit context)
  </done>
</task>

## Success Criteria

1. `pnpm exec tsc --noEmit` has no errors in compliance files
2. compliance.ts has 3 DAL functions with proper tenant scoping
3. getBranchComplianceItems filters by user's assigned branches
4. createComplianceItems auto-creates items for all ISSUED observations
5. Default dueDate is 30 days from creation (R35 SLA)
6. submitBranchResponse validates item is OPEN or BRANCH_RESPONSE_DUE
7. Branch response includes responseText, responseDate, evidence S3 keys
8. zacReviewCompliance requires BRANCH_RESPONSE_SUBMITTED status
9. ZAC decisions transition correctly: APPROVED→ZAC_APPROVED, REJECTED→ZAC_REJECTED, REQUEST_INFO→BRANCH_RESPONSE_DUE
10. All actions have proper permission checks (compliance:create, compliance:branch_response, compliance:zac_review)
