---
phase: 1
plan: 6
type: standard
wave: 5
depends_on: [4]
files_modified:
  - src/data-access/audit-execution.ts
  - src/actions/audit-execution/schemas.ts
  - src/actions/audit-execution/assign-team.ts
  - src/actions/audit-execution/initialize-sections.ts
  - src/actions/audit-execution/submit-examination-response.ts
  - src/actions/audit-execution/update-section-status.ts
autonomous: true
must_haves:
  truths:
    - "Team members can be assigned to an engagement with role and section assignments"
    - "Section instances can be initialized for an engagement from examination areas"
    - "Auditor can submit examination response (status + observation) for any item in their assigned sections"
    - "Non-compliant responses auto-create linked Observation records"
    - "Section status can be progressed: NOT_STARTED → IN_PROGRESS → COMPLETED → REVIEWED"
  artifacts:
    - path: "src/data-access/audit-execution.ts"
      provides: "DAL: getEngagementWithTeam, getEngagementSections, getExaminationResponsesForSection"
      exports: ["getEngagementWithTeam", "getEngagementSections", "getExaminationResponsesForSection", "getEngagementExaminationItems"]
    - path: "src/actions/audit-execution/schemas.ts"
      provides: "Zod schemas for all audit execution actions"
    - path: "src/actions/audit-execution/assign-team.ts"
      provides: "assignTeamMember, removeTeamMember server actions"
    - path: "src/actions/audit-execution/initialize-sections.ts"
      provides: "initializeSections server action"
    - path: "src/actions/audit-execution/submit-examination-response.ts"
      provides: "submitExaminationResponse server action with auto-observation creation"
    - path: "src/actions/audit-execution/update-section-status.ts"
      provides: "updateSectionStatus server action"
  key_links:
    - from: "submit-examination-response.ts"
      to: "Observation"
      via: "Auto-creates Observation when status is NON_COMPLIANT, links via AuditExaminationResponse.observationId"
    - from: "initialize-sections.ts"
      to: "ExaminationArea"
      via: "Reads active areas and creates AuditSectionInstance for each"
    - from: "assign-team.ts"
      to: "AuditTeamMember"
      via: "Creates/deletes AuditTeamMember records"
---

## Objective

Build the audit execution backend: server actions for team assignment, section initialization, examination response submission (with auto-observation creation for non-compliant items), and section status management. These actions power the core audit execution workflow where auditors examine branches section-by-section.

## Context

@AEGIS/src/data-access/audit-execution.ts — NEW: DAL queries
@AEGIS/src/actions/audit-execution/ — NEW: server actions directory
@AEGIS/.planning/codebase/CONVENTIONS.md — server action patterns
@AEGIS/.planning/codebase/ARCHITECTURE.md — data flow, transaction patterns
@AEGIS/.planning/REQUIREMENTS.md — R10, R12, R13, R16, R17, R18

## Tasks

<task type="auto">
  <name>Task 1: DAL queries + Zod schemas for audit execution</name>
  <files>src/data-access/audit-execution.ts, src/actions/audit-execution/schemas.ts</files>
  <action>
  **1a. Create `src/data-access/audit-execution.ts`:**

  ```typescript
  import "server-only";
  import { prismaForTenant } from "./prisma";
  import type { Session } from "@/lib/auth";

  /**
   * Get engagement with team members, branch, and section instances.
   */
  export async function getEngagementWithTeam(
    session: Session,
    engagementId: string
  ) {
    const tenantId = (session.user as any).tenantId as string;
    const db = prismaForTenant(tenantId);

    return db.auditEngagement.findFirst({
      where: { id: engagementId, tenantId },
      include: {
        branch: { select: { id: true, code: true, name: true, city: true } },
        auditPlan: { select: { id: true, year: true, quarter: true } },
        teamMembers: {
          include: {
            user: { select: { id: true, name: true, email: true, roles: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        sectionInstances: {
          orderBy: { sectionCode: "asc" },
        },
      },
    });
  }

  /**
   * Get section instances for an engagement.
   */
  export async function getEngagementSections(
    session: Session,
    engagementId: string
  ) {
    const tenantId = (session.user as any).tenantId as string;
    const db = prismaForTenant(tenantId);

    return db.auditSectionInstance.findMany({
      where: { engagementId, tenantId },
      orderBy: { sectionCode: "asc" },
    });
  }

  /**
   * Get examination responses for a specific section/area within an engagement.
   * Returns all items for the area with their response status.
   */
  export async function getExaminationResponsesForSection(
    session: Session,
    engagementId: string,
    areaCode: string
  ) {
    const tenantId = (session.user as any).tenantId as string;
    const db = prismaForTenant(tenantId);

    // Get the examination area
    const area = await db.examinationArea.findFirst({
      where: { tenantId, code: areaCode, isActive: true },
      select: { id: true, code: true, name: true },
    });

    if (!area) return null;

    // Get all items for this area with their responses for this engagement
    const items = await db.examinationItem.findMany({
      where: { tenantId, areaId: area.id, isActive: true },
      include: {
        responses: {
          where: { engagementId },
          select: {
            id: true,
            status: true,
            observation: true,
            riskRating: true,
            respondedById: true,
            respondedAt: true,
            observationId: true,
          },
        },
      },
      orderBy: { displayOrder: "asc" },
    });

    return { area, items };
  }

  /**
   * Get examination items for a section (used during initialization to count items).
   */
  export async function getEngagementExaminationItems(
    session: Session,
    engagementId: string,
    areaCode: string
  ) {
    const tenantId = (session.user as any).tenantId as string;
    const db = prismaForTenant(tenantId);

    const area = await db.examinationArea.findFirst({
      where: { tenantId, code: areaCode, isActive: true },
    });

    if (!area) return [];

    return db.examinationItem.findMany({
      where: { tenantId, areaId: area.id, isActive: true },
      orderBy: { displayOrder: "asc" },
    });
  }
  ```

  **1b. Create `src/actions/audit-execution/schemas.ts`:**

  ```typescript
  import { z } from "zod";

  export const AssignTeamMemberSchema = z.object({
    engagementId: z.string().uuid("Invalid engagement ID"),
    userId: z.string().uuid("Invalid user ID"),
    roleInEngagement: z.enum(["LEAD_AUDITOR", "FIELD_AUDITOR"], {
      errorMap: () => ({ message: "Role must be LEAD_AUDITOR or FIELD_AUDITOR" }),
    }),
    assignedSections: z.array(z.string()).default([]),
  });

  export type AssignTeamMemberInput = z.infer<typeof AssignTeamMemberSchema>;

  export const RemoveTeamMemberSchema = z.object({
    engagementId: z.string().uuid("Invalid engagement ID"),
    userId: z.string().uuid("Invalid user ID"),
  });

  export type RemoveTeamMemberInput = z.infer<typeof RemoveTeamMemberSchema>;

  export const InitializeSectionsSchema = z.object({
    engagementId: z.string().uuid("Invalid engagement ID"),
  });

  export type InitializeSectionsInput = z.infer<typeof InitializeSectionsSchema>;

  export const SubmitExaminationResponseSchema = z.object({
    engagementId: z.string().uuid("Invalid engagement ID"),
    itemId: z.string().uuid("Invalid item ID"),
    status: z.enum(["COMPLIANT", "NON_COMPLIANT", "PARTIAL", "NOT_APPLICABLE"], {
      errorMap: () => ({ message: "Status must be COMPLIANT, NON_COMPLIANT, PARTIAL, or NOT_APPLICABLE" }),
    }),
    observation: z.string().max(2000).optional(),
    riskRating: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  });

  export type SubmitExaminationResponseInput = z.infer<typeof SubmitExaminationResponseSchema>;

  export const UpdateSectionStatusSchema = z.object({
    engagementId: z.string().uuid("Invalid engagement ID"),
    sectionCode: z.string().min(1, "Section code is required"),
    status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "REVIEWED"], {
      errorMap: () => ({ message: "Invalid section status" }),
    }),
  });

  export type UpdateSectionStatusInput = z.infer<typeof UpdateSectionStatusSchema>;
  ```
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit --pretty 2>&1 | grep -E "(audit-execution)" | head -10
  ```
  No TypeScript errors in audit-execution files. Files exist:
  ```bash
  ls -la src/data-access/audit-execution.ts src/actions/audit-execution/schemas.ts
  ```
  </verify>
  <done>
  - src/data-access/audit-execution.ts: 4 DAL functions following AEGIS conventions
  - src/actions/audit-execution/schemas.ts: 5 Zod schemas with proper validation
  - All use prismaForTenant, accept Session, include tenantId in WHERE
  - SubmitExaminationResponseSchema excludes PENDING (only set by system)
  </done>
</task>

<task type="auto">
  <name>Task 2: Server actions — assign team, initialize sections, submit response, update status</name>
  <files>src/actions/audit-execution/assign-team.ts, src/actions/audit-execution/initialize-sections.ts, src/actions/audit-execution/submit-examination-response.ts, src/actions/audit-execution/update-section-status.ts</files>
  <action>
  **2a. Create `src/actions/audit-execution/assign-team.ts`:**

  ```typescript
  "use server";

  import { revalidatePath } from "next/cache";
  import { getRequiredSession } from "@/data-access/session";
  import { prismaForTenant } from "@/data-access/prisma";
  import { setAuditContext } from "@/data-access/audit-context";
  import { hasPermission, type Role } from "@/lib/permissions";
  import { logger } from "@/lib/logger";
  import {
    AssignTeamMemberSchema,
    RemoveTeamMemberSchema,
    type AssignTeamMemberInput,
    type RemoveTeamMemberInput,
  } from "./schemas";

  /**
   * Assign a user to an audit engagement team.
   * Security: Requires audit_execution:manage_team permission.
   */
  export async function assignTeamMember(input: AssignTeamMemberInput) {
    const session = await getRequiredSession();
    const userRoles = ((session.user as any).roles ?? []) as Role[];
    const tenantId = (session.user as any).tenantId as string;

    if (!hasPermission(userRoles, "audit_execution:manage_team")) {
      return { success: false as const, error: "You do not have permission to manage audit teams." };
    }

    const parsed = AssignTeamMemberSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0].message };
    }
    const validated = parsed.data;

    const db = prismaForTenant(tenantId);

    try {
      const result = await db.$transaction(async (tx: any) => {
        await setAuditContext(tx, {
          actionType: "audit_team.member_assigned",
          userId: session.user.id,
          tenantId,
          sessionId: session.session.id,
        });

        // Verify engagement exists
        const engagement = await tx.auditEngagement.findFirst({
          where: { id: validated.engagementId, tenantId },
        });
        if (!engagement) {
          throw new Error("Engagement not found");
        }

        // Verify user exists and belongs to tenant
        const user = await tx.user.findFirst({
          where: { id: validated.userId, tenantId },
        });
        if (!user) {
          throw new Error("User not found");
        }

        // Upsert team member (allows updating role/sections)
        return tx.auditTeamMember.upsert({
          where: {
            engagementId_userId: {
              engagementId: validated.engagementId,
              userId: validated.userId,
            },
          },
          update: {
            roleInEngagement: validated.roleInEngagement,
            assignedSections: validated.assignedSections,
          },
          create: {
            tenantId,
            engagementId: validated.engagementId,
            userId: validated.userId,
            roleInEngagement: validated.roleInEngagement,
            assignedSections: validated.assignedSections,
          },
        });
      });

      revalidatePath("/audit-execution");
      return { success: true as const, data: { id: result.id } };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to assign team member.";
      logger.error({ error, action: "assign_team_member", tenantId }, message);
      return { success: false as const, error: message };
    }
  }

  /**
   * Remove a user from an audit engagement team.
   * Security: Requires audit_execution:manage_team permission.
   */
  export async function removeTeamMember(input: RemoveTeamMemberInput) {
    const session = await getRequiredSession();
    const userRoles = ((session.user as any).roles ?? []) as Role[];
    const tenantId = (session.user as any).tenantId as string;

    if (!hasPermission(userRoles, "audit_execution:manage_team")) {
      return { success: false as const, error: "You do not have permission to manage audit teams." };
    }

    const parsed = RemoveTeamMemberSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0].message };
    }
    const validated = parsed.data;

    const db = prismaForTenant(tenantId);

    try {
      await db.$transaction(async (tx: any) => {
        await setAuditContext(tx, {
          actionType: "audit_team.member_removed",
          userId: session.user.id,
          tenantId,
          sessionId: session.session.id,
        });

        const member = await tx.auditTeamMember.findFirst({
          where: {
            engagementId: validated.engagementId,
            userId: validated.userId,
            tenant: { id: tenantId },
          },
        });
        if (!member) {
          throw new Error("Team member not found");
        }

        await tx.auditTeamMember.delete({
          where: { id: member.id },
        });
      });

      revalidatePath("/audit-execution");
      return { success: true as const, data: {} };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to remove team member.";
      logger.error({ error, action: "remove_team_member", tenantId }, message);
      return { success: false as const, error: message };
    }
  }
  ```

  **2b. Create `src/actions/audit-execution/initialize-sections.ts`:**

  ```typescript
  "use server";

  import { revalidatePath } from "next/cache";
  import { getRequiredSession } from "@/data-access/session";
  import { prismaForTenant } from "@/data-access/prisma";
  import { setAuditContext } from "@/data-access/audit-context";
  import { hasPermission, type Role } from "@/lib/permissions";
  import { logger } from "@/lib/logger";
  import { InitializeSectionsSchema } from "./schemas";

  /**
   * Initialize section instances for an engagement from active examination areas.
   * Creates one AuditSectionInstance per active ExaminationArea.
   * Idempotent: skips areas that already have a section instance.
   * Security: Requires audit_execution:manage_sections permission.
   */
  export async function initializeSections(input: { engagementId: string }) {
    const session = await getRequiredSession();
    const userRoles = ((session.user as any).roles ?? []) as Role[];
    const tenantId = (session.user as any).tenantId as string;

    if (!hasPermission(userRoles, "audit_execution:manage_sections")) {
      return { success: false as const, error: "You do not have permission to manage audit sections." };
    }

    const parsed = InitializeSectionsSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0].message };
    }

    const db = prismaForTenant(tenantId);

    try {
      const result = await db.$transaction(async (tx: any) => {
        await setAuditContext(tx, {
          actionType: "audit_sections.initialized",
          userId: session.user.id,
          tenantId,
          sessionId: session.session.id,
        });

        // Verify engagement
        const engagement = await tx.auditEngagement.findFirst({
          where: { id: parsed.data.engagementId, tenantId },
        });
        if (!engagement) {
          throw new Error("Engagement not found");
        }

        // Get all active examination areas
        const areas = await tx.examinationArea.findMany({
          where: { tenantId, isActive: true },
          orderBy: { displayOrder: "asc" },
        });

        // Get existing section instances to avoid duplicates
        const existingSections = await tx.auditSectionInstance.findMany({
          where: { engagementId: parsed.data.engagementId, tenantId },
          select: { sectionCode: true },
        });
        const existingCodes = new Set(existingSections.map((s: any) => s.sectionCode));

        // Create section instances for areas that don't have one yet
        const newSections = [];
        for (const area of areas) {
          if (!existingCodes.has(area.code)) {
            const section = await tx.auditSectionInstance.create({
              data: {
                tenantId,
                engagementId: parsed.data.engagementId,
                sectionCode: area.code,
                sectionName: area.name,
                status: "NOT_STARTED",
              },
            });
            newSections.push(section);
          }
        }

        return { total: areas.length, created: newSections.length, skipped: existingCodes.size };
      });

      revalidatePath("/audit-execution");
      return { success: true as const, data: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to initialize sections.";
      logger.error({ error, action: "initialize_sections", tenantId }, message);
      return { success: false as const, error: message };
    }
  }
  ```

  **2c. Create `src/actions/audit-execution/submit-examination-response.ts`:**

  ```typescript
  "use server";

  import { revalidatePath } from "next/cache";
  import { getRequiredSession } from "@/data-access/session";
  import { prismaForTenant } from "@/data-access/prisma";
  import { setAuditContext } from "@/data-access/audit-context";
  import { hasPermission, type Role } from "@/lib/permissions";
  import { logger } from "@/lib/logger";
  import { SubmitExaminationResponseSchema, type SubmitExaminationResponseInput } from "./schemas";

  /**
   * Submit or update an examination response for a specific item.
   * If status is NON_COMPLIANT, auto-creates a linked Observation (R17).
   * Security: Requires examination:respond permission.
   * Atomicity: Response + observation creation in single transaction.
   */
  export async function submitExaminationResponse(input: SubmitExaminationResponseInput) {
    const session = await getRequiredSession();
    const userRoles = ((session.user as any).roles ?? []) as Role[];
    const tenantId = (session.user as any).tenantId as string;

    if (!hasPermission(userRoles, "examination:respond")) {
      return { success: false as const, error: "You do not have permission to submit examination responses." };
    }

    const parsed = SubmitExaminationResponseSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0].message };
    }
    const validated = parsed.data;

    // NON_COMPLIANT requires observation text
    if (validated.status === "NON_COMPLIANT" && !validated.observation) {
      return { success: false as const, error: "Observation text is required for non-compliant items." };
    }

    const db = prismaForTenant(tenantId);

    try {
      const result = await db.$transaction(async (tx: any) => {
        await setAuditContext(tx, {
          actionType: "examination_response.submitted",
          userId: session.user.id,
          tenantId,
          sessionId: session.session.id,
        });

        // Verify engagement and item exist
        const engagement = await tx.auditEngagement.findFirst({
          where: { id: validated.engagementId, tenantId },
          select: { id: true, branchId: true },
        });
        if (!engagement) {
          throw new Error("Engagement not found");
        }

        const item = await tx.examinationItem.findFirst({
          where: { id: validated.itemId, tenantId },
          include: { area: { select: { id: true, name: true, code: true } } },
        });
        if (!item) {
          throw new Error("Examination item not found");
        }

        // Check if response already exists
        const existingResponse = await tx.auditExaminationResponse.findFirst({
          where: {
            engagementId: validated.engagementId,
            itemId: validated.itemId,
          },
        });

        let observationId: string | null = null;

        // Auto-create observation for NON_COMPLIANT items (R17)
        if (validated.status === "NON_COMPLIANT") {
          // If there's already a linked observation, update it instead of creating new
          if (existingResponse?.observationId) {
            await tx.observation.update({
              where: { id: existingResponse.observationId },
              data: {
                condition: validated.observation!,
                severity: validated.riskRating === "CRITICAL" ? "CRITICAL"
                  : validated.riskRating === "HIGH" ? "HIGH"
                  : validated.riskRating === "MEDIUM" ? "MEDIUM"
                  : "LOW",
              },
            });
            observationId = existingResponse.observationId;
          } else {
            // Create new observation
            const observation = await tx.observation.create({
              data: {
                tenantId,
                title: `[${item.itemNumber}] ${item.area.name} — Non-Compliant`,
                condition: validated.observation!,
                criteria: item.particulars,
                cause: "Identified during examination",
                effect: "Non-compliance with audit requirements",
                recommendation: "To be determined during review",
                severity: validated.riskRating === "CRITICAL" ? "CRITICAL"
                  : validated.riskRating === "HIGH" ? "HIGH"
                  : validated.riskRating === "MEDIUM" ? "MEDIUM"
                  : "LOW",
                status: "DRAFT",
                branchId: engagement.branchId,
                auditAreaId: item.area.id,
                engagementId: validated.engagementId,
                createdById: session.user.id,
                riskCategory: item.riskCategory,
              },
            });
            observationId = observation.id;

            // Create timeline entry
            await tx.observationTimeline.create({
              data: {
                tenantId,
                observationId: observation.id,
                event: "created",
                comment: `Auto-created from examination item ${item.itemNumber}`,
                createdById: session.user.id,
              },
            });
          }
        }

        // Upsert examination response
        const response = await tx.auditExaminationResponse.upsert({
          where: {
            engagementId_itemId: {
              engagementId: validated.engagementId,
              itemId: validated.itemId,
            },
          },
          update: {
            status: validated.status,
            observation: validated.observation ?? null,
            riskRating: validated.riskRating ?? null,
            respondedById: session.user.id,
            respondedAt: new Date(),
            observationId,
          },
          create: {
            tenantId,
            engagementId: validated.engagementId,
            itemId: validated.itemId,
            status: validated.status,
            observation: validated.observation ?? null,
            riskRating: validated.riskRating ?? null,
            respondedById: session.user.id,
            respondedAt: new Date(),
            observationId,
          },
        });

        return {
          responseId: response.id,
          observationId,
          autoCreatedObservation: validated.status === "NON_COMPLIANT" && !existingResponse?.observationId,
        };
      });

      revalidatePath("/audit-execution");
      revalidatePath("/findings");
      return { success: true as const, data: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit examination response.";
      logger.error({ error, action: "submit_examination_response", tenantId }, message);
      return { success: false as const, error: message };
    }
  }
  ```

  **2d. Create `src/actions/audit-execution/update-section-status.ts`:**

  ```typescript
  "use server";

  import { revalidatePath } from "next/cache";
  import { getRequiredSession } from "@/data-access/session";
  import { prismaForTenant } from "@/data-access/prisma";
  import { setAuditContext } from "@/data-access/audit-context";
  import { hasPermission, type Role } from "@/lib/permissions";
  import { logger } from "@/lib/logger";
  import { UpdateSectionStatusSchema, type UpdateSectionStatusInput } from "./schemas";

  // Valid status transitions
  const VALID_TRANSITIONS: Record<string, string[]> = {
    NOT_STARTED: ["IN_PROGRESS"],
    IN_PROGRESS: ["COMPLETED"],
    COMPLETED: ["REVIEWED", "IN_PROGRESS"], // Can reopen
    REVIEWED: [], // Terminal
  };

  /**
   * Update the status of an audit section instance.
   * Enforces valid status transitions.
   * Security: Requires audit_execution:manage_sections permission.
   */
  export async function updateSectionStatus(input: UpdateSectionStatusInput) {
    const session = await getRequiredSession();
    const userRoles = ((session.user as any).roles ?? []) as Role[];
    const tenantId = (session.user as any).tenantId as string;

    if (!hasPermission(userRoles, "audit_execution:manage_sections")) {
      return { success: false as const, error: "You do not have permission to update section status." };
    }

    const parsed = UpdateSectionStatusSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0].message };
    }
    const validated = parsed.data;

    const db = prismaForTenant(tenantId);

    try {
      const result = await db.$transaction(async (tx: any) => {
        await setAuditContext(tx, {
          actionType: "audit_section.status_updated",
          userId: session.user.id,
          tenantId,
          sessionId: session.session.id,
        });

        const section = await tx.auditSectionInstance.findFirst({
          where: {
            engagementId: validated.engagementId,
            sectionCode: validated.sectionCode,
            tenantId,
          },
        });

        if (!section) {
          throw new Error("Section not found");
        }

        // Validate transition
        const allowed = VALID_TRANSITIONS[section.status] ?? [];
        if (!allowed.includes(validated.status)) {
          throw new Error(
            `Cannot transition from ${section.status} to ${validated.status}. Allowed: ${allowed.join(", ") || "none"}`
          );
        }

        const updateData: any = { status: validated.status };
        if (validated.status === "COMPLETED") {
          updateData.completedAt = new Date();
        }
        if (validated.status === "REVIEWED") {
          updateData.reviewedAt = new Date();
        }

        return tx.auditSectionInstance.update({
          where: { id: section.id },
          data: updateData,
        });
      });

      revalidatePath("/audit-execution");
      return { success: true as const, data: { id: result.id, status: result.status } };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update section status.";
      logger.error({ error, action: "update_section_status", tenantId }, message);
      return { success: false as const, error: message };
    }
  }
  ```
  </action>
  <verify>
  ```bash
  cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit --pretty 2>&1 | grep -E "(audit-execution)" | head -20
  ```
  No TypeScript errors in audit-execution files. Check all files:
  ```bash
  ls -la src/actions/audit-execution/ src/data-access/audit-execution.ts
  ```
  Should show 5 files in actions/ + 1 DAL file.
  </verify>
  <done>
  - src/actions/audit-execution/assign-team.ts: assignTeamMember + removeTeamMember actions
  - src/actions/audit-execution/initialize-sections.ts: creates AuditSectionInstance per active ExaminationArea, idempotent
  - src/actions/audit-execution/submit-examination-response.ts: upserts response, auto-creates Observation for NON_COMPLIANT (R17)
  - src/actions/audit-execution/update-section-status.ts: enforces valid transitions (NOT_STARTED→IN_PROGRESS→COMPLETED→REVIEWED)
  - All actions follow AEGIS conventions: session→permission→zod→transaction→audit context→revalidate→return
  - NON_COMPLIANT auto-creates Observation with title "[itemNumber] Area — Non-Compliant", links via observationId
  - Auto-created observations include timeline entry explaining source
  </done>
</task>

## Success Criteria

1. `pnpm exec tsc --noEmit` has no errors in audit-execution files
2. Team assignment: upsert pattern allows updating role/sections for existing members
3. Section initialization: creates exactly one AuditSectionInstance per active ExaminationArea, idempotent
4. Examination response: NON_COMPLIANT auto-creates linked Observation with title, condition, severity
5. Examination response: updating an existing NON_COMPLIANT response updates the linked Observation
6. Section status: valid transitions enforced (NOT_STARTED→IN_PROGRESS→COMPLETED→REVIEWED, COMPLETED→IN_PROGRESS reopen)
7. All actions use tenant-scoped Prisma, audit context, Zod validation
8. DAL functions accept Session, use prismaForTenant, include tenantId in WHERE
