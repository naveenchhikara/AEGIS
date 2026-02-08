"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/lib/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission, type Role } from "@/lib/permissions";

/**
 * Zod validation schema for editable settings.
 *
 * READ-ONLY fields NOT included (DE11):
 * - rbiLicenseNo — set during onboarding
 * - name (legal bank name) — set during onboarding
 * - state (of registration) — set during onboarding
 * - tier — set during onboarding
 * - Fiscal year — hardcoded April-March (DE7)
 */
const settingsSchema = z.object({
  shortName: z.string().min(1).max(50).optional(),
  city: z.string().min(1).max(100).optional(),
  nabardRegistrationNo: z.string().max(50).optional().nullable(),
});

export type SettingsInput = z.infer<typeof settingsSchema>;

/**
 * Update editable tenant settings.
 *
 * Security:
 * - Permission check: admin:manage_settings
 * - tenantId from session only (S2)
 * - Zod validation rejects read-only fields
 * - Audit context set for tracking
 */
export async function updateTenantSettings(formData: SettingsInput) {
  const session = await getRequiredSession();
  const userRoles = (session.user as any).roles as Role[];

  // Permission check
  if (!hasPermission(userRoles, "admin:manage_settings")) {
    return {
      success: false,
      error: "You do not have permission to update settings.",
    };
  }

  // Validate input
  const result = settingsSchema.safeParse(formData);
  if (!result.success) {
    return { success: false, error: result.error.issues[0].message };
  }

  const validated = result.data;
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  try {
    await db.$transaction(async (tx: any) => {
      // Set audit context for tracking
      await setAuditContext(tx, {
        actionType: "tenant.settings_updated",
        userId: session.user.id,
        tenantId: tenantId,
        ipAddress: (await headers()).get("x-forwarded-for") ?? "unknown",
        sessionId: session.session.id,
      });

      // Update with explicit WHERE tenantId
      await tx.tenant.update({
        where: { id: tenantId },
        data: validated,
      });
    });

    revalidatePath("/settings");
    return { success: true, error: null };
  } catch (error) {
    console.error("Failed to update tenant settings:", error);
    return {
      success: false,
      error: "Failed to update settings. Please try again.",
    };
  }
}
