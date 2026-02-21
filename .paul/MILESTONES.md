# Milestones

Completed milestone log for this project.

| Milestone               | Completed  | Duration | Stats             |
| ----------------------- | ---------- | -------- | ----------------- |
| v4.0 Platform Hardening | 2026-02-21 | 1 day    | 5 phases, 8 plans |

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
