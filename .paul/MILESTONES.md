# Milestones

Completed milestone log for this project.

| Milestone               | Completed  | Duration | Stats             |
| ----------------------- | ---------- | -------- | ----------------- |
| v5.0 Pilot Readiness    | 2026-02-22 | 2 days   | 3 phases, 8 plans |
| v4.0 Platform Hardening | 2026-02-21 | 1 day    | 5 phases, 8 plans |

---

## v5.0 Pilot Readiness

**Completed:** 2026-02-22
**Duration:** 2 days (8 plans across 3 phases)

### Stats

| Metric        | Value |
| ------------- | ----- |
| Phases        | 3     |
| Plans         | 8     |
| Files changed | ~30   |
| Issues found  | 23    |
| Issues fixed  | 23    |

### Key Accomplishments

- **E2E Audit Flow Tested:** Complete audit lifecycle (RAM → Planning → Execution → Findings → Compliance → Board Report) tested with 23 issues documented
- **All 23 Issues Resolved:** 3 P0 blockers, 7 P1 critical, 8 P2 moderate, 5 P3 minor — all fixed across 5 bug fix plans
- **Missing Pages Created:** /audit-execution index page with status summary, /admin hub page with section cards
- **Observation Lifecycle Wired:** ComplianceItem auto-creation on ISSUED transition, engagement status transitions (PLANNED → IN_PROGRESS → COMPLETED)
- **Navigation CTAs Added:** RAM → Audit Planning, Plans → Engagements, Finding → Compliance, Compliance → Findings/Governance cross-links
- **Dashboard NaN Fixed:** 24 fields across 5 functions hardened with null coalescing for PostgreSQL null aggregates
- **Dashboard Widgets Cleaned:** Removed 3 broken trend widgets, wired CCO compliance widget to real data
- **Infrastructure Added:** Loading skeleton, dashboard error boundary with Sentry, branded 404 page
- **Layout Standardized:** ACE/ACB pages aligned to standard dashboard layout, sidebar icons differentiated
- **Documentation Accurate:** CLAUDE.md Known Issues pruned from 5 to 3 genuine remaining items

### Key Decisions

| Decision                                     | Rationale                                                     |
| -------------------------------------------- | ------------------------------------------------------------- |
| Discovery-only Phase 1 (no code changes)     | Clean separation of finding issues vs fixing them             |
| ISS-002 compliance lifecycle is correct      | Reclassified as false positive — lifecycle actually works     |
| Engagement transitions are manual            | PLANNED → IN_PROGRESS is user action, not automatic           |
| Escalation level/status are independent      | Level = urgency, status = workflow position                   |
| Remove broken widgets over placeholder cards | No historical data for trends; "coming soon" looks incomplete |
| ShieldCheck for Risk Management sidebar      | Visual distinction from Compliance's Shield icon              |

### Deferred Items

- External uptime monitoring — user chose to skip
- recharts lazy loading (~1 MB bundle savings)
- SES sandbox mode — production email access pending
- Trend chart widgets — need historical data snapshot system

---

## v4.0 Platform Hardening

**Completed:** 2026-02-21
**Duration:** 1 day (8 plans across 5 phases)

### Stats

| Metric        | Value |
| ------------- | ----- |
| Phases        | 5     |
| Plans         | 8     |
| Files changed | 63    |
| Commits       | 8     |

### Key Accomplishments

- **Backup & DR:** Automated PostgreSQL backup with S3 offsite storage, restore procedure, and DR runbook
- **Security Headers:** CSP, HSTS, Permissions-Policy, X-Frame-Options on all routes
- **Docker Hardening:** cap_drop ALL, no-new-privileges, read_only filesystem, resource limits
- **Dependency Scanning:** pnpm audit in CI pipeline + Dependabot for automated PRs
- **Unit Tests:** 108 tests (permissions, risk-rating, state-machine) with coverage reporting in CI
- **E2E Infrastructure:** Playwright + PostgreSQL service container in GitHub Actions (advisory mode)
- **Error Tracking:** Sentry SDK for client/server/edge with graceful degradation
- **Request ID Propagation:** x-request-id header on all requests via Edge middleware
- **Enhanced Health Checks:** Database, pg-boss, and memory subsystem monitoring with three-tier status
- **Bundle Analysis:** @next/bundle-analyzer installed, 10.6 MB client baseline documented

### Key Decisions

| Decision                                     | Rationale                                    |
| -------------------------------------------- | -------------------------------------------- |
| Shell script + cron over pg-boss for backups | Simpler ops, no app dependency               |
| S3 upload optional with graceful fallback    | Scripts work without AWS credentials         |
| CSP unsafe-inline for styles                 | Required for Tailwind/Radix UI compatibility |
| cap_drop ALL on app, not postgres            | Postgres needs process capabilities          |
| Security audit advisory, not blocking        | Visibility without deploy friction           |
| Unit tests block deploy in CI                | Test failures prevent production push        |
| E2E tests advisory, not blocking             | Stabilize before gating deploys              |
| Sentry DSN optional (like S3/SES pattern)    | App works without error tracking configured  |
| Low Sentry sample rate (0.1)                 | Stay within free tier limits                 |
| Three-tier health status (ok/degraded/error) | Docker only restarts on critical failure     |
| PM2 clustering dropped                       | Docker standalone deployment, not PM2        |
| API caching deferred                         | Premature for pilot (< 50 users)             |

### Deferred Items

- External uptime monitoring (user will configure separately)
- recharts lazy loading (~1 MB client savings)
- Load testing (not needed for pilot scale)

---
