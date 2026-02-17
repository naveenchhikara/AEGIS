import { z } from "zod";

/**
 * Zod validation schemas for report generation server actions.
 */

// ─── ComputeRiskRatingSchema ────────────────────────────────────────

export const ComputeRiskRatingSchema = z.object({
  engagementId: z.string().uuid("Invalid engagement ID"),
});

export type ComputeRiskRatingInput = z.infer<typeof ComputeRiskRatingSchema>;

// ─── GenerateReportSchema (for XLSX and PDF generation) ────────────

export const GenerateReportSchema = z.object({
  engagementId: z.string().uuid("Invalid engagement ID"),
});

export type GenerateReportInput = z.infer<typeof GenerateReportSchema>;
