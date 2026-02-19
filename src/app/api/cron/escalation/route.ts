import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * Daily cron endpoint for compliance escalation.
 * Protected by CRON_SECRET environment variable.
 *
 * Usage:
 *   curl -X POST https://app.example.com/api/cron/escalation \
 *     -H "Authorization: Bearer $CRON_SECRET"
 *
 * Can be triggered by:
 * - Vercel Cron (configured in vercel.json)
 * - External cron service (e.g., cron-job.org)
 * - Manual curl from admin
 *
 * To run for specific tenant:
 *   curl -X POST https://app.example.com/api/cron/escalation \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{"tenantId":"abc123"}'
 */
export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    logger.warn({ authHeader }, "Unauthorized cron request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Import dynamically to avoid issues with server-only modules
    const { runEscalationJobInternal } =
      await import("@/actions/compliance/run-escalation-job");

    // Check if specific tenant requested
    const body = await request.json().catch(() => ({}));
    const tenantId = body.tenantId;

    if (tenantId) {
      // Single tenant run
      logger.info({ tenantId }, "Running escalation job for single tenant");
      const result = await runEscalationJobInternal(tenantId);
      return NextResponse.json(result);
    }

    // All tenants: fetch tenant list and run for each
    const { prisma } = await import("@/lib/prisma");
    const tenants = await prisma.tenant.findMany({
      select: { id: true, shortName: true },
    });

    logger.info(
      { count: tenants.length },
      "Running escalation job for all tenants",
    );

    const results = [];
    for (const tenant of tenants) {
      try {
        const result = await runEscalationJobInternal(tenant.id);
        results.push({
          tenantId: tenant.id,
          name: tenant.shortName,
          ...result.data,
          success: result.success,
        });
      } catch (error) {
        logger.error(
          { error, tenantId: tenant.id, name: tenant.shortName },
          "Escalation job failed for tenant",
        );
        results.push({
          tenantId: tenant.id,
          name: tenant.shortName,
          success: false,
          error: error instanceof Error ? error.message : "Failed",
        });
      }
    }

    const totalSuccess = results.filter((r) => r.success).length;
    const totalFailed = results.filter((r) => !r.success).length;

    logger.info(
      { totalTenants: tenants.length, totalSuccess, totalFailed },
      "Escalation cron job completed for all tenants",
    );

    return NextResponse.json({
      success: true,
      summary: {
        totalTenants: tenants.length,
        totalSuccess,
        totalFailed,
      },
      results,
    });
  } catch (error) {
    logger.error({ error }, "Escalation cron job failed");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
