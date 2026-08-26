import { NextRequest, NextResponse } from "next/server";
import { prismaForTenant } from "@/data-access/prisma";
import { getUserBranches } from "@/data-access/auditee";
import { getOptionalSession } from "@/data-access/session";
import { generateDownloadUrl } from "@/lib/s3";
import { logger } from "@/lib/logger";
import {
  canAccessBoardReport,
  canAccessCommitteeMinutes,
  canAccessEvidenceByRole,
  classifyDownloadObjectType,
  requiresBranchScopeForEvidence,
} from "@/lib/download-authorization";

export const dynamic = "force-dynamic";

/**
 * GET /api/download?key=<s3Key>
 *
 * Generate a presigned S3 download URL and redirect to it.
 * Used by report download links and evidence download buttons.
 *
 * Security:
 * - Requires authenticated session (returns 401 if missing)
 * - Validates key format to prevent path traversal
 * - Presigned URL expires in 5 minutes (configured in src/lib/s3.ts)
 */
export async function GET(request: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────
  const session = await getOptionalSession();
  if (!session) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  // ── Validate key parameter ──────────────────────────────────────────────
  const key = request.nextUrl.searchParams.get("key");

  if (!key || key.trim().length === 0) {
    return NextResponse.json(
      { error: "Missing required query parameter: key" },
      { status: 400 },
    );
  }

  // Reject keys with path traversal attempts or suspicious patterns
  if (
    key.includes("..") ||
    key.startsWith("/") ||
    key.includes("\0") ||
    key.length > 1024
  ) {
    logger.warn(
      { key: key.slice(0, 100), userId: session.user.id },
      "Download rejected: invalid S3 key format",
    );
    return NextResponse.json({ error: "Invalid key format" }, { status: 400 });
  }

  const tenantId = session.user.tenantId;
  const objectType = classifyDownloadObjectType(tenantId, key);
  const db = prismaForTenant(tenantId);

  // ── Object-level authorization ──────────────────────────────────────────
  if (objectType === "UNKNOWN") {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  if (objectType === "BOARD_REPORT") {
    if (!canAccessBoardReport(session.user.roles)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const report = await db.boardReport.findFirst({
      where: { tenantId, s3Key: key },
      select: { id: true },
    });
    if (!report) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  }

  if (objectType === "COMMITTEE_MINUTES") {
    if (!canAccessCommitteeMinutes(session.user.roles)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const meeting = await db.committeeMeeting.findFirst({
      where: { tenantId, minutesRef: key },
      select: { id: true },
    });
    if (!meeting) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  }

  if (objectType === "EVIDENCE") {
    const isBmEvidenceKey = key.startsWith(`${tenantId}/bm-evidence/`);

    if (!canAccessEvidenceByRole(session.user.roles)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const evidence = await db.evidence.findFirst({
      where: {
        tenantId,
        s3Key: key,
        deletedAt: null,
      },
      select: {
        id: true,
        observation: { select: { branchId: true } },
        examinationResponse: {
          select: { engagement: { select: { branchId: true } } },
        },
        newExaminationResponse: {
          select: { engagement: { select: { branchId: true } } },
        },
        actionPoint: { select: { branchId: true } },
        accountExamResponse: {
          select: { engagement: { select: { branchId: true } } },
        },
      },
    });
    if (!evidence) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (isBmEvidenceKey && !evidence.actionPoint) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    if (requiresBranchScopeForEvidence(session.user.roles)) {
      const evidenceBranchId =
        isBmEvidenceKey
          // BM evidence must be linked to an ActionPoint branch.
          // Missing branch mapping is treated as unauthorized.
          ? evidence.actionPoint?.branchId ?? null
          : evidence.observation?.branchId ??
            evidence.examinationResponse?.engagement.branchId ??
            evidence.newExaminationResponse?.engagement.branchId ??
            evidence.accountExamResponse?.engagement.branchId ??
            evidence.actionPoint?.branchId ??
            null;

      if (!evidenceBranchId) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }

      const branchIds = await getUserBranches(session);
      if (!branchIds.includes(evidenceBranchId)) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }
  }

  // ── Generate presigned URL and redirect ─────────────────────────────────
  try {
    const downloadUrl = await generateDownloadUrl(key);

    logger.info(
      { key, userId: session.user.id },
      "Presigned download URL generated",
    );

    return NextResponse.redirect(downloadUrl);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate download URL";
    logger.error(
      { error, key, userId: session.user.id, action: "download" },
      "S3 presigned URL generation failed",
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
