-- Audit Trail Trigger Function and Setup
-- Creates PostgreSQL trigger function to automatically log all mutations on tenant-scoped tables.
-- Reads business context set by application via set_config() before mutations.
--
-- CRITICAL SECURITY:
-- - Trigger fires AFTER mutation (cannot be bypassed by application code)
-- - Immutability enforced by database role permissions (see add_audit_log_rules.sql)
-- - 10-year retention configured per PMLA 2002 (Decision D14)
-- - Sequence numbers enable gap detection (Decision D9)

-- ─── Audit Trigger Function ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  _action_type TEXT;
  _justification TEXT;
  _ip_address TEXT;
  _session_id TEXT;
  _user_id TEXT;
  _tenant_id TEXT;
BEGIN
  -- Read application context set by Prisma before mutation
  -- current_setting() returns NULL if not set (second param TRUE = don't error on missing)
  _action_type := current_setting('app.current_action', TRUE);
  _justification := current_setting('app.current_justification', TRUE);
  _ip_address := current_setting('app.current_ip_address', TRUE);
  _session_id := current_setting('app.current_session_id', TRUE);
  _user_id := current_setting('app.current_user_id', TRUE);
  _tenant_id := current_setting('app.current_tenant_id', TRUE);

  -- Insert audit log entry
  INSERT INTO "AuditLog" (
    id,
    "tenantId",
    "userId",
    "tableName",
    "recordId",
    operation,
    "actionType",
    justification,
    "oldData",
    "newData",
    "ipAddress",
    "sessionId",
    "retentionExpiresAt",
    createdat  -- lowercase to match PostgreSQL default
  ) VALUES (
    gen_random_uuid(),
    _tenant_id::UUID,  -- Cast TEXT to UUID (from current_setting)
    _user_id::UUID,
    TG_TABLE_NAME,
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.id::TEXT
      ELSE NEW.id::TEXT
    END,
    TG_OP,
    _action_type,
    _justification,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    _ip_address,
    _session_id,
    NOW() + INTERVAL '10 years',  -- DE3: PMLA 10-year retention
    NOW()
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

-- ─── Attach Trigger to All Tenant-Scoped Tables ─────────────────────────────
-- IMPORTANT: DO NOT attach to AuditLog table itself (would cause infinite recursion)

CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON "Tenant" FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON "User" FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON "Branch" FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON "AuditArea" FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON "AuditPlan" FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON "AuditEngagement" FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON "Observation" FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON "ObservationTimeline" FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON "Evidence" FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON "ComplianceRequirement" FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Note: RbiCircular is a global reference table (no tenantId), so no trigger attached
