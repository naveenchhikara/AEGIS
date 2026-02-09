-- =============================================================================
-- AEGIS Audit Log Immutability Rules
-- =============================================================================
-- Makes AuditLog table immutable (INSERT + SELECT only) using PostgreSQL rules
-- and REVOKE. Satisfies FNDN-07 (RBI compliance), D14 (PMLA), Skeptic S4.
--
-- Run AFTER add_rls_policies.sql:
--   psql $DATABASE_URL < prisma/migrations/add_audit_log_rules.sql
-- =============================================================================

-- ─── 1. PostgreSQL RULES to prevent modification ─────────────────────────────
-- These rules intercept UPDATE/DELETE and silently discard them (DO INSTEAD NOTHING).
-- This applies to ALL roles, including superuser (belt-and-suspenders with REVOKE).

CREATE RULE prevent_audit_update AS ON UPDATE TO "AuditLog" DO INSTEAD NOTHING;
CREATE RULE prevent_audit_delete AS ON DELETE TO "AuditLog" DO INSTEAD NOTHING;

-- ─── 2. REVOKE write operations from app role ────────────────────────────────
-- Even without rules, aegis_app cannot UPDATE or DELETE audit log records.

REVOKE UPDATE, DELETE ON "AuditLog" FROM aegis_app;

-- ─── 3. Ensure app role can still INSERT and SELECT ──────────────────────────

GRANT INSERT, SELECT ON "AuditLog" TO aegis_app;

-- ─── Verification queries (run manually) ────────────────────────────────────
-- Test INSERT (should succeed):
--   INSERT INTO "AuditLog" ("tenantId", "tableName", "recordId", "operation")
--     VALUES ('00000000-0000-0000-0000-000000000001', 'test', 'test', 'INSERT');
--
-- Test UPDATE (should do nothing due to rule):
--   UPDATE "AuditLog" SET operation = 'MODIFIED' WHERE "tableName" = 'test';
--
-- Test DELETE (should do nothing due to rule):
--   DELETE FROM "AuditLog" WHERE "tableName" = 'test';
