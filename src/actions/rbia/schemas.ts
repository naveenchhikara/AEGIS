/**
 * RBIA Server Action Schemas (Phase 20)
 *
 * Zod validation schemas for all RBIA-related server actions.
 * NO "use server" directive — this is a pure schema/type module.
 */

import { z } from "zod";

// ─── Error Codes ─────────────────────────────────────────────────────────────

export type ActionErrorCode =
  | "PERMISSION_DENIED"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "TRANSITION_BLOCKED"
  | "SCORE_FROZEN"
  | "INTERNAL_ERROR";

// ─── ActionResult<T> ─────────────────────────────────────────────────────────

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: ActionErrorCode };

// ─── Score Labels & Severity ──────────────────────────────────────────────────

const ScoreLabelEnum = z.enum([
  "FULLY_COMPLIANT",
  "LARGELY_COMPLIANT",
  "PARTIALLY_COMPLIANT",
  "NON_COMPLIANT",
]);

const SeverityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

const MeetingTypeEnum = z.enum(["OPENING", "EXIT"]);

// ─── Examination Response ─────────────────────────────────────────────────────

/**
 * Save a single examination response for a checklist node.
 * workingNotes must be at least 500 chars for PARTIALLY/NON_COMPLIANT scores.
 */
export const SaveExaminationResponseSchema = z
  .object({
    engagementId: z.string().uuid(),
    nodeId: z.string().uuid(),
    scoreLabel: ScoreLabelEnum,
    workingNotes: z.string().max(2000),
    flagForObservation: z.boolean(),
    flagForActionPoint: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (
      data.scoreLabel === "PARTIALLY_COMPLIANT" ||
      data.scoreLabel === "NON_COMPLIANT"
    ) {
      if (!data.workingNotes || data.workingNotes.length < 500) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Working notes must be at least 500 characters for PARTIALLY_COMPLIANT or NON_COMPLIANT scores.",
          path: ["workingNotes"],
        });
      }
    }
  });

export type SaveExaminationResponseInput = z.infer<
  typeof SaveExaminationResponseSchema
>;

// ─── Module Selection ─────────────────────────────────────────────────────────

export const AddModuleSelectionSchema = z.object({
  engagementId: z.string().uuid(),
  moduleCode: z.string().min(1),
});

export type AddModuleSelectionInput = z.infer<typeof AddModuleSelectionSchema>;

export const RemoveModuleSelectionSchema = z.object({
  engagementId: z.string().uuid(),
  moduleCode: z.string().min(1),
});

export type RemoveModuleSelectionInput = z.infer<
  typeof RemoveModuleSelectionSchema
>;

export const AutoSelectModulesSchema = z.object({
  engagementId: z.string().uuid(),
});

export type AutoSelectModulesInput = z.infer<typeof AutoSelectModulesSchema>;

// ─── Meetings ─────────────────────────────────────────────────────────────────

export const RecordMeetingSchema = z.object({
  engagementId: z.string().uuid(),
  meetingType: MeetingTypeEnum,
  meetingDate: z.string().datetime(),
  attendees: z.array(z.string()).min(1, "At least one attendee is required."),
  minutesText: z.string().min(1),
  keyDiscussionPoints: z.string().min(1),
});

export type RecordMeetingInput = z.infer<typeof RecordMeetingSchema>;

export const SignOffMeetingSchema = z.object({
  engagementId: z.string().uuid(),
  meetingType: MeetingTypeEnum,
});

export type SignOffMeetingInput = z.infer<typeof SignOffMeetingSchema>;

// ─── Action Points ────────────────────────────────────────────────────────────

export const CreateActionPointSchema = z.object({
  engagementId: z.string().uuid(),
  branchId: z.string().uuid(),
  title: z
    .string()
    .min(5, "Title must be at least 5 characters.")
    .max(200, "Title must be at most 200 characters."),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters."),
  severity: SeverityEnum,
  moduleCode: z.string().min(1),
  sourceResponseId: z.string().uuid().optional(),
});

export type CreateActionPointInput = z.infer<typeof CreateActionPointSchema>;

export const UpdateActionPointSchema = z.object({
  actionPointId: z.string().uuid(),
  title: z
    .string()
    .min(5, "Title must be at least 5 characters.")
    .max(200, "Title must be at most 200 characters.")
    .optional(),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters.")
    .optional(),
  severity: SeverityEnum.optional(),
  moduleCode: z.string().min(1).optional(),
});

export type UpdateActionPointInput = z.infer<typeof UpdateActionPointSchema>;

export const DeleteActionPointSchema = z.object({
  actionPointId: z.string().uuid(),
});

export type DeleteActionPointInput = z.infer<typeof DeleteActionPointSchema>;

// ─── Promote Action Point → Observation ──────────────────────────────────────

export const PromoteToObservationSchema = z.object({
  actionPointId: z.string().uuid(),
  engagementId: z.string().uuid(),
  title: z.string().min(1),
  condition: z.string().min(1),
  criteria: z.string().min(1),
  cause: z.string().min(1),
  effect: z.string().min(1),
  recommendation: z.string().min(1),
  severity: SeverityEnum,
});

export type PromoteToObservationInput = z.infer<
  typeof PromoteToObservationSchema
>;

// ─── Branch Manager Response ──────────────────────────────────────────────────

export const SubmitBmResponseSchema = z.object({
  actionPointId: z.string().uuid(),
  responseText: z
    .string()
    .min(10, "Response text must be at least 10 characters."),
});

export type SubmitBmResponseInput = z.infer<typeof SubmitBmResponseSchema>;

// ─── RBIA Score Freeze ────────────────────────────────────────────────────────

export const FreezeRbiaScoreSchema = z.object({
  engagementId: z.string().uuid(),
});

export type FreezeRbiaScoreInput = z.infer<typeof FreezeRbiaScoreSchema>;
