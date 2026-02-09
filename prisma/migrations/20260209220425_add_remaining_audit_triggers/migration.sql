-- Add audit triggers to remaining tenant-scoped tables
-- These tables were missed in the initial audit_trigger migration

-- Attach trigger to UserBranchAssignment
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON "UserBranchAssignment" FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Attach trigger to AuditeeResponse
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON "AuditeeResponse" FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Attach trigger to NotificationQueue
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON "NotificationQueue" FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Attach trigger to EmailLog
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON "EmailLog" FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
