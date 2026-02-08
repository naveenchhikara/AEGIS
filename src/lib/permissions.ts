/**
 * Role-Based Access Control (RBAC) Permission System
 *
 * This module defines roles, permissions, and helper functions for checking
 * access control. Supports multi-role users (Decision D13, D20).
 *
 * Multi-role support:
 * - Users can hold multiple roles: roles Role[]
 * - Permission checks use roles.includes() not role === (D20)
 * - getPermissions() returns union of all role permissions
 */

/**
 * User roles in the AEGIS platform.
 * Matches the Role enum in Prisma schema (05-02).
 */
export enum Role {
  AUDITOR = "AUDITOR",
  AUDIT_MANAGER = "AUDIT_MANAGER",
  CAE = "CAE", // Chief Audit Executive
  CCO = "CCO", // Chief Compliance Officer
  CEO = "CEO", // Chief Executive Officer
  AUDITEE = "AUDITEE",
  BOARD_OBSERVER = "BOARD_OBSERVER", // Reserved — no permissions defined yet (DE9)
}

/**
 * Granular permissions across the platform.
 * Each permission represents a specific action or capability.
 */
export type Permission =
  // Observation Management
  | "observation:create"
  | "observation:read"
  | "observation:review"
  | "observation:approve"
  | "observation:close_low_medium"
  | "observation:close_high_critical"
  // Compliance Management
  | "compliance:read"
  | "compliance:update"
  | "compliance:mark_na"
  // Audit Plans
  | "audit_plan:read"
  | "audit_plan:create"
  | "audit_plan:manage"
  // Reports
  | "report:read"
  | "report:generate"
  | "report:add_commentary"
  // Administration
  | "admin:manage_users"
  | "admin:manage_roles"
  | "admin:manage_settings"
  // Audit Trail
  | "audit_trail:read"
  // Dashboard Access
  | "dashboard:auditor"
  | "dashboard:manager"
  | "dashboard:cae"
  | "dashboard:cco"
  | "dashboard:ceo";

/**
 * Role-to-permission mapping.
 * Each role has a specific set of permissions.
 *
 * BOARD_OBSERVER: Reserved for future use, no permissions yet (DE9).
 */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  AUDITOR: [
    "observation:create",
    "observation:read",
    "compliance:read",
    "audit_plan:read",
    "dashboard:auditor",
  ],
  AUDIT_MANAGER: [
    "observation:read",
    "observation:review",
    "observation:close_low_medium",
    "audit_plan:create",
    "audit_plan:manage",
    "compliance:read",
    "compliance:update",
    "report:read",
    "dashboard:manager",
  ],
  CAE: [
    "observation:read",
    "observation:approve",
    "observation:close_high_critical",
    "audit_plan:read",
    "audit_plan:manage",
    "compliance:read",
    "compliance:update",
    "compliance:mark_na",
    "report:read",
    "report:generate",
    "report:add_commentary",
    "audit_trail:read",
    "admin:manage_users",
    "admin:manage_roles",
    "dashboard:cae",
  ],
  CCO: [
    "compliance:read",
    "compliance:update",
    "observation:read",
    "report:read",
    "dashboard:cco",
  ],
  CEO: ["dashboard:ceo", "report:read", "observation:read", "compliance:read"],
  AUDITEE: ["observation:read"], // Limited to assigned observations only
  BOARD_OBSERVER: [], // Reserved — no permissions yet (DE9)
};

/**
 * Check if user with given roles has a specific permission.
 *
 * IMPORTANT (Decision D20): Uses roles.some() to check across ALL held roles.
 * NEVER use roles[0] or assume single role.
 *
 * Multi-role example:
 * - User with roles [CAE, CCO] checking 'dashboard:ceo' → false
 * - User with roles [CAE, CCO] checking 'audit_trail:read' → true (from CAE)
 * - User with roles [CAE, CCO] checking 'compliance:update' → true (from either)
 *
 * @param roles - Array of roles held by the user
 * @param permission - Permission to check
 * @returns true if any of the user's roles has the permission
 */
export function hasPermission(roles: Role[], permission: Permission): boolean {
  return roles.some((role) => ROLE_PERMISSIONS[role]?.includes(permission));
}

/**
 * Get all permissions for a set of roles (union).
 *
 * For multi-role users, this returns the union of permissions from all roles.
 * Example: [CAE, CCO] → permissions from both roles combined.
 *
 * @param roles - Array of roles held by the user
 * @returns Array of all permissions across all roles (deduplicated)
 */
export function getPermissions(roles: Role[]): Permission[] {
  const permissions = new Set<Permission>();
  for (const role of roles) {
    for (const perm of ROLE_PERMISSIONS[role] ?? []) {
      permissions.add(perm);
    }
  }
  return Array.from(permissions);
}

/**
 * Maker-checker enforcement.
 *
 * The same person cannot create AND approve the same observation.
 * This is a transaction-level check, not a role-level check.
 *
 * This prevents a single person from bypassing review by:
 * 1. Creating an observation
 * 2. Approving their own observation
 *
 * @param userId - ID of the user attempting approval
 * @param observation - Observation object with createdById field
 * @returns true if user can approve (not the creator)
 */
export function canApproveObservation(
  userId: string,
  observation: { createdById: string },
): boolean {
  return userId !== observation.createdById;
}

/**
 * Get all available roles (for admin dropdowns, etc.)
 * Excludes BOARD_OBSERVER which is reserved and not assignable yet.
 */
export function getAssignableRoles(): Role[] {
  return Object.values(Role).filter((role) => role !== Role.BOARD_OBSERVER);
}

/**
 * Get display name for a role.
 * Useful for UI labels, badges, etc.
 */
export function getRoleDisplayName(role: Role): string {
  const displayNames: Record<Role, string> = {
    AUDITOR: "Auditor",
    AUDIT_MANAGER: "Audit Manager",
    CAE: "Chief Audit Executive",
    CCO: "Chief Compliance Officer",
    CEO: "Chief Executive Officer",
    AUDITEE: "Auditee",
    BOARD_OBSERVER: "Board Observer",
  };
  return displayNames[role] || role;
}
