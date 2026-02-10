# Project State

## Current Position

**Phase:** 13 of 14 — Onboarding Persistence & Excel (IN PROGRESS)
**Status:** Plan 13-01 complete (server-side onboarding persistence). 1 of 2 Phase 13 gaps closed.
**Last activity:** 2026-02-10

Progress: [███████████████████░░] 91% (63/63 v2.0 plans + 4/? gap closure plans)

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
| 11    | Auth Security Hardening        | 1     | 1    | Complete    |
| 12    | Dashboard Data Pipeline        | 2     | 2    | Complete    |
| 13    | Onboarding Persistence & Excel | 2     | 1    | In Progress |
| 14    | Verification & Prod Readiness  | TBD   | 0    | Planned     |

### Gap → Phase Mapping

| Gap Source         | Item                                  | Severity | Phase | Status  |
| ------------------ | ------------------------------------- | -------- | ----- | ------- |
| Phase 5 tech debt  | Rate limiting not configured          | HIGH     | 11    | ✅ DONE |
| Phase 5 tech debt  | Account lockout missing               | HIGH     | 11    | ✅ DONE |
| Phase 5 tech debt  | Concurrent session limit missing      | HIGH     | 11    | ✅ DONE |
| Phase 5 tech debt  | Session cookie settings implicit      | HIGH     | 11    | ✅ DONE |
| Phase 9 tech debt  | Trend widgets return null             | MEDIUM   | 12    | ✅ DONE |
| Phase 9 tech debt  | Missing engagementId on Observation   | MEDIUM   | 12    | ✅ DONE |
| Phase 8 tech debt  | Repeat findings board report empty    | MEDIUM   | 12    | ✅ DONE |
| Phase 10 tech debt | Server-side onboarding save not wired | LOW      | 13    | ✅ DONE |
| ONBD-03            | Excel org structure upload not built  | MUST     | 13    | PLANNED |
| Phases 6-10        | VERIFICATION.md missing (5 phases)    | MEDIUM   | 14    | PLANNED |
| Phase 6            | E2E browser tests pending             | MEDIUM   | 14    | PLANNED |
| Phase 7            | Permission guard test skipped         | LOW      | 14    | PLANNED |
| Phase 8            | AWS SES domain verification pending   | MEDIUM   | 14    | PLANNED |

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
- **FK deletion policy (D25):** Use SetNull for engagementId/repeatOfId to prevent deletion cascades and preserve observation history
- **No backfill (D26):** Existing observations keep NULL engagementId/repeatOfId — engagement tracking starts from Phase 12 onward
- **Snapshot schedule (D27):** Daily metrics capture at 01:00 IST (19:30 UTC) via pg-boss cron — off-peak hours before business day
- **Batch processing (D28):** Process 10 tenants at a time to prevent connection pool exhaustion — scalable to hundreds of tenants
- **Trend granularity (D29):** Severity trends show quarterly data (6 quarters), compliance trends show daily data (6 months sparkline)
- **Server-wins merge (D30):** Onboarding state — server wins if server updatedAt > local lastSavedAt; prevents Device A from overwriting Device B's work
- **Fire-and-forget sync (D31):** Onboarding server saves are non-blocking; errors logged but don't interrupt UX; localStorage as fallback

## Active Blockers

- **AWS SES domain verification:** Required for production email; 3–5 day DNS propagation lead time
- **Docker daemon:** Must be running for local PostgreSQL (`docker-compose up -d`)

## Phase 11 Concerns (for Phase 14)

- **Failed attempt tracking:** accountLockout plugin `after` hook incomplete — deferred to Phase 14
- **E2E verification needed:** Rate limiting, lockout, session limits require runtime testing with PostgreSQL
- **Database migration pending:** FailedLoginAttempt table exists in schema, not yet applied to DB

## Session Continuity

Last session: 2026-02-10
Completed 13-01: Server-side onboarding persistence — Zustand store saveToServer/loadFromServer actions, auto-save on step advance, Save & Exit persists to PostgreSQL, cross-device resume support. Phase 10 tech debt item closed. Next: Plan 13-02 (Excel org structure upload).

---

_State initialized: 2026-02-07_
_Last updated: 2026-02-10_
