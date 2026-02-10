# Project State

## Current Position

**Phase:** 14 of 14 — Verification & Prod Readiness (IN PROGRESS)
**Plan:** 4 of TBD
**Status:** Phases 6-10 verification complete (5 phases verified). Playwright E2E infrastructure verified. Permission guard tests complete. AWS SES domain verification skipped (DKIM tokens generated, DNS records not added).
**Last activity:** 2026-02-10

Progress: [████████████████████░] 96% (63/63 v2.0 plans + 4/? verification plans complete)

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
| 14    | Verification & Prod Readiness  | TBD   | 4    | **ACTIVE** |

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
| Phases 6-10        | VERIFICATION.md missing (5 phases)    | MEDIUM   | 14    | ✅ DONE |
| Phase 6            | E2E browser tests pending             | MEDIUM   | 14    | ✅ DONE |
| Phase 7            | Permission guard test skipped         | LOW      | 14    | ✅ DONE |
| Phase 8            | AWS SES domain verification pending   | MEDIUM   | 14    | SKIPPED |

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
- **Skip SES verification (D36):** Plan 14-04 user chose ses-skip — SES identity created with DKIM tokens but DNS records not added; Phase 14 success criteria #4 NOT satisfied

## Active Blockers

- **Test account passwords:** Test users need Better Auth accounts with password "TestPassword123!" before `pnpm test:e2e` can run
- **AWS SES domain verification (SKIPPED):** SES identity created in ap-south-1 with DKIM tokens, but DNS CNAME records NOT added — DKIM status NOT_STARTED; production email sending cannot be tested until verification completes
- **Docker daemon:** Must be running for local PostgreSQL (`docker-compose up -d`)

## Phase 11 Concerns (for Phase 14)

- **Failed attempt tracking:** accountLockout plugin `after` hook incomplete — deferred to Phase 14
- **E2E verification needed:** Rate limiting, lockout, session limits require runtime testing with PostgreSQL
- **Database migration pending:** FailedLoginAttempt table exists in schema, not yet applied to DB

## Session Continuity

Last session: 2026-02-10
Completed 14-04: Created permission guard E2E tests for Phase 7 branch-scoped access controls. Tests verify auditee cannot access audit-trail (CAE-only page), CAE can access audit-trail, and auditor/manager have correct access scopes. AWS SES domain verification reached checkpoint — user chose ses-skip option. SES identity created in ap-south-1 with 3 DKIM tokens generated, but DNS CNAME records NOT added. DKIM status remains NOT_STARTED. Phase 14 success criteria #4 ("AWS SES domain verified and first test email sent successfully") NOT satisfied. Next: Create plan 14-05 for Phase 11 security hardening E2E tests (rate limiting, account lockout, session limits) or re-audit incomplete items before Phase 14 sign-off.

---

_State initialized: 2026-02-07_
_Last updated: 2026-02-10_
