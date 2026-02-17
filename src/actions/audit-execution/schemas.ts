import { z } from "zod";

export const AssignTeamMemberSchema = z.object({
  engagementId: z.string().uuid("Invalid engagement ID"),
  userId: z.string().uuid("Invalid user ID"),
  roleInEngagement: z.enum(["LEAD_AUDITOR", "FIELD_AUDITOR"], {
    message: "Role must be LEAD_AUDITOR or FIELD_AUDITOR",
  }),
  assignedSections: z.array(z.string()).default([]),
});

export type AssignTeamMemberInput = z.infer<typeof AssignTeamMemberSchema>;

export const RemoveTeamMemberSchema = z.object({
  engagementId: z.string().uuid("Invalid engagement ID"),
  userId: z.string().uuid("Invalid user ID"),
});

export type RemoveTeamMemberInput = z.infer<typeof RemoveTeamMemberSchema>;

export const InitializeSectionsSchema = z.object({
  engagementId: z.string().uuid("Invalid engagement ID"),
});

export type InitializeSectionsInput = z.infer<typeof InitializeSectionsSchema>;

export const SubmitExaminationResponseSchema = z.object({
  engagementId: z.string().uuid("Invalid engagement ID"),
  itemId: z.string().uuid("Invalid item ID"),
  status: z.enum(["COMPLIANT", "NON_COMPLIANT", "PARTIAL", "NOT_APPLICABLE"], {
    message: "Status must be COMPLIANT, NON_COMPLIANT, PARTIAL, or NOT_APPLICABLE",
  }),
  observation: z.string().max(2000).optional(),
  riskRating: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
});

export type SubmitExaminationResponseInput = z.infer<typeof SubmitExaminationResponseSchema>;

export const UpdateSectionStatusSchema = z.object({
  engagementId: z.string().uuid("Invalid engagement ID"),
  sectionCode: z.string().min(1, "Section code is required"),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "REVIEWED"], {
    message: "Invalid section status",
  }),
});

export type UpdateSectionStatusInput = z.infer<typeof UpdateSectionStatusSchema>;
