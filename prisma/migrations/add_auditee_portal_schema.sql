-- Phase 7: Auditee Portal Schema — RLS policies and performance indexes
-- Applied after Prisma migration creates the tables

-- ─── RLS for UserBranchAssignment ────────────────────────────────────────────

ALTER TABLE "UserBranchAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserBranchAssignment" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_user_branch ON "UserBranchAssignment"
USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "UserBranchAssignment" TO aegis_app;

-- ─── RLS for AuditeeResponse ─────────────────────────────────────────────────

ALTER TABLE "AuditeeResponse" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditeeResponse" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_auditee_response ON "AuditeeResponse"
USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);

-- NOTE: No UPDATE or DELETE grants — AuditeeResponse is immutable (AUD-04)
GRANT SELECT, INSERT ON "AuditeeResponse" TO aegis_app;

-- ─── Performance indexes for auditee queries ─────────────────────────────────

-- Composite index for branch-scoped observation queries (auditee portal)
CREATE INDEX IF NOT EXISTS idx_observation_branch_status
ON "Observation" ("tenantId", "branchId", status);

-- Composite index for user branch lookups
CREATE INDEX IF NOT EXISTS idx_user_branch_assignment_user
ON "UserBranchAssignment" ("userId", "tenantId");
