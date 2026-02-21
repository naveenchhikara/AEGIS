"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { setAuditContext } from "@/data-access/audit-context";
import { hasPermission } from "@/lib/permissions";
import { validateFileType, generateUploadUrl, verifyUpload } from "@/lib/s3";
import { logger } from "@/lib/logger";
import crypto from "node:crypto";

const BUCKET = process.env.S3_BUCKET_NAME ?? "aegis-evidence-dev";

// ─── Request presigned upload URL ──────────────────────────────────────────

const RequestUploadSchema = z.object({
  checklistId: z.string().uuid(),
  controlId: z.string(),
  fileHeader: z.string(),
  fileName: z.string(),
  fileSize: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024),
  contentType: z.string(),
});

/**
 * Request a presigned S3 URL for IS audit evidence upload (R103).
 * Security: Requires is_audit:execute permission.
 */
export async function requestIsAuditEvidenceUpload(
  input: z.infer<typeof RequestUploadSchema>,
) {
  const session = await getRequiredSession();
  const userRoles = session.user.roles;
  const tenantId = session.user.tenantId;

  if (!hasPermission(userRoles, "is_audit:manage")) {
    return {
      success: false as const,
      error: "You do not have permission to upload IS audit evidence.",
    };
  }

  const parsed = RequestUploadSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message };
  }

  const db = prismaForTenant(tenantId);

  try {
    // Validate file type via magic bytes
    const fileTypeResult = await validateFileType(parsed.data.fileHeader);
    if (!fileTypeResult.valid) {
      return { success: false as const, error: fileTypeResult.error };
    }

    // Verify checklist belongs to tenant
    const checklist = await db.isAuditChecklist.findFirst({
      where: { id: parsed.data.checklistId, tenantId },
      select: { id: true },
    });

    if (!checklist) {
      return { success: false as const, error: "Checklist not found." };
    }

    // Generate S3 key
    const uuid = crypto.randomUUID();
    const s3Key = `${tenantId}/is-audit/${parsed.data.checklistId}/${parsed.data.controlId}/${uuid}.${fileTypeResult.extension}`;

    // Generate presigned upload URL
    const uploadUrl = await generateUploadUrl(
      s3Key,
      fileTypeResult.mimeType,
      parsed.data.fileSize,
    );

    return {
      success: true as const,
      data: { uploadUrl, s3Key, contentType: fileTypeResult.mimeType },
    };
  } catch (error) {
    logger.error(
      { error, checklistId: parsed.data.checklistId, tenantId },
      "Failed to request IS audit evidence upload",
    );
    return {
      success: false as const,
      error: "Failed to generate upload URL. Please try again.",
    };
  }
}

// ─── Confirm upload ────────────────────────────────────────────────────────

const ConfirmUploadSchema = z.object({
  checklistId: z.string().uuid(),
  controlId: z.string(),
  s3Key: z.string(),
  filename: z.string(),
  fileSize: z.number().int().positive(),
  contentType: z.string(),
});

/**
 * Confirm IS audit evidence upload — stores S3 key in checklist items JSON (R103).
 * Security: Requires is_audit:execute permission.
 */
export async function confirmIsAuditEvidenceUpload(
  input: z.infer<typeof ConfirmUploadSchema>,
) {
  const session = await getRequiredSession();
  const userRoles = session.user.roles;
  const tenantId = session.user.tenantId;

  if (!hasPermission(userRoles, "is_audit:manage")) {
    return {
      success: false as const,
      error: "You do not have permission to upload IS audit evidence.",
    };
  }

  const parsed = ConfirmUploadSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message };
  }

  const db = prismaForTenant(tenantId);

  try {
    // Verify upload exists in S3
    const uploadResult = await verifyUpload(parsed.data.s3Key);
    if (!uploadResult.exists) {
      return {
        success: false as const,
        error: "Upload verification failed. File not found in S3.",
      };
    }

    // Get current checklist and update items with file reference
    const checklist = await db.isAuditChecklist.findFirst({
      where: { id: parsed.data.checklistId, tenantId },
    });

    if (!checklist) {
      return { success: false as const, error: "Checklist not found." };
    }

    // Update checklist items to include file reference
    const items = Array.isArray(checklist.items)
      ? [...(checklist.items as any[])]
      : [];
    const fileRef = {
      s3Key: parsed.data.s3Key,
      filename: parsed.data.filename,
      fileSize: parsed.data.fileSize,
      contentType: parsed.data.contentType,
      uploadedAt: new Date().toISOString(),
      uploadedBy: session.user.id,
    };

    // Find and update the matching control item, or add to a files array
    const controlKey = parsed.data.controlId;
    const existingItem = items.find((item: any) => item.id === controlKey);

    if (existingItem) {
      if (!existingItem.files) existingItem.files = [];
      existingItem.files.push(fileRef);
    } else {
      items.push({ id: controlKey, files: [fileRef] });
    }

    await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "is_audit.evidence_uploaded",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      await tx.isAuditChecklist.update({
        where: { id: parsed.data.checklistId },
        data: { items },
      });
    });

    revalidatePath("/is-audit");

    return { success: true as const };
  } catch (error) {
    logger.error(
      { error, checklistId: parsed.data.checklistId, tenantId },
      "Failed to confirm IS audit evidence upload",
    );
    return {
      success: false as const,
      error: "Failed to save evidence record. Please try again.",
    };
  }
}
