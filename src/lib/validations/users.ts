import { z } from "zod";
import { type Role, getAssignableRoles } from "@/lib/permissions";

/**
 * Schema for role assignment form validation.
 */
export const updateRolesSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  roles: z.array(z.enum(getAssignableRoles() as [Role, ...Role[]])),
  justification: z
    .string()
    .min(10, "Justification must be at least 10 characters"),
});

export type UpdateRolesInput = z.infer<typeof updateRolesSchema>;
