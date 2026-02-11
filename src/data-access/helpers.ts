import "server-only";
import { redirect } from "next/navigation";

/**
 * Shared types and helpers for the Data Access Layer.
 *
 * Centralizes the Session type and tenant/role extraction logic
 * that was previously duplicated across 5+ DAL files.
 */

// ─── Shared Session Type ────────────────────────────────────────────────────

export type DalSession = {
  user: { id: string; tenantId?: string | null; [key: string]: unknown };
  session: { id: string; [key: string]: unknown };
};

// ─── Tenant Extraction ──────────────────────────────────────────────────────

/**
 * Extract tenantId from authenticated session, redirecting if absent.
 *
 * SECURITY: tenantId MUST come from session only, never from URL/body/query.
 * Redirects to onboarding if user has no tenant association.
 */
export function extractTenantId(session: DalSession): string {
  const tenantId = (session.user as any).tenantId as string;
  if (!tenantId) {
    redirect("/dashboard?setup=required");
  }
  return tenantId;
}

// ─── Role Extraction ────────────────────────────────────────────────────────

/**
 * Extract user roles array from session.
 * Returns empty array if roles are not set.
 */
export function extractUserRoles(session: DalSession): string[] {
  return ((session.user as any).roles ?? []) as string[];
}
