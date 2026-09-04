# Superseded SQL

These files are kept for history. **Do not apply them.** The live set of
non-Prisma database objects is `prisma/sql/manifest.ts`, applied by
`pnpm db:bootstrap` and checked by `pnpm db:verify`.

| File | Why it is not applied |
| --- | --- |
| `20260209_onboarding_models.sql` | Creates the `UserStatus` enum and adds User/Tenant/ComplianceRequirement columns that `schema.prisma` now owns. Errors against a pushed database. |
| `add_rls_policies.sql` | Creates the `aegis_app` role and enables row-level security. Tenant isolation is enforced in application code, not PostgreSQL RLS (see `CLAUDE.md`). |
| `add_auditee_portal_schema.sql` | RLS policies and `aegis_app` grants. |
| `add_notification_tables.sql` | RLS policies and grants. Its `audit_trigger` attachments are absorbed into `prisma/sql/020_attach_audit_triggers.sql`. |
| `add_audit_log_rules.sql` | Non-idempotent `CREATE RULE` plus `aegis_app` grants. |
| `add_observation_lifecycle_indexes.sql` | Replaced by `prisma/sql/050_observation_indexes.sql`, which drops the non-idempotent `CREATE POLICY` tail. |
