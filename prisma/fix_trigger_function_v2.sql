-- Recreate audit trigger function with proper UUID casting
-- The AuditLog table expects UUID for tenantId and userId, but current_setting returns TEXT

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
  _action_type := current_setting('app.current_action', TRUE);
  _justification := current_setting('app.current_justification', TRUE);
  _ip_address := current_setting('app.current_ip_address', TRUE);
  _session_id := current_setting('app.current_session_id', TRUE);
  _user_id := current_setting('app.current_user_id', TRUE);
  _tenant_id := current_setting('app.current_tenant_id', TRUE);

  -- Insert audit log entry (cast TEXT to UUID where needed)
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
    createdat
  ) VALUES (
    gen_random_uuid(),
    _tenant_id::UUID,
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
    NOW() + INTERVAL '10 years',
    NOW()
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;
