---
phase: 05-foundation-and-migration
plan: 02
status: complete
completed_at: 2026-02-08T23:30:00+05:30
---

# 05-02 Summary: Database Schema & Multi-Tenant Security

## What Was Built

### 1. Prisma Schema (`prisma/schema.prisma` — 441 lines)

**15 models** with complete multi-tenant architecture:

| Model                 | Tenant-scoped | Key Features                                                                                  |
| --------------------- | :-----------: | --------------------------------------------------------------------------------------------- |
| Tenant                |      N/A      | DAKSH/PCA/NABARD fields (D17, D21), UcbTier enum, scheduledBankStatus                         |
| User                  |      Yes      | `roles Role[]` array (D13), unique on [tenantId, email]                                       |
| Observation           |      Yes      | Full condition/criteria/cause/effect/recommendation fields                                    |
| ObservationTimeline   |      Yes      | Event log with oldValue/newValue                                                              |
| Evidence              |      Yes      | S3 key, soft delete via deletedAt                                                             |
| ComplianceRequirement |      Yes      | FK to RbiCircular, owner assignment                                                           |
| RbiCircular           |    Global     | No tenantId — shared across all tenants                                                       |
| Branch                |      Yes      | Unique on [tenantId, code]                                                                    |
| AuditArea             |      Yes      | Risk category, unique on [tenantId, name]                                                     |
| AuditPlan             |      Yes      | Indian fiscal quarters (D16), unique on [tenantId, year, quarter]                             |
| AuditEngagement       |      Yes      | Links plan to branch + area + assignee                                                        |
| AuditLog              |   Yes (RLS)   | Enriched: sequenceNumber, actionType, justification, ipAddress, sessionId, retentionExpiresAt |

**8 enums:** Role (7 values), Severity, ObservationStatus, ComplianceStatus, UcbTier, PcaStatus, Quarter (Indian fiscal year), AuditPlanStatus, EngagementStatus

### 2. RLS Migration SQL (`prisma/migrations/add_rls_policies.sql` — 103 lines)

- Created `aegis_app` PostgreSQL role (non-superuser)
- ENABLE ROW LEVEL SECURITY on 11 tables
- FORCE ROW LEVEL SECURITY on 11 tables (D8, Skeptic S5)
- `tenant_isolation_policy` on each table using `current_setting('app.current_tenant_id')`
- Grants for aegis_app role

### 3. Audit Log Immutability SQL (`prisma/migrations/add_audit_log_rules.sql` — 36 lines)

- `prevent_audit_update` RULE (DO INSTEAD NOTHING)
- `prevent_audit_delete` RULE (DO INSTEAD NOTHING)
- REVOKE UPDATE, DELETE on AuditLog FROM aegis_app
- GRANT INSERT, SELECT on AuditLog TO aegis_app

### 4. Prisma Client (`src/lib/prisma.ts` — 62 lines)

- Singleton pattern with `PrismaPg` driver adapter (Prisma 7)
- `prismaForTenant(tenantId)` function with transaction-scoped SET LOCAL
- Security documentation in comments (D6, Skeptic S1, S2)
- Exports: `prisma`, `prismaForTenant`

### 5. Seed Script (`prisma/seed.ts` — 800 lines)

- **Tenant A (Apex Sahakari Bank):** 5 users, 12 branches, 7 audit areas, 4 audit plans, 7 engagements, 55 compliance requirements, 35 observations with timeline events
- **Tenant B (Test Nagari Sahakari Bank):** 1 user, 1 branch, 1 audit area, 1 plan, 1 compliance req, 1 observation
- **Global:** 8 RBI circulars
- Multi-role users: Priya Sharma (CAE+AUDIT_MANAGER), Vikram Kulkarni (AUDITEE+AUDITOR), Test Bank Admin (CEO+CAE)
- Indian fiscal year quarters (Q1_APR_JUN through Q4_JAN_MAR)

### 6. Tenant Isolation Test (`scripts/test-tenant-isolation.ts` — 246 lines)

- Tests all 11 tenant-scoped tables
- Sets tenant context via `set_config`, queries each table
- Verifies cross-tenant data access returns 0 rows
- Generates compliance report artifact (`tenant-isolation-report.txt`)

### 7. Package.json Updates

- Added `db:generate`, `db:push`, `db:migrate`, `db:seed`, `db:studio` scripts
- Added `prisma.seed` config pointing to `tsx prisma/seed.ts`
- Dependencies: `@prisma/client`, `@prisma/adapter-pg`, `pg`
- DevDependencies: `prisma`, `tsx`, `@types/pg`, `dotenv`

## Decisions Implemented

| Decision                    | Implementation                                               |
| --------------------------- | ------------------------------------------------------------ |
| D8: FORCE RLS on all tables | 11 tables with FORCE ROW LEVEL SECURITY                      |
| D13: Multi-role users       | `roles Role[]` PostgreSQL array of enum                      |
| D14: 10-year audit trail    | `retentionExpiresAt` field on AuditLog                       |
| D15: Business action_type   | `actionType` field on AuditLog                               |
| D16: Indian fiscal year     | Quarter enum: Q1_APR_JUN, Q2_JUL_SEP, Q3_OCT_DEC, Q4_JAN_MAR |
| D17: DAKSH/PCA/NABARD       | Nullable fields on Tenant model                              |
| D18: Tenant isolation cert  | Test script generates compliance report                      |
| D20: roles.includes()       | Documented in schema comments                                |
| D21: Nullable DAKSH/PCA     | `dakshScore?`, `dakshScoreDate?`, etc.                       |

## Verification

- `pnpm prisma validate` — schema valid
- `pnpm prisma generate` — client generated (7.3.0)
- `pnpm build` — TypeScript compilation succeeds
- Schema excludes from tsconfig: `prisma/seed.ts`, `scripts/`

## What Needs Docker/PostgreSQL

The following require a running PostgreSQL instance:

1. `pnpm prisma migrate dev` — create tables
2. `psql < prisma/migrations/add_rls_policies.sql` — apply RLS
3. `psql < prisma/migrations/add_audit_log_rules.sql` — apply audit log rules
4. `pnpm db:seed` — populate demo data
5. `npx tsx scripts/test-tenant-isolation.ts` — run isolation tests

## Prisma 7 Notes

- Prisma 7 removes `url` from schema `datasource` block — URL now in `prisma.config.ts`
- Client requires `PrismaPg` driver adapter (not raw connection string)
- Constructor: `new PrismaPg({ connectionString })` then `new PrismaClient({ adapter })`
- Generated client at `src/generated/prisma/client` (not `index.ts`)
