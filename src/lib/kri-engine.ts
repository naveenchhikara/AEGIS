/**
 * KRI (Key Risk Indicator) Breach Detection Engine
 *
 * Pure functions for detecting KRI breaches by comparing current values
 * against configured thresholds.
 *
 * Breach Status Logic:
 * - BREACH: Current value outside threshold range [low, high]
 * - WARNING: Current value within 10% buffer zone of thresholds
 * - NORMAL: Current value within safe range
 */

export interface KRIInput {
  currentValue: number;
  thresholdLow: number;
  thresholdHigh: number;
}

export type BreachStatus = "BREACH" | "WARNING" | "NORMAL";

export interface KRIBreachResult {
  status: BreachStatus;
  deviation: number; // Percentage deviation from threshold
  message: string;
}

/**
 * Detect KRI breach status.
 * Compares current value against low/high thresholds with 10% buffer zone.
 *
 * @param kri - KRI data with current value and thresholds
 * @returns Breach status and deviation details
 */
export function detectKRIBreach(kri: KRIInput): KRIBreachResult {
  const { currentValue, thresholdLow, thresholdHigh } = kri;

  // Validate inputs
  if (thresholdLow >= thresholdHigh) {
    throw new Error(
      "Invalid thresholds: thresholdLow must be less than thresholdHigh"
    );
  }

  // Calculate 10% buffer zones
  const lowBufferZone = thresholdLow * 1.1; // 10% above low threshold
  const highBufferZone = thresholdHigh * 0.9; // 10% below high threshold

  // BREACH: Outside threshold range
  if (currentValue < thresholdLow) {
    const deviation = ((thresholdLow - currentValue) / thresholdLow) * 100;
    return {
      status: "BREACH",
      deviation: Math.round(deviation * 100) / 100,
      message: `Value ${currentValue} is below low threshold ${thresholdLow} (${deviation.toFixed(1)}% deviation)`,
    };
  }

  if (currentValue > thresholdHigh) {
    const deviation = ((currentValue - thresholdHigh) / thresholdHigh) * 100;
    return {
      status: "BREACH",
      deviation: Math.round(deviation * 100) / 100,
      message: `Value ${currentValue} is above high threshold ${thresholdHigh} (${deviation.toFixed(1)}% deviation)`,
    };
  }

  // WARNING: Within buffer zone (approaching threshold)
  if (currentValue <= lowBufferZone) {
    const deviation = ((lowBufferZone - currentValue) / thresholdLow) * 100;
    return {
      status: "WARNING",
      deviation: Math.round(deviation * 100) / 100,
      message: `Value ${currentValue} is approaching low threshold ${thresholdLow} (within 10% buffer)`,
    };
  }

  if (currentValue >= highBufferZone) {
    const deviation = ((currentValue - highBufferZone) / thresholdHigh) * 100;
    return {
      status: "WARNING",
      deviation: Math.round(deviation * 100) / 100,
      message: `Value ${currentValue} is approaching high threshold ${thresholdHigh} (within 10% buffer)`,
    };
  }

  // NORMAL: Within safe range
  return {
    status: "NORMAL",
    deviation: 0,
    message: `Value ${currentValue} is within normal range [${thresholdLow}, ${thresholdHigh}]`,
  };
}

/**
 * Batch process multiple KRIs for breach detection.
 * Useful for dashboard monitoring and alerts.
 *
 * @param kris - Array of KRI data
 * @returns Array of breach results with KRI IDs
 */
export function batchDetectKRIBreaches(
  kris: Array<KRIInput & { id: string; name: string }>
): Array<KRIBreachResult & { id: string; name: string }> {
  return kris.map((kri) => {
    const result = detectKRIBreach(kri);
    return {
      id: kri.id,
      name: kri.name,
      ...result,
    };
  });
}

/**
 * Filter KRIs by breach status.
 * Useful for escalation workflows and monitoring.
 *
 * @param results - Batch breach detection results
 * @param status - Filter by status (BREACH, WARNING, or NORMAL)
 * @returns Filtered KRI results
 */
export function filterKRIsByStatus(
  results: Array<KRIBreachResult & { id: string; name: string }>,
  status: BreachStatus
) {
  return results.filter((r) => r.status === status);
}

/**
 * Get critical KRIs requiring immediate attention.
 * Returns KRIs in BREACH status, sorted by deviation (highest first).
 *
 * @param results - Batch breach detection results
 * @returns Sorted array of critical KRIs
 */
export function getCriticalKRIs(
  results: Array<KRIBreachResult & { id: string; name: string }>
) {
  return results
    .filter((r) => r.status === "BREACH")
    .sort((a, b) => b.deviation - a.deviation);
}
