import "server-only";
import { getRequiredSession } from "./session";
import { prismaForTenant } from "./prisma";
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
 * Matches Prisma Tenant model select fields.
 *
 * READ-ONLY fields (set during onboarding, DE11):
 * - name (legal bank name)
 * - rbiLicenseNo (RBI License Number)
 * - state (state of registration)
 * - tier (UCB Tier)
 *
 * EDITABLE fields (can be updated via settings page):
 * - shortName, address, city, pincode, phone, email, website
 *
 * REGULATORY fields (display-only, DE8):
 * - scheduledBankStatus, nabardRegistrationNo, multiStateLicense
 * - dakshScore, pcaStatus, lastRbiInspectionDate, rbiRiskRating
 */
export type TenantSettings = {
  id: string;
  name: string; // Legal bank name (read-only, DE11)
  shortName: string;
  rbiLicenseNo: string; // RBI License Number (read-only, DE11)
  tier: string; // UCB Tier (read-only)
  state: string; // State of registration (read-only, DE11)
  city: string;
  address: string | null; // Editable
  pincode: string | null; // Editable
  phone: string | null; // Editable
  email: string | null; // Editable
  website: string | null; // Editable
  incorporationDate: Date | null; // Bank establishment date
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
      name: true, // Legal bank name (read-only, DE11)
      shortName: true,
      rbiLicenseNo: true, // RBI License Number (read-only, DE11)
      tier: true, // UCB Tier (read-only)
      state: true, // State of registration (read-only, DE11)
      city: true,
      address: true, // Editable
      pincode: true, // Editable
      phone: true, // Editable
      email: true, // Editable
      website: true, // Editable
      incorporationDate: true, // Bank establishment date
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
 * - name (legal bank name) — set during onboarding
 * - rbiLicenseNo (RBI License Number) — set during onboarding
 * - state (state of registration) — set during onboarding
 * - tier (UCB Tier) — set during onboarding
 * - incorporationDate — set during onboarding
 * - Fiscal Year — hardcoded April-March (DE7), not configurable
 *
 * EDITABLE fields:
 * - shortName, address, city, pincode, phone, email, website
 *
 * @param data - Validated editable fields only
 */
export async function updateTenantSettingsDAL(
  data: Pick<
    Prisma.TenantUpdateInput,
    | "shortName"
    | "address"
    | "city"
    | "pincode"
    | "phone"
    | "email"
    | "website"
    | "nabardRegistrationNo"
    | "settings"
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
