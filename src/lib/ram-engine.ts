/**
 * RAM (Risk Assessment Model) Computation Engine
 *
 * Pure functions for computing branch risk assessments.
 * Based on RBIA Policy 2020 §7.3-7.6 and §9.1.
 *
 * Scoring: 1 (lowest risk) to 5 (highest risk) per parameter.
 * Composite: Weighted average of all parameter scores.
 * Risk Category: HIGH (>3.5), MEDIUM (2.5-3.5), LOW (<2.5)
 * Audit Frequency: HIGH→12mo, MEDIUM→18mo, LOW→24mo
 */

export interface RamScoreInput {
  paramCode: string;
  score: number;  // 1-5
  weight: number; // 0-1 (sum of all weights ≈ 1.0)
}

export interface RamComputationResult {
  compositeScore: number;    // Weighted average, 2 decimal places
  riskCategory: "HIGH" | "MEDIUM" | "LOW";
  auditFrequency: number;   // Months: 12, 18, or 24
}

/**
 * Compute composite score as weighted average.
 * Formula: Σ(score_i × weight_i) / Σ(weight_i)
 *
 * Normalizes by total weight to handle cases where weights
 * don't sum exactly to 1.0 (e.g., some params inactive).
 */
export function computeCompositeScore(scores: RamScoreInput[]): number {
  if (scores.length === 0) {
    throw new Error("Cannot compute composite score with zero parameters");
  }

  const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight === 0) {
    throw new Error("Total weight cannot be zero");
  }

  const weightedSum = scores.reduce((sum, s) => sum + s.score * s.weight, 0);
  const composite = weightedSum / totalWeight;

  return Math.round(composite * 100) / 100; // 2 decimal places
}

/**
 * Derive risk category from composite score.
 * Per RBIA Policy §7.5:
 *   - > 3.5  → HIGH risk
 *   - 2.5-3.5 → MEDIUM risk
 *   - < 2.5  → LOW risk
 */
export function deriveRiskCategory(compositeScore: number): "HIGH" | "MEDIUM" | "LOW" {
  if (compositeScore > 3.5) return "HIGH";
  if (compositeScore >= 2.5) return "MEDIUM";
  return "LOW";
}

/**
 * Derive audit frequency from risk category.
 * Per RBIA Policy §7.6:
 *   - HIGH   → 12 months (annual)
 *   - MEDIUM → 18 months
 *   - LOW    → 24 months (biennial)
 */
export function deriveAuditFrequency(riskCategory: "HIGH" | "MEDIUM" | "LOW"): number {
  const FREQUENCY_MAP: Record<string, number> = {
    HIGH: 12,
    MEDIUM: 18,
    LOW: 24,
  };
  return FREQUENCY_MAP[riskCategory] ?? 18; // Default to 18 if unknown
}

/**
 * Full RAM computation pipeline.
 * Takes scored parameters, returns composite score + risk category + frequency.
 */
export function computeRam(scores: RamScoreInput[]): RamComputationResult {
  const compositeScore = computeCompositeScore(scores);
  const riskCategory = deriveRiskCategory(compositeScore);
  const auditFrequency = deriveAuditFrequency(riskCategory);

  return { compositeScore, riskCategory, auditFrequency };
}
