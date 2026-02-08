import "server-only";
import { getRequiredSession } from "./session";
import { prismaForTenant } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

/**
 * DATA ACCESS LAYER PATTERN (canonical example for all DAL modules):
 *
 * 1. Import 'server-only' — prevents client-side import
 * 2. Call getRequiredSession() — single source of tenantId (Skeptic S2)
 * 3. Use prismaForTenant(tenantId) — RLS isolation
 * 4. Add explicit WHERE tenantId — belt-and-suspenders (Skeptic S1)
 * 5. Runtime assertion — verify returned data matches tenantId
 *
 * SECURITY INVARIANTS:
 * - tenantId MUST come from session ONLY, never from URL/body/query
 * - NEVER use $queryRaw/$executeRaw without explicit tenantId parameter
 * - Every function follows this exact 5-step pattern
 */

/**
 * Tenant settings type returned by getTenantSettings.
 * Matches the Prisma Tenant model select fields.
 */
export type TenantSettings = {
  id: string;
  name: string;
  shortName: string;
  rbiLicenseNo: string;
  tier: string;
  state: string;
  city: string;
  scheduledBankStatus: boolean;
  nabardRegistrationNo: string | null;
  multiStateLicense: boolean;
  dakshScore: unknown | null; // Prisma Decimal
  dakshScoreDate: Date | null;
  pcaStatus: string;
  pcaEffectiveDate: Date | null;
  lastRbiInspectionDate: Date | null;
  rbiRiskRating: string | null;
  settings: unknown | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Get tenant settings (bank profile) from PostgreSQL.
 *
 * Steps:
 * 1. getRequiredSession() — tenantId from session only
 * 2. prismaForTenant() — RLS isolation
 * 3. Explicit WHERE tenantId — belt-and-suspenders
 * 4. Runtime assertion — verify data matches
 */
export async function getTenantSettings(): Promise<TenantSettings | null> {
  // Step 1: Get authenticated session (tenantId source)
  const session = await getRequiredSession();
  const tenantId = (session.user as any).tenantId as string;

  // Step 2: Get tenant-scoped Prisma client (RLS layer)
  const db = prismaForTenant(tenantId);

  // Step 3: Query with EXPLICIT WHERE tenantId (belt-and-suspenders)
  const tenant = await db.tenant.findFirst({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      shortName: true,
      rbiLicenseNo: true,
      tier: true,
      state: true,
      city: true,
      scheduledBankStatus: true,
      nabardRegistrationNo: true,
      multiStateLicense: true,
      dakshScore: true,
      dakshScoreDate: true,
      pcaStatus: true,
      pcaEffectiveDate: true,
      lastRbiInspectionDate: true,
      rbiRiskRating: true,
      settings: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // Step 4: Runtime assertion (Skeptic S1)
  if (tenant && tenant.id !== tenantId) {
    console.error("CRITICAL: Tenant ID mismatch in getTenantSettings", {
      expected: tenantId,
      received: tenant.id,
    });
    throw new Error("Data isolation violation detected");
  }

  return tenant as TenantSettings | null;
}

/**
 * Update editable tenant settings.
 *
 * READ-ONLY fields NOT updatable (DE11):
 * - rbiLicenseNo, name (legal bank name), state (of registration)
 * These are set during onboarding and cannot be changed.
 *
 * @param data - Validated editable fields only
 */
export async function updateTenantSettingsDAL(
  data: Pick<
    Prisma.TenantUpdateInput,
    "shortName" | "city" | "nabardRegistrationNo" | "settings"
  >,
) {
  // Step 1: Get authenticated session
  const session = await getRequiredSession();
  const tenantId = (session.user as any).tenantId as string;

  // Step 2: Get tenant-scoped Prisma client
  const db = prismaForTenant(tenantId);

  // Step 3: Update with explicit WHERE tenantId
  const updated = await db.tenant.update({
    where: { id: tenantId },
    data,
  });

  // Step 4: Runtime assertion
  if (updated.id !== tenantId) {
    console.error("CRITICAL: Tenant ID mismatch in updateTenantSettings", {
      expected: tenantId,
      received: updated.id,
    });
    throw new Error("Data isolation violation detected");
  }

  return updated;
}
