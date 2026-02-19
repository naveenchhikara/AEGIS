import "server-only";
import { prismaForTenant } from "./prisma";
import type { AuthSession as Session } from "@/lib/auth";

export async function getRiskMisData(session: Session) {
  const tenantId = session.user.tenantId;
  const db = prismaForTenant(tenantId);

  // CRAR Indicators (from housekeeping metrics or manual input)
  const crarMetrics = await db.housekeepingMetric.findMany({
    where: {
      tenantId,
      metricType: {
        in: ["CRAR_TIER1", "CRAR_TIER2", "CRAR_TOTAL", "RISK_WEIGHTED_ASSETS"],
      },
    },
    orderBy: { period: "desc" },
    take: 8, // Last 8 quarters
  });

  // Asset Quality
  const assetQuality = await db.housekeepingMetric.findMany({
    where: {
      tenantId,
      metricType: {
        in: ["GROSS_NPA", "NET_NPA", "PROVISION_COVERAGE", "SLIPPAGE_RATIO"],
      },
    },
    orderBy: { period: "desc" },
    take: 8,
  });

  // Liquidity
  const liquidity = await db.housekeepingMetric.findMany({
    where: {
      tenantId,
      metricType: {
        in: ["SLR_MAINTAINED", "CRR_MAINTAINED", "LCR", "CD_RATIO"],
      },
    },
    orderBy: { period: "desc" },
    take: 8,
  });

  // Operational Risk
  const operational = await db.housekeepingMetric.findMany({
    where: {
      tenantId,
      metricType: { in: ["INTER_BRANCH", "SUSPENSE", "CLEARING", "SUNDRY"] },
    },
    include: { branch: { select: { name: true } } },
    orderBy: { period: "desc" },
  });

  return { crarMetrics, assetQuality, liquidity, operational };
}
