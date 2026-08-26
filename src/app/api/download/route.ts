import { NextRequest, NextResponse } from "next/server";
import { getOptionalSession } from "@/data-access/session";
import { generateDownloadUrl } from "@/lib/s3";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/download?key=<s3Key>
 *
 * Generate a presigned S3 download URL and redirect to it.
 * Used by report download links and evidence download buttons.
 *
 * Security:
 * - Requires authenticated session (returns 401 if missing)
 * - Authorizes key to the authenticated tenant (returns 403 if mismatched)
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
  const rawKey = request.nextUrl.searchParams.get("key");

  if (!rawKey || rawKey.trim().length === 0) {
    return NextResponse.json(
      { error: "Missing required query parameter: key" },
      { status: 400 },
    );
  }

  const key = rawKey.trim();

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

  // Restrict downloads to the authenticated tenant namespace
  const tenantId = session.user.tenantId?.trim();
  if (!tenantId) {
    logger.warn(
      { key: key.slice(0, 100), userId: session.user.id },
      "Download rejected: missing tenant context",
    );
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isTenantScopedKey =
    key.startsWith(`${tenantId}/`) ||
    key.startsWith(`audit-reports/${tenantId}/`);

  if (!isTenantScopedKey) {
    logger.warn(
      { key: key.slice(0, 100), userId: session.user.id, tenantId },
      "Download rejected: tenant mismatch",
    );
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
