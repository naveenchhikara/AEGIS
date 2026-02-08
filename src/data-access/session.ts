import "server-only";
import { auth } from "@/lib/auth";
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
 */
export async function getRequiredSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  return session;
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
  // TODO: Update this when we add organization/multi-tenant support
  // For now, users have a tenantId field on their record
  return (session.user as any).tenantId as string;
}

/**
 * Get user roles from session.
 *
 * Returns the roles array from the authenticated user.
 */
export async function getSessionRoles(): Promise<string[]> {
  const session = await getRequiredSession();
  // Extract roles from user object
  // Note: User model has roles as Role[] enum array
  const roles = (session.user as any).roles || [];
  return roles;
}

/**
 * Check if user has a specific role.
 *
 * @param role - Role to check for
 * @returns true if user has the role, false otherwise
 */
export async function hasRole(role: string): Promise<boolean> {
  const roles = await getSessionRoles();
  return roles.includes(role);
}

/**
 * Check if user has any of the specified roles.
 *
 * @param roles - Array of roles to check for
 * @returns true if user has any of the roles, false otherwise
 */
export async function hasAnyRole(roles: string[]): Promise<boolean> {
  const userRoles = await getSessionRoles();
  return roles.some((role) => userRoles.includes(role));
}

/**
 * Check if user has all of the specified roles.
 *
 * @param roles - Array of roles to check for
 * @returns true if user has all of the roles, false otherwise
 */
export async function hasAllRoles(roles: string[]): Promise<boolean> {
  const userRoles = await getSessionRoles();
  return roles.every((role) => userRoles.includes(role));
}
