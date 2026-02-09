-- Phase 8: Notification Infrastructure
-- RLS policies, audit triggers, and grants for notification tables

-- ─── NotificationQueue ──────────────────────────────────────────────────────

ALTER TABLE "NotificationQueue" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationQueue" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "NotificationQueue"
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);

GRANT SELECT, INSERT, UPDATE ON "NotificationQueue" TO aegis_app;

CREATE TRIGGER audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON "NotificationQueue"
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ─── EmailLog ───────────────────────────────────────────────────────────────

ALTER TABLE "EmailLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailLog" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "EmailLog"
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);

GRANT SELECT, INSERT ON "EmailLog" TO aegis_app;

CREATE TRIGGER audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON "EmailLog"
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ─── NotificationPreference ─────────────────────────────────────────────────

ALTER TABLE "NotificationPreference" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationPreference" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "NotificationPreference"
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);

GRANT SELECT, INSERT, UPDATE ON "NotificationPreference" TO aegis_app;

CREATE TRIGGER audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON "NotificationPreference"
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ─── BoardReport ────────────────────────────────────────────────────────────

ALTER TABLE "BoardReport" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BoardReport" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON "BoardReport"
  USING ("tenantId" = current_setting('app.current_tenant_id', TRUE)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "BoardReport" TO aegis_app;

CREATE TRIGGER audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON "BoardReport"
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
