# Project State

## Current Position

**Phase:** 11 of 14 — Auth Security Hardening (IN PROGRESS)
**Status:** Completed 11-01 (Auth security hardening) — 4 HIGH-severity gaps closed
**Last activity:** 2026-02-10

Progress: [█████████████████░░░░] 82% (63/63 v2.0 plans + 1/4 gap closure plans)

## Milestone Progress

| Milestone                | Phases | Plans | Status             |
| ------------------------ | ------ | ----- | ------------------ |
| v1.0 Clickable Prototype | 1–4    | 23/23 | Shipped 2026-02-08 |
| v2.0 Working Core MVP    | 5–10   | 40/40 | Complete           |
| v2.0 Gap Closure         | 11–14  | 0/TBD | **ACTIVE**         |

## v2.0 Phase Detail

| Phase | Name                      | Plans | Done | Status   |
| ----- | ------------------------- | ----- | ---- | -------- |
| 5     | Foundation & Migration    | 6     | 6    | Complete |
| 6     | Observation Lifecycle     | 7     | 7    | Complete |
| 7     | Auditee Portal & Evidence | 8     | 8    | Complete |
| 8     | Notifications & Reports   | 6     | 6    | Complete |
| 9     | Dashboards                | 5     | 5    | Complete |
| 10    | Onboarding & Compliance   | 8     | 8    | Complete |

## v2.0 Gap Closure Detail

| Phase | Name                           | Plans | Done | Status      |
| ----- | ------------------------------ | ----- | ---- | ----------- |
| 11    | Auth Security Hardening        | 1     | 1    | In Progress |
| 12    | Dashboard Data Pipeline        | TBD   | 0    | Planned     |
| 13    | Onboarding Persistence & Excel | TBD   | 0    | Planned     |
| 14    | Verification & Prod Readiness  | TBD   | 0    | Planned     |

### Gap → Phase Mapping

| Gap Source         | Item                                  | Severity | Phase |
| ------------------ | ------------------------------------- | -------- | ----- |
| Phase 5 tech debt  | Rate limiting not configured          | HIGH     | 11    |
| Phase 5 tech debt  | Account lockout missing               | HIGH     | 11    |
| Phase 5 tech debt  | Concurrent session limit missing      | HIGH     | 11    |
| Phase 5 tech debt  | Session cookie settings implicit      | HIGH     | 11    |
| Phase 9 tech debt  | Trend widgets return null             | MEDIUM   | 12    |
| Phase 9 tech debt  | Missing engagementId on Observation   | MEDIUM   | 12    |
| Phase 8 tech debt  | Repeat findings board report empty    | MEDIUM   | 12    |
| ONBD-03            | Excel org structure upload not built  | MUST     | 13    |
| Phase 10 tech debt | Server-side onboarding save not wired | LOW      | 13    |
| Phases 6-10        | VERIFICATION.md missing (5 phases)    | MEDIUM   | 14    |
| Phase 6            | E2E browser tests pending             | MEDIUM   | 14    |
| Phase 7            | Permission guard test skipped         | LOW      | 14    |
| Phase 8            | AWS SES domain verification pending   | MEDIUM   | 14    |

## Key Decisions

Full decision log in PROJECT.md. Architecture-critical ones:

- **Multi-tenancy:** PostgreSQL RLS — tenant isolation at DB level
- **Auth:** Better Auth (not NextAuth.js) — better Next.js 16 support
- **DAL pattern:** server-only → getRequiredSession → prismaForTenant → WHERE tenantId → runtime assertion
- **RBAC:** Multi-role with permission-first design; skip next-safe-action
- **Observations:** Bottom-up atoms; all macro views derived by aggregation; no JSON fallback post-Phase 5
- **Infrastructure:** S3 PutObject+GetObject only (immutable evidence), SES Mumbai for email, React-PDF for board reports
- **Data locality:** AWS Mumbai (ap-south-1); DR replication only to ap-south-2 (Hyderabad)
- **Account lockout (D22):** Track by email (not userId) to prevent user enumeration
- **Security table scope (D23):** FailedLoginAttempt has no tenantId — system-level, cross-tenant
- **Plugin implementation (D24):** accountLockout plugin `after` hook deferred to Phase 14 due to Better Auth API gaps

## Active Blockers

- **AWS SES domain verification:** Required for production email; 3–5 day DNS propagation lead time
- **Docker daemon:** Must be running for local PostgreSQL (`docker-compose up -d`)

## Phase 11 Concerns (for Phase 14)

- **Failed attempt tracking:** accountLockout plugin `after` hook incomplete — deferred to Phase 14
- **E2E verification needed:** Rate limiting, lockout, session limits require runtime testing with PostgreSQL
- **Database migration pending:** FailedLoginAttempt table exists in schema, not yet applied to DB

## Session Continuity

Last session: 2026-02-10
Completed 11-01-PLAN.md: Auth security hardening — rate limiting, account lockout, session limits, cookie security. Next: Plan 11-02 (if exists) or move to Phase 12 planning.

---

_State initialized: 2026-02-07_
_Last updated: 2026-02-10_
