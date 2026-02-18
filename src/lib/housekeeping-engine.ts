/**
 * Housekeeping Risk Metrics Computation Engine (R80)
 * 
 * Pure functions for computing housekeeping risk scores based on:
 * - Inter-branch account balances
 * - Suspense account aging
 * - Clearing entry delays
 * - Sundry creditor/debtor aging
 * 
 * Risk scoring methodology:
 * - Aging < 30 days: LOW risk
 * - Aging 30-90 days: MEDIUM risk
 * - Aging 90-180 days: HIGH risk
 * - Aging > 180 days: CRITICAL risk
 * 
 * Balance thresholds (UCB-specific):
 * - < ₹1 lakh: LOW
 * - ₹1-5 lakhs: MEDIUM
 * - ₹5-10 lakhs: HIGH
 * - > ₹10 lakhs: CRITICAL
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaTransactionClient = any;

export interface HousekeepingRiskScore {
  metricType: string;
  agingRisk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  balanceRisk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  compositeRisk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  score: number; // 0-100
  recommendations: string[];
}

/**
 * Compute risk score for a single housekeeping metric.
 */
export function computeHousekeepingRisk(
  metricType: string,
  closingBalance: number,
  agingDays: number | null,
  entriesCount: number
): HousekeepingRiskScore {
  const agingRisk = getAgingRiskLevel(agingDays);
  const balanceRisk = getBalanceRiskLevel(closingBalance);
  
  // Composite risk: take the higher of the two
  const compositeRisk = getHigherRisk(agingRisk, balanceRisk);
  
  // Numeric score (0-100)
  const score = calculateRiskScore(agingRisk, balanceRisk, entriesCount);
  
  // Generate recommendations
  const recommendations = generateRecommendations(
    metricType,
    agingRisk,
    balanceRisk,
    closingBalance,
    agingDays,
    entriesCount
  );

  return {
    metricType,
    agingRisk,
    balanceRisk,
    compositeRisk,
    score,
    recommendations,
  };
}

/**
 * Get aging-based risk level.
 */
function getAgingRiskLevel(agingDays: number | null): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  if (agingDays === null || agingDays === 0) return "LOW";
  if (agingDays < 30) return "LOW";
  if (agingDays < 90) return "MEDIUM";
  if (agingDays < 180) return "HIGH";
  return "CRITICAL";
}

/**
 * Get balance-based risk level (in rupees).
 */
function getBalanceRiskLevel(balance: number): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  const balanceInLakhs = balance / 100000;
  
  if (balanceInLakhs < 1) return "LOW";
  if (balanceInLakhs < 5) return "MEDIUM";
  if (balanceInLakhs < 10) return "HIGH";
  return "CRITICAL";
}

/**
 * Get higher risk level between two.
 */
function getHigherRisk(
  risk1: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  risk2: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  const riskOrder = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
  return riskOrder[risk1] > riskOrder[risk2] ? risk1 : risk2;
}

/**
 * Calculate numeric risk score (0-100).
 * Higher score = higher risk.
 */
function calculateRiskScore(
  agingRisk: string,
  balanceRisk: string,
  entriesCount: number
): number {
  const riskToScore: Record<string, number> = {
    LOW: 10,
    MEDIUM: 30,
    HIGH: 60,
    CRITICAL: 90,
  };

  const agingScore = riskToScore[agingRisk] || 0;
  const balanceScore = riskToScore[balanceRisk] || 0;
  
  // Weight: 60% aging, 40% balance
  let score = agingScore * 0.6 + balanceScore * 0.4;
  
  // Penalty for high entry count (indicates poor housekeeping)
  if (entriesCount > 100) {
    score += 5;
  } else if (entriesCount > 50) {
    score += 3;
  }
  
  return Math.min(100, Math.round(score));
}

/**
 * Generate context-specific recommendations.
 */
function generateRecommendations(
  metricType: string,
  agingRisk: string,
  balanceRisk: string,
  closingBalance: number,
  agingDays: number | null,
  entriesCount: number
): string[] {
  const recommendations: string[] = [];

  // Aging-based recommendations
  if (agingRisk === "CRITICAL") {
    recommendations.push(
      `URGENT: Entries aged >180 days require immediate resolution. Escalate to branch manager.`
    );
  } else if (agingRisk === "HIGH") {
    recommendations.push(
      `High priority: Entries aged >90 days. Set 30-day action plan for closure.`
    );
  } else if (agingRisk === "MEDIUM") {
    recommendations.push(
      `Moderate aging detected. Review entries and close before 90-day mark.`
    );
  }

  // Balance-based recommendations
  if (balanceRisk === "CRITICAL") {
    recommendations.push(
      `Significant balance (₹${(closingBalance / 100000).toFixed(2)} lakhs). Requires ZAC/CAE review.`
    );
  } else if (balanceRisk === "HIGH") {
    recommendations.push(
      `Material balance. Ensure proper documentation and approval for outstanding entries.`
    );
  }

  // Entry count recommendations
  if (entriesCount > 100) {
    recommendations.push(
      `High entry count (${entriesCount}). Consider bulk closure drive or system cleanup.`
    );
  } else if (entriesCount > 50) {
    recommendations.push(
      `Entry count trending high. Monitor for accumulation.`
    );
  }

  // Metric-specific recommendations
  switch (metricType) {
    case "INTER_BRANCH":
      recommendations.push(
        "Reconcile with counterpart branches. Investigate unmatched entries."
      );
      break;
    case "SUSPENSE":
      recommendations.push(
        "Suspense accounts should be temporary. Classify and transfer to proper GL codes."
      );
      break;
    case "CLEARING":
      recommendations.push(
        "Outstanding clearing entries may indicate delayed check realization or return items."
      );
      break;
    case "SUNDRY":
      recommendations.push(
        "Sundry accounts require regular review. Ensure all items are properly documented."
      );
      break;
  }

  return recommendations;
}

/**
 * Aggregate housekeeping risk across all branches for a period.
 */
export async function aggregateHousekeepingRisk(
  tx: PrismaTransactionClient,
  tenantId: string,
  period: string
): Promise<{
  totalMetrics: number;
  riskBreakdown: Record<string, number>;
  highRiskBranches: Array<{ branchId: string; branchName: string; riskCount: number }>;
  averageScore: number;
}> {
  const metrics = await tx.housekeepingMetric.findMany({
    where: { tenantId, period },
    include: {
      branch: { select: { id: true, name: true } },
    },
  });

  const riskBreakdown = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  const branchRiskMap = new Map<string, { name: string; count: number }>();
  let totalScore = 0;

  for (const metric of metrics) {
    const risk = computeHousekeepingRisk(
      metric.metricType,
      Number(metric.closingBalance),
      metric.agingDays,
      metric.entriesCount
    );

    riskBreakdown[risk.compositeRisk] += 1;
    totalScore += risk.score;

    if (risk.compositeRisk === "HIGH" || risk.compositeRisk === "CRITICAL") {
      const existing = branchRiskMap.get(metric.branchId) || {
        name: metric.branch.name,
        count: 0,
      };
      existing.count += 1;
      branchRiskMap.set(metric.branchId, existing);
    }
  }

  const highRiskBranches = Array.from(branchRiskMap.entries())
    .map(([branchId, data]) => ({
      branchId,
      branchName: data.name,
      riskCount: data.count,
    }))
    .sort((a, b) => b.riskCount - a.riskCount);

  return {
    totalMetrics: metrics.length,
    riskBreakdown,
    highRiskBranches,
    averageScore: metrics.length > 0 ? Math.round(totalScore / metrics.length) : 0,
  };
}

/**
 * Generate housekeeping dashboard summary.
 */
export async function getHousekeepingDashboard(
  tx: PrismaTransactionClient,
  tenantId: string,
  period: string
) {
  const metrics = await tx.housekeepingMetric.findMany({
    where: { tenantId, period },
    include: {
      branch: { select: { code: true, name: true } },
    },
    orderBy: [{ agingDays: "desc" }, { closingBalance: "desc" }],
  });

  const scoredMetrics = metrics.map((m: {
    metricType: string;
    closingBalance: number | string;
    agingDays: number | null;
    entriesCount: number;
    [key: string]: unknown;
  }) => ({
    ...m,
    risk: computeHousekeepingRisk(
      m.metricType,
      Number(m.closingBalance),
      m.agingDays,
      m.entriesCount
    ),
  }));

  // Top 10 highest risk
  const topRisks = scoredMetrics
    .sort((a: { risk: { score: number } }, b: { risk: { score: number } }) => b.risk.score - a.risk.score)
    .slice(0, 10);

  // Aggregate stats
  const aggregate = await aggregateHousekeepingRisk(tx, tenantId, period);

  return {
    topRisks,
    aggregate,
    totalMetrics: metrics.length,
  };
}
