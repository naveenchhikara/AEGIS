"use server";

import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { hasPermission, type Role } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const UpdateControlSchema = z.object({
  controlId: z.string().uuid(),
  controlCode: z.string().min(1, "Control code is required").max(255),
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
  owner: z.string().max(255).optional(),
  isKeyControl: z.boolean(),
  description: z.string().min(1, "Description is required").max(5000),
  frameworkMapping: z.record(z.string(), z.string()).nullable().optional(),
});

type UpdateControlInput = z.infer<typeof UpdateControlSchema>;

export async function updateControl(input: UpdateControlInput) {
  try {
    const session = await getRequiredSession();
    const userRoles = ((session.user as any).roles ?? []) as Role[];
    const tenantId = (session.user as any).tenantId as string;

    if (!hasPermission(userRoles, "control_library:manage")) {
      return { error: "You do not have permission to update controls" };
    }

    const validated = UpdateControlSchema.parse(input);
    const db = prismaForTenant(tenantId);

    // Check if control exists and belongs to tenant
    const existing = await db.controlLibrary.findFirst({
      where: { id: validated.controlId, tenantId },
    });

    if (!existing) {
      return { error: "Control not found" };
    }

    // Check for duplicate control code (excluding current control)
    const duplicate = await db.controlLibrary.findFirst({
      where: {
        tenantId,
        controlCode: validated.controlCode,
        id: { not: validated.controlId },
      },
    });

    if (duplicate) {
      return { error: "Control code already exists" };
    }

    await db.controlLibrary.update({
      where: { id: validated.controlId },
      data: {
        controlCode: validated.controlCode,
        processArea: validated.processArea,
        controlType: validated.controlType,
        frequency: validated.frequency,
        owner: validated.owner || null,
        isKeyControl: validated.isKeyControl,
        description: validated.description,
        frameworkMapping: (validated.frameworkMapping ?? null) as any,
      },
    });

    revalidatePath("/controls");
    revalidatePath(`/controls/${validated.controlId}`);

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: error.issues[0]?.message ?? "Validation failed" };
    }
    console.error("Update control error:", error);
    return { error: "Failed to update control" };
  }
}
