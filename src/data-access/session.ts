import "server-only";
import { auth } from "@/lib/auth";
import type { AuthSession } from "@/lib/auth";
import type { Role } from "@/generated/prisma/enums";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Get authenticated session or redirect to login.
 * MUST be used in all DAL functions and server actions.
 *
 * CRITICAL SECURITY (Skeptic S2):
 * - tenantId MUST come from this session ONLY
 * - NEVER accept tenantId from URL params, request body, or query string
 * - DAL functions accept session object returned by this function
 *
 * Single boundary cast: session is cast to AuthSession here so all downstream
 * code gets clean types (tenantId: string, roles: Role[]) without `as any`.
 */
export async function getRequiredSession(): Promise<AuthSession> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  // Single cast at the boundary — all downstream code gets clean types
  return session as unknown as AuthSession;
}

/**
 * Get session without redirect (for optional auth checks).
 * Returns null if not authenticated.
 */
export async function getOptionalSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

/**
 * Get current user's tenant ID from session.
 * Helper for DAL functions.
 */
export async function getCurrentTenantId(): Promise<string> {
  const session = await getRequiredSession();
  return session.user.tenantId; // No cast needed — AuthSession types it as string
}

/**
 * Get user roles from session.
 *
 * Returns the roles array from the authenticated user.
 */
export async function getSessionRoles(): Promise<Role[]> {
  const session = await getRequiredSession();
  return session.user.roles; // No cast needed — AuthSession types it as Role[]
}

/**
 * Check if user has a specific role.
 *
 * @param role - Role to check for
 * @returns true if user has the role, false otherwise
 */
export async function hasRole(role: Role): Promise<boolean> {
  const roles = await getSessionRoles();
  return roles.includes(role);
}

/**
 * Check if user has any of the specified roles.
 *
 * @param roles - Array of roles to check for
 * @returns true if user has any of the roles, false otherwise
 */
export async function hasAnyRole(roles: Role[]): Promise<boolean> {
  const userRoles = await getSessionRoles();
  return roles.some((role) => userRoles.includes(role));
}

/**
 * Check if user has all of the specified roles.
 *
 * @param roles - Array of roles to check for
 * @returns true if user has all of the roles, false otherwise
 */
export async function hasAllRoles(roles: Role[]): Promise<boolean> {
  const userRoles = await getSessionRoles();
  return roles.every((role) => userRoles.includes(role));
}
