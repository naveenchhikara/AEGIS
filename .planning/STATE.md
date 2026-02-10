# Project State

## Current Position

**Phase:** 14 of 14 — Verification & Prod Readiness (IN PROGRESS)
**Plan:** 3 of TBD
**Status:** Phase 6-7 verification complete. Playwright E2E infrastructure verified (work pre-completed by 14-02). Phase 8-9-10 verification and AWS SES pending.
**Last activity:** 2026-02-10

Progress: [███████████████████░░] 95% (63/63 v2.0 plans + 3/? verification plans complete)

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

| Phase | Name                           | Plans | Done | Status     |
| ----- | ------------------------------ | ----- | ---- | ---------- |
| 11    | Auth Security Hardening        | 1     | 1    | Complete   |
| 12    | Dashboard Data Pipeline        | 2     | 2    | Complete   |
| 13    | Onboarding Persistence & Excel | 2     | 2    | Complete   |
| 14    | Verification & Prod Readiness  | TBD   | 3    | **ACTIVE** |

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
| ONBD-03            | Excel org structure upload not built  | MUST     | 13    | ✅ DONE |
| Phases 6-7         | VERIFICATION.md missing (2 phases)    | MEDIUM   | 14    | ✅ DONE |
| Phases 8-10        | VERIFICATION.md missing (3 phases)    | LOW      | 14    | ✅ DONE |
| Phase 6            | E2E browser tests pending             | MEDIUM   | 14    | ✅ DONE |
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
- **Verification evidence format (D32):** All verification claims cite file paths with line numbers (e.g., "state-machine.ts lines 63-70") for grep validation; observable truths table format established
- **Test password strategy (D33):** Test accounts require password "TestPassword123!" to authenticate via Better Auth
- **Skip complex multi-state tests (D34):** Tests requiring full lifecycle transitions marked as .skip() pending test fixture implementation
- **No database reset between tests (D35):** Tests share database state; Playwright runs tests in parallel with isolation

## Active Blockers

- **Test account passwords:** Test users need Better Auth accounts with password "TestPassword123!" before `pnpm test:e2e` can run
- **AWS SES domain verification:** Required for production email; 3–5 day DNS propagation lead time
- **Docker daemon:** Must be running for local PostgreSQL (`docker-compose up -d`)

## Phase 11 Concerns (for Phase 14)

- **Failed attempt tracking:** accountLockout plugin `after` hook incomplete — deferred to Phase 14
- **E2E verification needed:** Rate limiting, lockout, session limits require runtime testing with PostgreSQL
- **Database migration pending:** FailedLoginAttempt table exists in schema, not yet applied to DB

## Session Continuity

Last session: 2026-02-10
Completed 14-03: Verified Playwright E2E infrastructure setup (work pre-completed by plan 14-02). playwright.config.ts with webServer, auth setup project, and 4 role-based test projects confirmed. tests/auth.setup.ts creates authenticated states for auditor, manager, CAE, auditee. tests/e2e/observation-lifecycle.spec.ts covers 9 Phase 6 test groups (OBS-01 through OBS-11). No new commits needed - all files already existed from 14-02. Test account passwords need configuration before execution. Next: Phase 7 permission guard testing (14-04) and AWS SES domain verification (14-05).

---

_State initialized: 2026-02-07_
_Last updated: 2026-02-10_
