-- Attach `audit_trigger` to every audited table, idempotently.
--
-- The original attachments live in two Prisma migrations
-- (20260209015123_audit_trigger, 20260209220425_add_remaining_audit_triggers)
-- which `prisma db push` never runs. This file is the single place the
-- attachment is expressed for any database built by push, and it is safe to
-- re-run against a database that already has them.
--
-- Requires audit_trigger_function() to exist — see the null-safe function file
-- earlier in the manifest.

DO $$
DECLARE
  t TEXT;
  audited TEXT[] := ARRAY[
    'Tenant', 'User', 'Branch', 'AuditArea', 'AuditPlan', 'AuditEngagement',
    'Observation', 'ObservationTimeline', 'Evidence', 'ComplianceRequirement',
    'UserBranchAssignment', 'AuditeeResponse', 'NotificationQueue', 'EmailLog'
  ];
BEGIN
  FOREACH t IN ARRAY audited LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_trigger ON %I', t);
    EXECUTE format(
      'CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON %I
         FOR EACH ROW EXECUTE FUNCTION audit_trigger_function()',
      t
    );
  END LOOP;
END
$$;
