import "server-only";
import { prismaForTenant } from "@/data-access/prisma";

/**
 * Risk MIS Dashboard data (R87).
 * Aggregates key financial risk metrics for UCB oversight.
 */
export async function getRiskMisDashboardData(tenantId: string) {
  const db = prismaForTenant(tenantId);

  // Asset quality metrics from SMA/NPA entries
  const [smaEntries, investmentRecords, housekeepingMetrics, riskRegisters] =
    await Promise.all([
      db.smaNpaEntry.groupBy({
        by: ["category"],
        where: { tenantId },
        _sum: { totalAmount: true },
        _count: true,
      }),
      db.investmentRecord.findMany({
        where: { tenantId },
        select: {
          securityType: true,
          faceValue: true,
          marketValue: true,
          reconciled: true,
        },
      }),
      db.housekeepingMetric.findMany({
        where: { tenantId },
        select: {
          metricType: true,
          closingBalance: true,
          agingDays: true,
        },
      }),
      db.riskRegister.findMany({
        where: { tenantId },
        select: {
          riskCategory: true,
          inherentScore: true,
          residualScore: true,
          status: true,
        },
      }),
    ]);

  // Asset quality breakdown
  const assetQuality = smaEntries.map((e) => ({
    category: e.category ?? "UNKNOWN",
    count: e._count,
    totalAmount: e._sum.totalAmount ? Number(e._sum.totalAmount) : 0,
  }));

  // Investment portfolio
  const totalFaceValue = investmentRecords.reduce(
    (sum, r) => sum + (r.faceValue ? Number(r.faceValue) : 0),
    0,
  );
  const totalMarketValue = investmentRecords.reduce(
    (sum, r) => sum + (r.marketValue ? Number(r.marketValue) : 0),
    0,
  );
  const unreconciledCount = investmentRecords.filter(
    (r) => !r.reconciled,
  ).length;

  // Housekeeping risk
  const highAgingCount = housekeepingMetrics.filter(
    (m) => (m.agingDays ?? 0) >= 90,
  ).length;
  const totalHousekeepingBalance = housekeepingMetrics.reduce(
    (sum, m) => sum + (m.closingBalance ? Number(m.closingBalance) : 0),
    0,
  );

  // Operational risk from risk register
  const risksByCategory = new Map<
    string,
    { count: number; avgResidual: number }
  >();
  for (const risk of riskRegisters) {
    const cat = risk.riskCategory ?? "OPERATIONAL";
    if (!risksByCategory.has(cat)) {
      risksByCategory.set(cat, { count: 0, avgResidual: 0 });
    }
    const entry = risksByCategory.get(cat)!;
    entry.count++;
    entry.avgResidual += risk.residualScore ? Number(risk.residualScore) : 0;
  }

  const operationalRisk = Array.from(risksByCategory.entries()).map(
    ([category, data]) => ({
      category,
      count: data.count,
      avgResidualScore: data.count > 0 ? data.avgResidual / data.count : 0,
    }),
  );

  return {
    assetQuality,
    investment: {
      totalFaceValue,
      totalMarketValue,
      depreciation:
        totalFaceValue > 0
          ? ((totalFaceValue - totalMarketValue) / totalFaceValue) * 100
          : 0,
      unreconciledCount,
      totalRecords: investmentRecords.length,
    },
    housekeeping: {
      totalBalance: totalHousekeepingBalance,
      highAgingCount,
      totalMetrics: housekeepingMetrics.length,
    },
    operationalRisk,
    totalRisks: riskRegisters.length,
    openRisks: riskRegisters.filter(
      (r) => r.status !== "CLOSED" && r.status !== "MITIGATED",
    ).length,
  };
}
