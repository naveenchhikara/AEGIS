# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-08)

**Core value:** Individual audit observations flow upward through a structured lifecycle to form the complete risk and compliance picture — from a single branch finding to the board report.

**Current focus:** Phase 10 - Onboarding & Compliance (v2.0 Working Core MVP — FINAL PHASE)

## Current Position

Phase: 10 of 10 (Onboarding & Compliance)
Plan: Starting Phase 10 (8 plans)
Status: Phase 9 code complete, Phase 10 starting
Last activity: 2026-02-09 — Completed 06-01 observation schema migration

Progress: [███████████████████░] 75% (58/~95 plans complete across all milestones)

## Performance Metrics

**Velocity:**

- Total plans completed: 59 (v1.0 complete + Phase 5-9, 06-01)
- Average duration: Not tracked (v1.0 executed rapidly)
- Total execution time: ~3 days (v1.0 prototype), ~2 days (Phase 5-9)

**By Milestone:**

| Milestone | Phases | Plans  | Status      | Completed  |
| --------- | ------ | ------ | ----------- | ---------- |
| v1.0      | 1-4    | 23/23  | Complete    | 2026-02-08 |
| v2.0      | 5-10   | 35/~40 | In progress | 2026-02-09 |

**Recent Trend:**

- v1.0 shipped 2026-02-08 (Phases 1-4 complete)
- v2.0 roadmap created 2026-02-08
- 05-01: Infrastructure Foundation completed 2026-02-08
- 05-02: Prisma Setup completed 2026-02-08
- 05-03: Authentication Implementation completed 2026-02-08
- 05-04: Role-Based Access Control completed 2026-02-08
- 05-05: Audit Trail System completed 2026-02-09
- 05-06: DAL Pattern & Settings Migration completed 2026-02-09
- **Phase 5 COMPLETE** — All 6 plans done (2026-02-09)
- 06-01: Observation Schema Migration completed 2026-02-09 — Extended Prisma schema with lifecycle fields, ObservationRbiCircular junction table, pg_trgm extension and indexes, observation lifecycle constants
- 06-02: State Machine + Role Guards completed 2026-02-09
- 06-03: Observation CRUD Actions + DAL completed 2026-02-09
- 06-04: Repeat Finding Detection completed 2026-02-09
- 06-05: Observation Form UI + Findings List Migration completed 2026-02-09
- 06-06: Observation Detail Page Migration completed 2026-02-09
- **Phase 6 CODE COMPLETE** — Plans 06-01 through 06-06 done (2026-02-09)
- 06-07: E2E Verification Checkpoint — pending manual browser testing
- 07-01: Auditee Portal Schema Additions completed 2026-02-09
- 07-02: S3 Utility Module completed 2026-02-09
- 07-03: Auditee Server Actions + DAL completed 2026-02-09
- 07-04: Auditee Observation List UI completed 2026-02-09
- 07-05: Evidence Upload + Response Form UI completed 2026-02-09
- 07-06: Auditee Dashboard Page Migration completed 2026-02-09
- 07-07: Auditee Observation Detail Page completed 2026-02-09
- **Phase 7 CODE COMPLETE** — Plans 07-01 through 07-07 done (2026-02-09)
- 07-08: E2E Verification Checkpoint — pending manual browser testing
- 08-01: Notification Infrastructure completed 2026-02-09
- 08-02: Email Templates completed 2026-02-09
- 08-03: Notification Jobs & Processing completed 2026-02-09
- 08-04: PDF Board Report Generator completed 2026-02-09
- 08-05: Excel Export Routes completed 2026-02-09
- 08-06: Integration & UI (notification prefs, report generation, export buttons, triggers) completed 2026-02-09
- **Phase 8 CODE COMPLETE** — Plans 08-01 through 08-06 done (2026-02-09)
- 08-07: E2E Verification Checkpoint — pending manual browser testing
- 09-01: Dashboard Infrastructure completed 2026-02-09
- 09-02: Dashboard Data Access Layer completed 2026-02-09
- 09-03: Shared Dashboard Widgets completed 2026-02-09
- 09-04: Role-Specific Dashboard Widgets completed 2026-02-09
- 09-05: Dashboard Page Composition & Integration completed 2026-02-09
- **Phase 9 CODE COMPLETE** — Plans 09-01 through 09-05 done (2026-02-09)
- 09-06: E2E Verification Checkpoint — pending manual browser testing
- Phase 10 starting (Onboarding & Compliance — 8 plans)

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting v2.0 work:

- **No Redis in Phase 5 (D3):** Better Auth uses database sessions by default. Redis will be added in Phase 8 for email queue. (05-01)
- **S3 IAM Policy: PutObject + GetObject only (D10, S6):** Evidence files are immutable once uploaded. Soft-delete via database `deleted_at` timestamp if needed. (05-01)
- **DR Replication Target (DE10):** Must target ap-south-2 (Hyderabad) only. Never replicate to non-India AWS region. (05-01)
- **PostgreSQL RLS for multi-tenancy:** Tenant isolation enforced at database level; even app bugs can't leak data (Pending)
- **Better Auth (not NextAuth.js):** Auth.js joined Better Auth in Sept 2025; Better Auth has better Next.js 16 support (05-03)
- **React-PDF for board reports:** Pure React, no headless browser; works client-side and server-side (Pending)
- **AWS SES for email:** Mumbai region; reliable for banking clients; Rs 70/1000 emails (Pending)
- **Bottom-up observation architecture:** Individual observations are atoms; all macro views derived by aggregation (Pending)
- **Multi-role RBAC:** Users can hold multiple roles; permission checks use roles.some() not role === (D13, D20) (05-04)
- **Role type from Prisma:** Import Role type from Prisma to ensure type compatibility between DB and app layer (05-04)
- **Self-role-change prevention:** Admins cannot change their own roles to prevent privilege escalation (05-04)
- **Justification for role changes:** All role changes require justification text for audit trail (DE6) (05-04)
- **Permission-first design:** Every feature requires explicit permission; no implicit access based on role name (05-04)
- **XLSX export deferred to Phase 8:** ExcelJS not installed in Phase 5; audit trail export will use ExcelJS when added in Phase 8 (05-05)
- **DAL 5-step pattern established:** server-only → getRequiredSession → prismaForTenant → explicit WHERE tenantId → runtime assertion (05-06)
- **UserBranchAssignment in Phase 7 (D22):** Model created in Phase 7 schema, populated during Phase 10 onboarding
- **Skip next-safe-action (D23):** Manual Zod + auth pattern for consistency across all phases
- **No JSON fallback (D24):** Phase 6+ assumes DB is running; no try/catch fallback to JSON data
- **OBSERVATION_STATUS_ORDER as Record (06-01):** Changed from string[] to Record<string, number> for O(1) lookups instead of O(n) indexOf()
- **RISK_CATEGORIES lowercase kebab-case (06-01):** Changed from uppercase snake_case (CREDIT_RISK) to lowercase kebab-case (credit-risk) for consistency

### Pending Todos

None yet.

### Blockers/Concerns

**Phase 5 (Foundation) readiness:**

- Docker daemon not running — User must start Docker Desktop before `docker-compose up -d`
- AWS CLI not configured — User must run `aws configure` and `./scripts/setup-s3.sh dev`
- PostgreSQL schema not created — Prisma migrations to be added in Phase 6
- **Better Auth schema needs to be generated and applied** — Run `npx @better-auth/cli generate` or manually add Better Auth tables to schema.prisma (05-03)
- **User model needs Better Auth fields** — emailVerified, image, password fields need to be added to User model (05-03)
- RLS policy testing requires dedicated app role, not superuser (see research/SUMMARY.md)
- Auth.js + next-intl cookie conflict must be validated (middleware ordering)
- Data import trap: ~20 client components import JSON; all need server-fetch refactoring

**Phase 6 (Observation) verification:**

- 9 E2E test scenarios require manual browser testing
- No COMPLIANCE-state observations in seed — tester must manually transition through full lifecycle
- Plan references Rajesh Deshmukh as "Auditor" but he is CEO — use Suresh Patil for Auditor tests

**Phase 7 (Auditee Portal) infrastructure:**

- AWS SES requires domain verification (3-5 days for DNS propagation)
- Deliverability testing with Indian email providers needed

### Pre-Phase 9 Setup Required

- Phase 6 + Phase 7 E2E verification should pass before production deployment
- See `.planning/phases/06-observation-lifecycle/06-07-SUMMARY.md` for Phase 6 test checklist
- See `.planning/phases/07-auditee-portal-evidence/07-08-PLAN.md` for Phase 7 test checklist
- AWS SES domain verification needed (1 week lead time)

## Session Continuity

Last session: 2026-02-09
Stopped at: Completed 06-01 observation schema migration
Resume file: .planning/STATE.md

---

_State initialized: 2026-02-07_
_Last updated: 2026-02-09 after Phase 8 code completion + Phase 9 Wave 1 start_
