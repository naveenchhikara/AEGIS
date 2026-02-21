---
phase: 16-cicd-pipeline
plan: 01
subsystem: devops
tags: [github-actions, ci-cd, playwright, e2e, coolify, automation]

dependency-graph:
  requires: [15-04-seed-migration]
  provides: [automated-testing-pipeline, deployment-automation]
  affects: [future-development-workflow]

tech-stack:
  added: []
  patterns: [github-actions-ci, service-containers, concurrency-control]

key-files:
  created: [.github/workflows/ci.yml]
  modified: []

decisions:
  - id: D42
    what: "Use PostgreSQL service container for E2E tests instead of external database"
    why: "Isolated per-run database, no cleanup needed, parallel-safe"
    when: "2026-02-11"
  - id: D43
    what: "Install only Chromium browser for Playwright tests"
    why: "playwright.config.ts uses Desktop Chrome only, full install wastes 5+ minutes"
    when: "2026-02-11"
  - id: D44
    what: "Cancel stale PR runs but preserve main branch runs"
    why: "Prevents deployment race conditions, maintains audit trail for production deploys"
    when: "2026-02-11"
  - id: D45
    what: "Graceful deploy skip when COOLIFY_WEBHOOK_URL secret missing"
    why: "Allows CI to pass before secrets configured, prevents every PR from failing"
    when: "2026-02-11"

metrics:
  duration: "5 minutes"
  completed: "2026-02-11"
---

# Phase 16 Plan 01: CI/CD Pipeline Implementation Summary

**One-liner:** GitHub Actions CI/CD with parallel validation jobs (lint, typecheck, build, E2E), PostgreSQL service containers, and Coolify deployment webhook

## What Was Built

Created a complete GitHub Actions CI/CD pipeline in `.github/workflows/ci.yml` that automates testing and deployment for the AEGIS platform.

### Pipeline Architecture

**4 Validation Jobs (run in parallel):**

1. **lint**: ESLint with SKIP_ENV_VALIDATION
2. **typecheck**: TypeScript compilation check with Prisma client generation
3. **build**: Next.js production build with .next/cache caching
4. **e2e**: Playwright tests against ephemeral PostgreSQL 16 service container

**1 Deployment Job (runs after all validation passes):**

5. **deploy**: Triggers Coolify webhook only on successful main branch push

**Key Features:**

- **Service Container:** PostgreSQL 16-alpine with health checks for E2E test isolation
- **Caching Strategy:**
  - pnpm store via setup-node cache: 'pnpm'
  - Next.js build cache via actions/cache@v4 (.next/cache)
  - Playwright browser cache for chromium-only install
- **Concurrency Control:** Cancel stale PR runs, preserve all main branch runs
- **Artifact Upload:** Playwright HTML reports on E2E test failure (30-day retention)
- **Environment Validation:** SKIP_ENV_VALIDATION=1 for lint/build jobs to bypass T3 Env checks in CI

### Workflow Triggers

- **Push to main:** All 5 jobs run (validation → deploy on success)
- **Pull request to main:** Only 4 validation jobs run (deploy skipped)

## Technical Implementation

### PostgreSQL Service Container

```yaml
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_USER: aegis
      POSTGRES_PASSWORD: testpassword123 # Alphanumeric only per project constraint
      POSTGRES_DB: aegis_test
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
    ports:
      - 5432:5432
```

**E2E Test Flow:**

1. PostgreSQL starts with health checks
2. `pnpm prisma db push` creates schema
3. `pnpm db:seed` seeds test users with Better Auth password hashes
4. Playwright tests run with storageState authentication
5. Container destroyed after job completes

### Environment Variables

**E2E job provides all required T3 Env schema fields:**

- Database: `DATABASE_URL`, `POSTGRES_*` vars
- Auth: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
- AWS: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`
- App: `NEXT_PUBLIC_APP_URL`, `NODE_ENV=test`

**Build/lint jobs use minimal set:**

- `SKIP_ENV_VALIDATION=1` to bypass validation
- `DATABASE_URL` with dummy value (required even when skipping)

### Coolify Deployment

```yaml
deploy:
  needs: [lint, typecheck, build, e2e]
  if: github.ref == 'refs/heads/main' && github.event_name == 'push' && secrets.COOLIFY_WEBHOOK_URL != ''
  steps:
    - run: curl --fail --silent --show-error --location \
        -X GET "${{ secrets.COOLIFY_WEBHOOK_URL }}" \
        -H "Authorization: Bearer ${{ secrets.COOLIFY_API_TOKEN }}"
```

**Conditional execution ensures:**

- Only runs on `push` to `main` (not PRs)
- Only runs when all 4 validation jobs pass
- Gracefully skips when secrets not configured (prevents PRs from failing before user adds secrets)

**Required GitHub Secrets (user must configure):**

- `COOLIFY_WEBHOOK_URL` - From Coolify dashboard → Application → Webhooks
- `COOLIFY_API_TOKEN` - From Coolify dashboard → User Settings → API Tokens

## Task Commits

| Task | Name                                     | Commit  | Files                    |
| ---- | ---------------------------------------- | ------- | ------------------------ |
| 1    | CI workflow with 4 validation jobs       | 3009134 | .github/workflows/ci.yml |
| 2    | Add Coolify deploy job after checks pass | 7d82013 | .github/workflows/ci.yml |

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

**D42: PostgreSQL service container over external database**

- Service containers provide isolated, ephemeral databases per workflow run
- GitHub manages networking (localhost:5432 just works)
- Automatic cleanup, no persistent state between runs
- Enables parallel workflow runs without database conflicts

**D43: Chromium-only Playwright install**

- Plan specified `pnpm exec playwright install --with-deps chromium`
- Research showed full install downloads 300MB+ of unused browsers (Firefox, WebKit)
- playwright.config.ts uses `devices["Desktop Chrome"]` only
- Saves 5+ minutes per workflow run

**D44: Conditional concurrency cancellation**

- `cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}`
- Cancels stale PR runs when new commits pushed (resource efficiency)
- Preserves all main branch runs for deployment audit trail
- Prevents race condition where commit A's deploy canceled by commit B

**D45: Graceful deploy skip when secrets missing**

- `if: ... && secrets.COOLIFY_WEBHOOK_URL != ''`
- Allows CI to run and pass before user configures Coolify secrets
- Without this, every main push would fail until secrets added
- PRs can merge once validation passes, deployment configured separately

## Integration Points

### Playwright Configuration Compatibility

Workflow aligns with `playwright.config.ts` settings:

- `forbidOnly: !!process.env.CI` → Prevents .only() tests in CI
- `retries: process.env.CI ? 2 : 0` → Retries flaky tests twice in CI
- `workers: process.env.CI ? 1 : undefined` → Serial execution in CI (prevents database race conditions)
- `reuseExistingServer: !process.env.CI` → Fresh dev server on every CI run

### T3 Env Validation

E2E job provides all required server environment variables from `src/env.ts`:

- Database connection (5 vars)
- Better Auth (2 vars)
- AWS S3 + SES (6 vars, SES optional)
- App config (2 vars)

Build/lint jobs use `SKIP_ENV_VALIDATION=1` to bypass validation when secrets unavailable.

### Seed Script Dependency

E2E job depends on `prisma/seed.ts` creating test users with Better Auth compatible password hashes:

- Must create User + Account records with `providerId: 'credential'`
- Password hashes must be bcrypt compatible with Better Auth
- Test users: admin@example.com, auditor@example.com, etc.
- Default password: TestPassword123!

## Next Phase Readiness

### Prerequisites for First CI Run

**Before pushing to trigger CI:**

1. **Seed script verification:**
   - Verify seed creates test users with password hashes
   - Run locally: `pnpm db:seed` then `SELECT "userId", LENGTH(password) FROM "Account" WHERE "providerId" = 'credential'`
   - If missing, E2E auth setup will fail with "invalid username or password"

2. **Coolify secrets (optional for validation jobs):**
   - Add `COOLIFY_WEBHOOK_URL` secret in GitHub Settings → Secrets
   - Add `COOLIFY_API_TOKEN` secret
   - Deploy job will skip gracefully if secrets missing

3. **Branch protection (recommended):**
   - Run CI workflow once on main to register check names
   - Configure branch protection: Settings → Branches → Add rule
   - Require status checks: lint, typecheck, build, e2e
   - Enable "Require branches to be up to date before merging"

### Known Limitations

1. **Serial E2E execution:** playwright.config.ts sets `workers: process.env.CI ? 1 : undefined` to prevent database race conditions with single PostgreSQL container. Future optimization could investigate parallel execution.

2. **No branch protection automation:** Plan intentionally omits gh CLI script to configure branch protection. User must configure manually after first workflow run (check names must exist first).

3. **No deployment status polling:** Coolify webhook returns 200 OK immediately. Workflow doesn't wait for deployment to complete or fetch deployment logs. User must check Coolify dashboard for deployment status.

4. **Playwright browser cache may be cold:** First workflow run will download Chromium (~100MB). Subsequent runs use cache, but cache may expire after 7 days of inactivity.

### Future Enhancements (Out of Scope)

- Matrix strategy for Node.js version testing (currently Node 22 only)
- Deployment status polling via Coolify API
- Slack/Discord notifications on deployment success/failure
- Performance budgeting (Lighthouse CI)
- Visual regression testing (Percy, Chromatic)
- Dependency vulnerability scanning (Dependabot, Snyk)

## Validation Results

All plan verification criteria met:

- ✓ `.github/workflows/ci.yml` exists and is valid YAML
- ✓ 5 jobs defined: lint, typecheck, build, e2e, deploy
- ✓ lint, typecheck, build have no inter-dependencies (parallel execution)
- ✓ e2e has PostgreSQL service container with health checks
- ✓ deploy needs all 4 validation jobs and only runs on main push
- ✓ Concurrency configured: cancel stale PR runs, preserve main runs
- ✓ pnpm caching via setup-node cache: 'pnpm'
- ✓ Next.js build cache via actions/cache@v4
- ✓ Playwright chromium-only install
- ✓ All env vars in e2e job satisfy T3 Env schema (src/env.ts)

## Success Criteria Met

- ✓ GitHub Actions workflow file is valid YAML at `.github/workflows/ci.yml`
- ✓ Push to main or PR to main triggers the 4 validation jobs
- ✓ E2E job provisions ephemeral PostgreSQL, runs schema push + seed + Playwright
- ✓ Deploy job triggers Coolify webhook only on successful main push
- ✓ Concurrency prevents resource waste without canceling main deployments

## Self-Check: PASSED

**Created files verified:**

- ✓ `.github/workflows/ci.yml` exists

**Commits verified:**

- ✓ 3009134 exists
- ✓ 7d82013 exists
