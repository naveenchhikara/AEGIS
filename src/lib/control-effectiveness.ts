/**
 * Control Effectiveness Scoring Engine
 *
 * Pure functions for calculating control effectiveness scores from test results.
 * Based on work program test outcomes (R58).
 *
 * Scoring Logic:
 * - EFFECTIVE: 100 points
 * - PARTIALLY_EFFECTIVE: 50 points
 * - INEFFECTIVE: 0 points
 * - Final Score: Weighted average of all tests (0-100 scale)
 */

export type TestResult = "EFFECTIVE" | "PARTIALLY_EFFECTIVE" | "INEFFECTIVE";

export interface TestResultInput {
  result: TestResult;
  weight?: number; // Optional weight (defaults to 1)
}

export interface ControlEffectivenessResult {
  score: number; // 0-100
  rating:
    | "HIGHLY_EFFECTIVE"
    | "EFFECTIVE"
    | "PARTIALLY_EFFECTIVE"
    | "INEFFECTIVE";
  totalTests: number;
  effectiveTests: number;
  partialTests: number;
  ineffectiveTests: number;
}

/**
 * Calculate control effectiveness score from test results.
 *
 * Scoring:
 * - EFFECTIVE: 100 points
 * - PARTIALLY_EFFECTIVE: 50 points
 * - INEFFECTIVE: 0 points
 *
 * Rating Bands (R58):
 * - 90-100: HIGHLY_EFFECTIVE
 * - 70-89: EFFECTIVE
 * - 50-69: PARTIALLY_EFFECTIVE
 * - 0-49: INEFFECTIVE
 *
 * @param testResults - Array of test results with optional weights
 * @returns Effectiveness score and rating
 */
export function calculateControlEffectiveness(
  testResults: TestResultInput[],
): ControlEffectivenessResult {
  if (testResults.length === 0) {
    throw new Error("Cannot calculate effectiveness with zero test results");
  }

  let effectiveCount = 0;
  let partialCount = 0;
  let ineffectiveCount = 0;
  let totalWeightedScore = 0;
  let totalWeight = 0;

  // Calculate weighted score
  for (const test of testResults) {
    const weight = test.weight ?? 1;
    totalWeight += weight;

    let points = 0;
    if (test.result === "EFFECTIVE") {
      points = 100;
      effectiveCount++;
    } else if (test.result === "PARTIALLY_EFFECTIVE") {
      points = 50;
      partialCount++;
    } else {
      points = 0;
      ineffectiveCount++;
    }

    totalWeightedScore += points * weight;
  }

  // Calculate final score (0-100)
  const score = Math.round((totalWeightedScore / totalWeight) * 100) / 100;

  // Determine rating
  let rating: ControlEffectivenessResult["rating"];
  if (score >= 90) {
    rating = "HIGHLY_EFFECTIVE";
  } else if (score >= 70) {
    rating = "EFFECTIVE";
  } else if (score >= 50) {
    rating = "PARTIALLY_EFFECTIVE";
  } else {
    rating = "INEFFECTIVE";
  }

  return {
    score,
    rating,
    totalTests: testResults.length,
    effectiveTests: effectiveCount,
    partialTests: partialCount,
    ineffectiveTests: ineffectiveCount,
  };
}

/**
 * Calculate trend of control effectiveness over time.
 * Useful for monitoring control degradation or improvement.
 *
 * @param historicalScores - Array of historical effectiveness scores (oldest to newest)
 * @returns Trend direction and magnitude
 */
export function analyzeEffectivenessTrend(historicalScores: number[]): {
  trend: "IMPROVING" | "STABLE" | "DEGRADING";
  change: number; // Percentage change from first to last
  changePoints: number; // Absolute change
} {
  if (historicalScores.length < 2) {
    return { trend: "STABLE", change: 0, changePoints: 0 };
  }

  const first = historicalScores[0];
  const last = historicalScores[historicalScores.length - 1];
  const changePoints = last - first;
  const change = (changePoints / first) * 100;

  let trend: "IMPROVING" | "STABLE" | "DEGRADING";
  if (changePoints > 5) {
    trend = "IMPROVING";
  } else if (changePoints < -5) {
    trend = "DEGRADING";
  } else {
    trend = "STABLE";
  }

  return {
    trend,
    change: Math.round(change * 100) / 100,
    changePoints: Math.round(changePoints * 100) / 100,
  };
}

/**
 * Batch calculate effectiveness for multiple controls.
 * Useful for control library dashboard.
 *
 * @param controls - Array of controls with test results
 * @returns Array of effectiveness results with control IDs
 */
export function batchCalculateControlEffectiveness(
  controls: Array<{ id: string; name: string; testResults: TestResultInput[] }>,
): Array<ControlEffectivenessResult & { id: string; name: string }> {
  return controls
    .filter((c) => c.testResults.length > 0)
    .map((control) => {
      const result = calculateControlEffectiveness(control.testResults);
      return {
        id: control.id,
        name: control.name,
        ...result,
      };
    });
}

/**
 * Get controls requiring attention (ineffective or degrading).
 *
 * @param controls - Array of controls with effectiveness data
 * @returns Filtered array of controls needing attention
 */
export function getControlsRequiringAttention(
  controls: Array<ControlEffectivenessResult & { id: string; name: string }>,
) {
  return controls
    .filter(
      (c) => c.rating === "INEFFECTIVE" || c.rating === "PARTIALLY_EFFECTIVE",
    )
    .sort((a, b) => a.score - b.score); // Lowest scores first
}

/**
 * Calculate key control coverage.
 * Returns percentage of key controls that are EFFECTIVE or HIGHLY_EFFECTIVE.
 *
 * @param keyControls - Array of key controls with effectiveness results
 * @returns Coverage percentage (0-100)
 */
export function calculateKeyControlCoverage(
  keyControls: Array<ControlEffectivenessResult>,
): number {
  if (keyControls.length === 0) return 0;

  const effectiveCount = keyControls.filter(
    (c) => c.rating === "EFFECTIVE" || c.rating === "HIGHLY_EFFECTIVE",
  ).length;

  return Math.round((effectiveCount / keyControls.length) * 100 * 100) / 100;
}
