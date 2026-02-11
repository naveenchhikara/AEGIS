# Roadmap: AEGIS

## Milestones

- ✅ **v1.0 Clickable Prototype** — Phases 1-4 (shipped 2026-02-08)
- ✅ **v2.0 Working Core MVP** — Phases 5-14 (shipped 2026-02-10)
- 🚧 **v2.1 Production Readiness** — Phases 15-16 (gap closure)

## Completed Phases

<details>
<summary>✅ v1.0 Clickable Prototype (Phases 1-4) — SHIPPED 2026-02-08</summary>

- [x] Phase 1: Project Setup & Demo Data (4/4 plans)
- [x] Phase 2: Core Screens (6/6 plans)
- [x] Phase 3: Finding Management & Reports (5/5 plans)
- [x] Phase 4: Polish & Deploy (8/8 plans)

</details>

<details>
<summary>✅ v2.0 Working Core MVP (Phases 5-10) — SHIPPED 2026-02-10</summary>

- [x] Phase 5: Foundation & Migration (6/6 plans) — Multi-tenant PostgreSQL, Better Auth, RBAC, audit logging
- [x] Phase 6: Observation Lifecycle (7/7 plans) — 7-state workflow, maker-checker, repeat detection
- [x] Phase 7: Auditee Portal & Evidence (8/8 plans) — Branch-scoped portal, S3 uploads, immutable responses
- [x] Phase 8: Notifications & Reports (6/6 plans) — Email via SES, PDF board reports, Excel exports
- [x] Phase 9: Dashboards (5/5 plans) — 5 role-based dashboards with real-time aggregation
- [x] Phase 10: Onboarding & Compliance (8/8 plans) — Guided wizard, RBI checklists, Excel org upload

</details>

<details>
<summary>✅ v2.0 Gap Closure (Phases 11-14) — COMPLETE 2026-02-10</summary>

- [x] Phase 11: Auth Security Hardening (1/1 plans) — Rate limiting, account lockout, session limits
- [x] Phase 12: Dashboard Data Pipeline (2/2 plans) — Historical snapshots, engagement tracking, repeat findings
- [x] Phase 13: Onboarding Persistence & Excel (2/2 plans) — Server-side save, Excel template upload
- [x] Phase 14: Verification & Prod Readiness (5/5 plans) — VERIFICATION.md for all phases, Playwright E2E, final re-audit

</details>

## Active Phases

### Phase 15: Production Hardening

**Goal:** Eliminate code-level tech debt items identified in v2.0 milestone audit to improve production reliability and maintainability.

**Gap Closure:** Addresses v2.0-MILESTONE-AUDIT.md tech debt:

- Centralized environment variable validation (prevent misconfiguration)
- Structured logging framework (enable production debugging)
- Legacy `currentUser` cleanup (remove demo data dependency)
- Legacy demo JSON isolation (seed-only, not runtime)

**Plans:** 4 plans (2 waves)

Plans:

- [ ] 15-01-PLAN.md — Environment variable validation with T3 Env + Zod
- [ ] 15-02-PLAN.md — Pino structured logging framework
- [ ] 15-03-PLAN.md — Legacy currentUser removal (Better Auth session)
- [ ] 15-04-PLAN.md — Demo JSON migration to seed directory

### Phase 16: CI/CD Pipeline

**Goal:** Automate testing and deployment to prevent regressions and enable confident production updates.

**Gap Closure:** Addresses v2.0-MILESTONE-AUDIT.md tech debt:

- Manual deployment risk (no automated testing before deploy)
- No pre-merge validation (lint, type-check, build)
- Manual Coolify dashboard deploy process

**Tasks:**

1. Create GitHub Actions workflow (lint, type-check, build, E2E tests)
2. Configure auto-deploy trigger to Coolify on push to main
3. Add branch protection rules (require CI pass before merge)

## Progress

| Phase                           | Milestone | Plans Complete | Status   | Completed  |
| ------------------------------- | --------- | -------------- | -------- | ---------- |
| 1. Project Setup & Demo Data    | v1.0      | 4/4            | Complete | 2026-02-07 |
| 2. Core Screens                 | v1.0      | 6/6            | Complete | 2026-02-08 |
| 3. Finding Management & Reports | v1.0      | 5/5            | Complete | 2026-02-08 |
| 4. Polish & Deploy              | v1.0      | 8/8            | Complete | 2026-02-08 |
| 5. Foundation & Migration       | v2.0      | 6/6            | Complete | 2026-02-09 |
| 6. Observation Lifecycle        | v2.0      | 7/7            | Complete | 2026-02-09 |
| 7. Auditee Portal & Evidence    | v2.0      | 8/8            | Complete | 2026-02-09 |
| 8. Notifications & Reports      | v2.0      | 6/6            | Complete | 2026-02-09 |
| 9. Dashboards                   | v2.0      | 5/5            | Complete | 2026-02-09 |
| 10. Onboarding & Compliance     | v2.0      | 8/8            | Complete | 2026-02-10 |
| 11. Auth Security Hardening     | v2.0 fix  | 1/1            | Complete | 2026-02-10 |
| 12. Dashboard Data Pipeline     | v2.0 fix  | 2/2            | Complete | 2026-02-10 |
| 13. Onboarding Persistence      | v2.0 fix  | 2/2            | Complete | 2026-02-10 |
| 14. Verification & Prod Ready   | v2.0 fix  | 5/5            | Complete | 2026-02-10 |
| 15. Production Hardening        | v2.1      | 0/4            | Planned  | —          |
| 16. CI/CD Pipeline              | v2.1      | 0/3            | Pending  | —          |

---

_Roadmap created: February 7, 2026_
_Updated: February 11, 2026 — v2.1 gap closure phases added_
