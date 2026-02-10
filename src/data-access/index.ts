// ============================================================================
// Data Access Layer (DAL) Barrel Export
// ============================================================================
// All DAL modules are exported here. Import from this file:
//
// import { getTenantSettings } from "@/data-access";
//
// SECURITY NOTES:
// - All DAL functions are server-only (import 'server-only' at file top)
// - DAL functions accept session object for tenantId (never from request input)
// - All DAL functions use prismaForTenant() for RLS isolation
// - All DAL functions add explicit WHERE tenantId (belt-and-suspenders)
// - All DAL functions perform runtime assertions on returned data
// ============================================================================

// Settings module (canonical example for all DAL modules)
export { getTenantSettings, updateTenantSettingsDAL } from "./settings";
export type { TenantSettings } from "@/types";

// Session module (tenantId source of truth)
export { getRequiredSession, getOptionalSession } from "./session";

// Shared DAL helpers (tenant/role extraction from session)
export { extractTenantId, extractUserRoles } from "./helpers";
export type { DalSession } from "./helpers";

// Prisma module (tenant-scoped client with RLS)
export { prismaForTenant } from "@/lib/prisma";

// Users module (05-04)
export { getUsers, getUserById } from "./users";

// Future exports: observations, compliance, audit-plans, evidence, etc.
