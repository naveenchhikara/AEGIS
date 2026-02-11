# Project State

## Current Position

**Phase:** 15 of 16 (Production Hardening)
**Plan:** 4 of 4 in phase — PHASE COMPLETE
**Status:** Phase complete
**Last activity:** 2026-02-11 - Completed 15-04-PLAN.md

Progress: ████████████████████████████████████████████████████████ 54/54 (100%)

## Milestone History

| Milestone                | Phases | Plans | Status             |
| ------------------------ | ------ | ----- | ------------------ |
| v1.0 Clickable Prototype | 1–4    | 23/23 | Shipped 2026-02-08 |
| v2.0 Working Core MVP    | 5–14   | 50/50 | Shipped 2026-02-10 |
| v2.1 Gap Closure         | 15–16  | 4/4   | Phase 15 Complete  |

## Outstanding Items

- **AWS SES domain verification:** SES identity created in ap-south-1 with DKIM tokens, but DNS CNAME records NOT added — production email sending untested
- **Test account passwords:** Test users need Better Auth accounts with password "TestPassword123!" before `pnpm test:e2e` can run
- **Docker daemon:** Must be running for local PostgreSQL (`docker-compose up -d`)

## Key Decisions

Full decision log in PROJECT.md (D1–D41). Most recent:

- **D41 (15-04):** Delete locale infrastructure entirely — Locale demo data (hi/, mr/, gu/) and get-locale-data.ts were dead code; v2.0 uses database for all data, no runtime locale support needed
- **D40 (15-04):** Keep barrel export with deprecation warnings — 11 prototype views still import demo data from @/data barrel; updated to point to seed/ paths with clear deprecation comments for future cleanup
- **D39 (15-02):** AWS SES env vars optional in development — Made AWS_SES_REGION and SES_FROM_EMAIL optional to unblock local builds; required in production only
- **D38 (15-02):** Explicit child logger creation over AsyncLocalStorage — AsyncLocalStorage incompatible with Edge runtime; explicit createRequestLogger pattern works with App Router
- **D37 (15-02):** Pino over winston/bunyan for structured logging — Fastest Node.js logger with zero dependencies and native CloudWatch JSON format

Architecture-critical ones:

- **Multi-tenancy:** PostgreSQL RLS — tenant isolation at DB level
- **Auth:** Better Auth (not NextAuth.js) — better Next.js 16 support
- **DAL pattern:** server-only → getRequiredSession → prismaForTenant → WHERE tenantId → runtime assertion
- **Observations:** Bottom-up atoms; all macro views derived by aggregation
- **Infrastructure:** S3 (immutable evidence), SES Mumbai (email), React-PDF (board reports)
- **Data locality:** AWS Mumbai (ap-south-1)

## Session Continuity

Last session: 2026-02-11
Completed Phase 15 Plan 04 (Seed Data Migration). Moved all demo JSON files from src/data/demo/ to src/data/seed/ for physical isolation from runtime code. Deleted locale-specific demo data directories (hi/, mr/, gu/) and dead locale infrastructure code. Updated barrel export (src/data/index.ts) with deprecation warnings and seed/ paths. Updated seed script imports. Two commits (5553b9b, e9800ff). Phase 15 complete — all 4 production hardening plans shipped.

---

_State initialized: 2026-02-07_
_Last updated: 2026-02-11_
