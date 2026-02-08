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
