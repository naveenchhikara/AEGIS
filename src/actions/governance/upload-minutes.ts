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

// ─── Schemas ────────────────────────────────────────────────────────────────

const RequestMinutesUploadSchema = z.object({
  meetingId: z.string().uuid(),
  fileHeader: z.string().min(1, "File header is required"),
  fileName: z.string().min(1),
  fileSize: z
    .number()
    .positive()
    .max(10 * 1024 * 1024, "File must be under 10MB"),
  contentType: z.string().min(1),
});

const ConfirmMinutesUploadSchema = z.object({
  meetingId: z.string().uuid(),
  s3Key: z.string().min(1),
  fileName: z.string().min(1),
});

type RequestMinutesUploadInput = z.infer<typeof RequestMinutesUploadSchema>;
type ConfirmMinutesUploadInput = z.infer<typeof ConfirmMinutesUploadSchema>;

// ─── Generate S3 key for minutes ────────────────────────────────────────────

function generateMinutesS3Key(
  tenantId: string,
  meetingId: string,
  extension: string,
): string {
  const uuid = crypto.randomUUID();
  return `${tenantId}/minutes/${meetingId}/${uuid}.${extension}`;
}

// ─── requestMinutesUpload ───────────────────────────────────────────────────

/**
 * Request a presigned S3 upload URL for committee meeting minutes.
 *
 * - Verifies committee:manage permission
 * - Validates file type via magic bytes
 * - Verifies meeting exists and belongs to tenant
 * - Generates presigned PUT URL for S3
 */
export async function requestMinutesUpload(input: RequestMinutesUploadInput) {
  const session = await getRequiredSession();
  const userRoles = session.user.roles;
  const tenantId = session.user.tenantId;

  if (!hasPermission(userRoles, "committee:manage")) {
    return {
      success: false as const,
      error: "You do not have permission to upload meeting minutes.",
    };
  }

  const parsed = RequestMinutesUploadSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message };
  }

  const validated = parsed.data;
  const db = prismaForTenant(tenantId);

  try {
    // Validate file type via magic bytes
    const fileTypeResult = await validateFileType(validated.fileHeader);
    if (!fileTypeResult.valid) {
      return { success: false as const, error: fileTypeResult.error };
    }

    const { mimeType, extension } = fileTypeResult;

    // Verify meeting exists and belongs to tenant
    const meeting = await db.committeeMeeting.findFirst({
      where: { id: validated.meetingId, tenantId },
      select: { id: true },
    });

    if (!meeting) {
      return { success: false as const, error: "Meeting not found." };
    }

    // Generate S3 key and presigned URL
    const s3Key = generateMinutesS3Key(
      tenantId,
      validated.meetingId,
      extension,
    );
    const uploadUrl = await generateUploadUrl(
      s3Key,
      mimeType,
      validated.fileSize,
    );

    return {
      success: true as const,
      data: { uploadUrl, s3Key, contentType: mimeType },
    };
  } catch (error) {
    logger.error(
      { error, meetingId: validated.meetingId, tenantId },
      "Failed to request minutes upload",
    );
    return {
      success: false as const,
      error: "Failed to generate upload URL. Please try again.",
    };
  }
}

// ─── confirmMinutesUpload ───────────────────────────────────────────────────

/**
 * Confirm a minutes upload after S3 PUT completes.
 *
 * - Verifies committee:manage permission
 * - Verifies file exists in S3
 * - Updates meeting minutesRef with S3 key
 * - Records audit log
 */
export async function confirmMinutesUpload(input: ConfirmMinutesUploadInput) {
  const session = await getRequiredSession();
  const userRoles = session.user.roles;
  const tenantId = session.user.tenantId;

  if (!hasPermission(userRoles, "committee:manage")) {
    return {
      success: false as const,
      error: "You do not have permission to upload meeting minutes.",
    };
  }

  const parsed = ConfirmMinutesUploadSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message };
  }

  const validated = parsed.data;
  const db = prismaForTenant(tenantId);

  // Validate S3 key belongs to this tenant
  if (!validated.s3Key.startsWith(`${tenantId}/minutes/`)) {
    return { success: false as const, error: "Invalid file reference." };
  }

  try {
    // Verify upload exists in S3
    const uploadResult = await verifyUpload(validated.s3Key);
    if (!uploadResult.exists) {
      return {
        success: false as const,
        error: "Upload verification failed. File not found in S3.",
      };
    }

    // Verify meeting exists and belongs to tenant
    const meeting = await db.committeeMeeting.findFirst({
      where: { id: validated.meetingId, tenantId },
      select: { id: true, committeeId: true },
    });

    if (!meeting) {
      return { success: false as const, error: "Meeting not found." };
    }

    // Update meeting with minutesRef in transaction
    await db.$transaction(async (tx: any) => {
      await setAuditContext(tx, {
        actionType: "governance.minutes_uploaded",
        userId: session.user.id,
        tenantId,
        sessionId: session.session.id,
      });

      await tx.committeeMeeting.update({
        where: { id: validated.meetingId, tenantId },
        data: {
          minutesRef: validated.s3Key,
        },
      });
    });

    revalidatePath("/governance");

    return {
      success: true as const,
      data: { s3Key: validated.s3Key },
    };
  } catch (error) {
    logger.error(
      { error, meetingId: validated.meetingId, tenantId },
      "Failed to confirm minutes upload",
    );
    return {
      success: false as const,
      error: "Failed to save minutes. Please try again.",
    };
  }
}
