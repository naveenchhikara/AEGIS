/**
 * Investment Compliance Monitoring Logic (R94-R95)
 * 
 * Pure functions for UCB regulatory compliance:
 * - Non-SLR cap monitoring (10% of deposits) — R95
 * - Broker concentration monitoring (5% cap per broker) — R94
 * 
 * These are pure computation functions with no side effects.
 * Call from server actions for real-time compliance checks.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaTransactionClient = any;

/**
 * Check if broker concentration exceeds 5% cap (R94).
 * RBI regulation: No single broker should handle >5% of total investment transactions.
 */
export async function checkBrokerConcentration(
  tx: PrismaTransactionClient,
  tenantId: string,
  period: string,
  brokerName: string
): Promise<{ compliant: boolean; percentage: number; message: string }> {
  // Get all investment records for the period
  const allRecords = await tx.investmentRecord.findMany({
    where: {
      tenantId,
      period,
    },
    select: {
      faceValue: true,
      brokerName: true,
    },
  });

  if (allRecords.length === 0) {
    return {
      compliant: true,
      percentage: 0,
      message: "No investment records found for this period",
    };
  }

  // Calculate totals
  const totalInvestment = allRecords.reduce(
    (sum: number, r: { faceValue: number | string }) => sum + Number(r.faceValue),
    0
  );

  const brokerTotal = allRecords
    .filter((r: { brokerName: string | null }) => r.brokerName === brokerName)
    .reduce((sum: number, r: { faceValue: number | string }) => sum + Number(r.faceValue), 0);

  const percentage = (brokerTotal / totalInvestment) * 100;
  const compliant = percentage <= 5;

  return {
    compliant,
    percentage: Number(percentage.toFixed(2)),
    message: compliant
      ? `Broker ${brokerName} is within 5% limit (${percentage.toFixed(2)}%)`
      : `WARNING: Broker ${brokerName} exceeds 5% limit at ${percentage.toFixed(2)}%`,
  };
}

/**
 * Check non-SLR investment cap (10% of deposits) — R95.
 * RBI regulation: Non-SLR investments cannot exceed 10% of total deposits.
 * 
 * Note: This requires deposit data. In absence of deposit records,
 * we return a warning. Integration point: fetch deposit balance from
 * core banking system or manual entry in housekeeping metrics.
 */
export async function checkNonSlrCap(
  tx: PrismaTransactionClient,
  tenantId: string,
  period: string
): Promise<{ compliant: boolean; percentage: number | null; message: string }> {
  // Get total non-SLR investments
  const nonSlrRecords = await tx.investmentRecord.findMany({
    where: {
      tenantId,
      period,
      securityType: "NON_SLR",
    },
    select: {
      faceValue: true,
    },
  });

  const totalNonSlr = nonSlrRecords.reduce(
    (sum: number, r: { faceValue: number | string }) => sum + Number(r.faceValue),
    0
  );

  if (totalNonSlr === 0) {
    return {
      compliant: true,
      percentage: 0,
      message: "No non-SLR investments found",
    };
  }

  // TODO: Integrate with deposit data source
  // For now, we fetch from housekeeping metrics if available
  const depositMetrics = await tx.housekeepingMetric.findMany({
    where: {
      tenantId,
      period,
      metricType: "TOTAL_DEPOSITS",
    },
    select: {
      closingBalance: true,
    },
  });

  if (depositMetrics.length === 0) {
    return {
      compliant: false,
      percentage: null,
      message:
        "WARNING: Cannot verify non-SLR cap — deposit data not available. Please add TOTAL_DEPOSITS housekeeping metric.",
    };
  }

  const totalDeposits = depositMetrics.reduce(
    (sum: number, m: { closingBalance: number | string }) => sum + Number(m.closingBalance),
    0
  );

  const percentage = (totalNonSlr / totalDeposits) * 100;
  const compliant = percentage <= 10;

  return {
    compliant,
    percentage: Number(percentage.toFixed(2)),
    message: compliant
      ? `Non-SLR investments within 10% limit (${percentage.toFixed(2)}%)`
      : `WARNING: Non-SLR investments exceed 10% limit at ${percentage.toFixed(2)}%`,
  };
}

/**
 * Get investment portfolio summary for a period.
 * Returns breakdown by security type and classification.
 */
export async function getInvestmentPortfolioSummary(
  tx: PrismaTransactionClient,
  tenantId: string,
  period: string
) {
  const records = await tx.investmentRecord.findMany({
    where: { tenantId, period },
    select: {
      securityType: true,
      classification: true,
      faceValue: true,
      bookValue: true,
      marketValue: true,
    },
  });

  // Group by security type
  const byType: Record<string, { count: number; totalFaceValue: number; totalBookValue: number }> = {};
  
  records.forEach((r: { securityType: string; faceValue: number | string; bookValue: number | string }) => {
    if (!byType[r.securityType]) {
      byType[r.securityType] = { count: 0, totalFaceValue: 0, totalBookValue: 0 };
    }
    byType[r.securityType].count += 1;
    byType[r.securityType].totalFaceValue += Number(r.faceValue);
    byType[r.securityType].totalBookValue += Number(r.bookValue);
  });

  // Group by classification
  const byClassification: Record<string, { count: number; totalFaceValue: number }> = {};
  
  records.forEach((r: { classification: string; faceValue: number | string }) => {
    if (!byClassification[r.classification]) {
      byClassification[r.classification] = { count: 0, totalFaceValue: 0 };
    }
    byClassification[r.classification].count += 1;
    byClassification[r.classification].totalFaceValue += Number(r.faceValue);
  });

  return {
    byType,
    byClassification,
    totalRecords: records.length,
    totalFaceValue: records.reduce((sum: number, r: { faceValue: number | string }) => sum + Number(r.faceValue), 0),
    totalBookValue: records.reduce((sum: number, r: { bookValue: number | string }) => sum + Number(r.bookValue), 0),
  };
}
