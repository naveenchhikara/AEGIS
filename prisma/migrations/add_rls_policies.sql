-- =============================================================================
-- AEGIS RLS Policies Migration
-- =============================================================================
-- Creates dedicated application role, enables Row-Level Security on all
-- tenant-scoped tables, and creates tenant isolation policies.
--
-- Run AFTER Prisma migrations create the tables:
--   psql $DATABASE_URL < prisma/migrations/add_rls_policies.sql
-- =============================================================================

-- ─── 1. Create dedicated application role (NOT superuser) ────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'aegis_app') THEN
    CREATE ROLE aegis_app LOGIN PASSWORD 'aegis_app_dev_password';
  END IF;
END
$$;

-- ─── 2. Grant permissions to app role ────────────────────────────────────────

GRANT USAGE ON SCHEMA public TO aegis_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO aegis_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO aegis_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO aegis_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO aegis_app;

-- ─── 3. Enable RLS on ALL tenant-scoped tables (10 total) ───────────────────

ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Observation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ObservationTimeline" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Evidence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ComplianceRequirement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Branch" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditArea" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditEngagement" ENABLE ROW LEVEL SECURITY;

-- ─── 4. FORCE RLS on ALL 10 tenant-scoped tables (D8, Skeptic S5) ───────────
-- FORCE prevents even the table owner from bypassing RLS

ALTER TABLE "Tenant" FORCE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Observation" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ObservationTimeline" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Evidence" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ComplianceRequirement" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Branch" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuditArea" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuditPlan" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AuditEngagement" FORCE ROW LEVEL SECURITY;

-- ─── 5. Create tenant isolation policies ─────────────────────────────────────
-- Each policy checks current_setting('app.current_tenant_id') set by prismaForTenant

CREATE POLICY tenant_isolation_policy ON "Tenant"
  USING ("id" = current_setting('app.current_tenant_id', TRUE)::uuid);

CREATE POLICY tenant_isolation_policy ON "User"
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);

CREATE POLICY tenant_isolation_policy ON "Observation"
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);

CREATE POLICY tenant_isolation_policy ON "ObservationTimeline"
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);

CREATE POLICY tenant_isolation_policy ON "Evidence"
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);

CREATE POLICY tenant_isolation_policy ON "ComplianceRequirement"
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);

CREATE POLICY tenant_isolation_policy ON "Branch"
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);

CREATE POLICY tenant_isolation_policy ON "AuditArea"
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);

CREATE POLICY tenant_isolation_policy ON "AuditPlan"
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);

CREATE POLICY tenant_isolation_policy ON "AuditEngagement"
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);

-- ─── 6. Enable RLS on AuditLog (tenant-scoped reading) ──────────────────────

ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "AuditLog"
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);

-- ─── Verification queries (run manually) ────────────────────────────────────
-- SELECT relname, relrowsecurity, relforcerowsecurity
--   FROM pg_class WHERE relrowsecurity = true ORDER BY relname;
-- -- Should show 11 rows, all with both columns TRUE
--
-- SELECT tablename, policyname FROM pg_policies ORDER BY tablename;
-- -- Should show 11 policies (one per table)
