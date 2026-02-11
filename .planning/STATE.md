# Project State

## Current Position

**Phase:** 15 of 16 (Production Hardening)
**Plan:** 3 of 4 in phase — COMPLETE
**Status:** In progress
**Last activity:** 2026-02-11 - Completed 15-03-PLAN.md

Progress: ███████████████████████████████████████████████████████░ 53/54 (98.1%)

## Milestone History

| Milestone                | Phases | Plans | Status              |
| ------------------------ | ------ | ----- | ------------------- |
| v1.0 Clickable Prototype | 1–4    | 23/23 | Shipped 2026-02-08  |
| v2.0 Working Core MVP    | 5–14   | 50/50 | Shipped 2026-02-10  |
| v2.1 Gap Closure         | 15–16  | 3/4   | In Progress (15-03) |

## Outstanding Items

- **AWS SES domain verification:** SES identity created in ap-south-1 with DKIM tokens, but DNS CNAME records NOT added — production email sending untested
- **Test account passwords:** Test users need Better Auth accounts with password "TestPassword123!" before `pnpm test:e2e` can run
- **Docker daemon:** Must be running for local PostgreSQL (`docker-compose up -d`)

## Key Decisions

Full decision log in PROJECT.md (D1–D38). Most recent:

- **D38 (15-03):** TopBar displays email instead of role — Better Auth user.roles is string[] (technical), email more user-friendly for identity confirmation
- **D37 (15-01):** Flexible AWS region validation — Use z.string().min(1) instead of regex for AWS_REGION to allow dev/test flexibility while production enforces ap-south-1 via IaC

Architecture-critical ones:

- **Multi-tenancy:** PostgreSQL RLS — tenant isolation at DB level
- **Auth:** Better Auth (not NextAuth.js) — better Next.js 16 support
- **DAL pattern:** server-only → getRequiredSession → prismaForTenant → WHERE tenantId → runtime assertion
- **Observations:** Bottom-up atoms; all macro views derived by aggregation
- **Infrastructure:** S3 (immutable evidence), SES Mumbai (email), React-PDF (board reports)
- **Data locality:** AWS Mumbai (ap-south-1)

## Session Continuity

Last session: 2026-02-11
Completed Phase 15 Plan 03 (TopBar Session Integration). Replaced hardcoded currentUser with Better Auth session in top-bar.tsx. Deleted src/lib/current-user.ts. TopBar now shows real authenticated user with working sign-out. One task commit (82c935f). Ready for 15-04.

---

_State initialized: 2026-02-07_
_Last updated: 2026-02-11_
