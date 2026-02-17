import { z } from "zod";

export const CreateComplianceItemsSchema = z.object({
  engagementId: z.string().uuid("Invalid engagement ID"),
});

export type CreateComplianceItemsInput = z.infer<typeof CreateComplianceItemsSchema>;

export const SubmitBranchResponseSchema = z.object({
  complianceItemId: z.string().uuid("Invalid compliance item ID"),
  responseText: z.string().min(10, "Response must be at least 10 characters"),
  evidenceS3Keys: z.array(z.string()).optional(),
});

export type SubmitBranchResponseInput = z.infer<typeof SubmitBranchResponseSchema>;

export const ZacReviewSchema = z.object({
  complianceItemId: z.string().uuid("Invalid compliance item ID"),
  decision: z.enum(["APPROVED", "REJECTED", "REQUEST_INFO"], {
    message: "Invalid decision",
  }),
  comments: z.string().min(5, "Comments must be at least 5 characters"),
});

export type ZacReviewInput = z.infer<typeof ZacReviewSchema>;
