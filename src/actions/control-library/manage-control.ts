"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";

const ManageControlSchema = z.object({
  id: z.string().uuid().optional(),
  controlCode: z.string().min(1, "Control code is required"),
  processArea: z.enum([
    "LENDING",
    "DEPOSITS",
    "TREASURY",
    "KYC_AML",
    "IT_OPERATIONS",
  ]),
  controlType: z.enum(["PREVENTIVE", "DETECTIVE", "CORRECTIVE"]),
  frequency: z.enum([
    "TRANSACTION",
    "DAILY",
    "WEEKLY",
    "MONTHLY",
    "QUARTERLY",
    "ANNUAL",
  ]),
  owner: z.string().optional(),
  isKeyControl: z.boolean().optional(),
  description: z.string().min(10, "Description must be at least 10 characters"),
  frameworkMapping: z.record(z.string(), z.string()).optional(),
  riskRegisterId: z.string().uuid().optional(),
});

type ManageControlInput = z.infer<typeof ManageControlSchema>;

/**
 * Create or update a control in the control library.
 * Security: Requires control_library:manage permission.
 */
export async function manageControl(input: ManageControlInput) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "control_library:manage")) {
    return {
      success: false as const,
      error: "You do not have permission to manage control library.",
    };
  }

  const parsed = ManageControlSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0].message,
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    const control = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: parsed.data.id
          ? "control_library.control_updated"
          : "control_library.control_created",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      if (parsed.data.id) {
        // Update existing control
        return tx.controlLibrary.update({
          where: { id: parsed.data.id, tenantId },
          data: {
            controlCode: parsed.data.controlCode,
            processArea: parsed.data.processArea,
            controlType: parsed.data.controlType,
            frequency: parsed.data.frequency,
            owner: parsed.data.owner,
            isKeyControl: parsed.data.isKeyControl ?? false,
            description: parsed.data.description,
            frameworkMapping: parsed.data.frameworkMapping,
            riskRegisterId: parsed.data.riskRegisterId,
          },
        });
      } else {
        // Create new control
        return tx.controlLibrary.create({
          data: {
            tenantId,
            controlCode: parsed.data.controlCode,
            processArea: parsed.data.processArea,
            controlType: parsed.data.controlType,
            frequency: parsed.data.frequency,
            owner: parsed.data.owner,
            isKeyControl: parsed.data.isKeyControl ?? false,
            description: parsed.data.description,
            frameworkMapping: parsed.data.frameworkMapping,
            riskRegisterId: parsed.data.riskRegisterId,
          },
        });
      }
    });

    revalidatePath("/control-library");
    revalidatePath(`/control-library/${control.id}`);

    return {
      success: true as const,
      data: control,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to manage control.";
    logger.error({ error, action: "manage_control", tenantId }, message);
    return { success: false as const, error: message };
  }
}

const ManageTestProcedureSchema = z.object({
  id: z.string().uuid().optional(),
  controlId: z.string().uuid(),
  name: z.string().min(1, "Test procedure name is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  sampleMethodology: z
    .enum(["RANDOM", "JUDGMENTAL", "SYSTEMATIC", "MONETARY_UNIT"])
    .optional(),
  sampleSize: z.number().int().positive().optional(),
  expectedEvidence: z.string().optional(),
  passCriteria: z.string().optional(),
});

type ManageTestProcedureInput = z.infer<typeof ManageTestProcedureSchema>;

/**
 * Create or update a test procedure for a control.
 * Security: Requires control_library:manage permission.
 */
export async function manageTestProcedure(input: ManageTestProcedureInput) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "control_library:manage")) {
    return {
      success: false as const,
      error: "You do not have permission to manage test procedures.",
    };
  }

  const parsed = ManageTestProcedureSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0].message,
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    const testProcedure = await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: parsed.data.id
          ? "test_procedure.updated"
          : "test_procedure.created",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      if (parsed.data.id) {
        // Update existing test procedure
        return tx.testProcedure.update({
          where: { id: parsed.data.id, tenantId },
          data: {
            controlId: parsed.data.controlId,
            name: parsed.data.name,
            description: parsed.data.description,
            sampleMethodology: parsed.data.sampleMethodology,
            sampleSize: parsed.data.sampleSize,
            expectedEvidence: parsed.data.expectedEvidence,
            passCriteria: parsed.data.passCriteria,
          },
        });
      } else {
        // Create new test procedure
        return tx.testProcedure.create({
          data: {
            tenantId,
            controlId: parsed.data.controlId,
            name: parsed.data.name,
            description: parsed.data.description,
            sampleMethodology: parsed.data.sampleMethodology,
            sampleSize: parsed.data.sampleSize,
            expectedEvidence: parsed.data.expectedEvidence,
            passCriteria: parsed.data.passCriteria,
          },
        });
      }
    });

    revalidatePath("/control-library");
    revalidatePath(`/control-library/${testProcedure.controlId}`);

    return {
      success: true as const,
      data: testProcedure,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to manage test procedure.";
    logger.error({ error, action: "manage_test_procedure", tenantId }, message);
    return { success: false as const, error: message };
  }
}
