# Phase 16: CI/CD Pipeline - Research

**Researched:** 2026-02-11
**Domain:** GitHub Actions CI/CD, Next.js 16, Playwright E2E, Coolify deployment
**Confidence:** HIGH

## Summary

This phase implements a GitHub Actions CI/CD pipeline for AEGIS that automates testing and deployment. The pipeline runs lint checks, type-checking, builds, and Playwright E2E tests on every pull request and push to main. After successful validation on main, it triggers automatic deployment to Coolify via webhook.

The project already has the foundation in place: Dockerfile with multi-stage builds, docker-compose.yml for PostgreSQL, Playwright E2E test suite with auth setup, pnpm as package manager, and T3 Env with SKIP_ENV_VALIDATION for Docker builds. This phase connects these components into an automated pipeline with branch protection to prevent regressions.

**Primary recommendation:** Use GitHub Actions with pnpm caching, PostgreSQL service containers for E2E tests, and Coolify's deploy webhook for production deployment. Enable branch protection rules requiring CI to pass before merge.

## Standard Stack

### Core

| Library               | Version   | Purpose             | Why Standard                                                                         |
| --------------------- | --------- | ------------------- | ------------------------------------------------------------------------------------ |
| GitHub Actions        | Native    | CI/CD orchestration | Native GitHub integration, free for public repos, robust caching, service containers |
| pnpm/action-setup     | v4        | pnpm installation   | Official pnpm action with built-in caching support                                   |
| actions/setup-node    | v4        | Node.js + caching   | Native pnpm cache support via `cache: 'pnpm'`                                        |
| actions/cache         | v4        | Next.js build cache | Caches `.next/cache` for faster builds                                               |
| playwright/playwright | 1.58.2    | E2E testing         | Project already using Playwright with auth setup                                     |
| postgres              | 16-alpine | Database for tests  | Service container for E2E test isolation                                             |

### Supporting

| Library                 | Version | Purpose            | When to Use                                             |
| ----------------------- | ------- | ------------------ | ------------------------------------------------------- |
| actions/upload-artifact | v4      | Test report upload | Upload Playwright HTML reports and traces for debugging |
| gh CLI                  | 2.x     | Branch protection  | Programmatically configure branch protection rules      |
| Coolify webhook         | v4      | Deployment trigger | Trigger Coolify deployment after CI passes              |

### Alternatives Considered

| Instead of         | Could Use            | Tradeoff                                                                                   |
| ------------------ | -------------------- | ------------------------------------------------------------------------------------------ |
| GitHub Actions     | GitLab CI / CircleCI | GitHub Actions is free for public repos, native integration with GitHub, no setup overhead |
| Service containers | Docker Compose in CI | Service containers are simpler, no docker-compose needed, GitHub manages networking        |
| Coolify webhook    | Manual deployment    | Webhook enables continuous deployment, eliminates human error                              |

**Installation:**

```bash
# No package installation needed - GitHub Actions uses YAML workflows
# pnpm already in package.json devDependencies
# Playwright already installed: @playwright/test@^1.58.2
```

## Architecture Patterns

### Recommended Project Structure

```
.github/
├── workflows/
│   └── ci.yml              # Main CI/CD workflow
.planning/phases/16-cicd-pipeline/
├── 16-RESEARCH.md          # This document
└── 16-01-PLAN.md           # Implementation plan (created by planner)
```

### Pattern 1: Multi-Job CI Pipeline

**What:** Separate jobs for linting, type-checking, building, and E2E tests with dependency orchestration.

**When to use:** All projects with multiple validation stages. Allows parallel execution where possible, sequential where required.

**Example:**

```yaml
# Source: GitHub Actions best practices + Next.js CI patterns
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

# Prevent concurrent deployments on main
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - run: pnpm prisma generate
      - run: pnpm tsc --noEmit

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "pnpm"

      # Cache Next.js build output
      - uses: actions/cache@v4
        with:
          path: |
            ~/.npm
            ${{ github.workspace }}/.next/cache
          key: ${{ runner.os }}-nextjs-${{ hashFiles('**/pnpm-lock.yaml') }}-${{ hashFiles('**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx') }}
          restore-keys: |
            ${{ runner.os }}-nextjs-${{ hashFiles('**/pnpm-lock.yaml') }}-

      - run: pnpm install --frozen-lockfile
      - run: pnpm prisma generate
      - run: pnpm build
        env:
          SKIP_ENV_VALIDATION: 1
          DATABASE_URL: postgresql://ci:ci@localhost:5432/ci

  e2e:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: aegis
          POSTGRES_PASSWORD: testpassword
          POSTGRES_DB: aegis_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "pnpm"

      - run: pnpm install --frozen-lockfile
      - run: pnpm prisma generate
      - run: pnpm prisma db push
        env:
          DATABASE_URL: postgresql://aegis:testpassword@localhost:5432/aegis_test

      - run: pnpm prisma db seed
        env:
          DATABASE_URL: postgresql://aegis:testpassword@localhost:5432/aegis_test

      - run: npx playwright install --with-deps chromium

      - run: pnpm test:e2e
        env:
          DATABASE_URL: postgresql://aegis:testpassword@localhost:5432/aegis_test
          BETTER_AUTH_SECRET: test_secret_32_characters_long
          BETTER_AUTH_URL: http://localhost:3000
          AWS_REGION: ap-south-1
          AWS_ACCESS_KEY_ID: test
          AWS_SECRET_ACCESS_KEY: test
          S3_BUCKET_NAME: test-bucket
          NEXT_PUBLIC_APP_URL: http://localhost:3000
          NODE_ENV: test

      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

### Pattern 2: Coolify Webhook Deployment

**What:** Trigger Coolify deployment after CI passes on main branch using webhook.

**When to use:** Production deployments that should only happen after automated tests pass.

**Example:**

```yaml
# Source: Coolify documentation - https://coolify.io/docs/applications/ci-cd/github/auto-deploy
deploy:
  runs-on: ubuntu-latest
  needs: [lint, typecheck, build, e2e]
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'

  steps:
    - name: Trigger Coolify deployment
      run: |
        curl -X GET "${{ secrets.COOLIFY_WEBHOOK_URL }}" \
          -H "Authorization: Bearer ${{ secrets.COOLIFY_API_TOKEN }}"
```

### Pattern 3: Concurrency Control

**What:** Prevent multiple concurrent CI runs on the same branch, cancel outdated runs on PRs.

**When to use:** All workflows to prevent resource waste and ensure latest code is tested.

**Example:**

```yaml
# Source: GitHub Actions concurrency documentation
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}
```

This cancels in-progress runs on PRs when new commits are pushed, but preserves all runs on main (for audit trail and deployment tracking).

### Anti-Patterns to Avoid

- **Running E2E tests on every job:** Playwright tests are slow and expensive. Run them once in a dedicated job, not per-role as previously configured. The project already fixed this in playwright.config.ts.

- **No PostgreSQL health checks:** Service containers must have health checks or tests will start before the database is ready, causing flaky failures.

- **Caching node_modules:** With pnpm, cache the pnpm store (handled by setup-node) not node_modules. Caching node_modules can cause version mismatch issues.

- **Missing SKIP_ENV_VALIDATION:** Next.js build will fail in CI without all production secrets. Set SKIP_ENV_VALIDATION=1 for build job (T3 Env already configured).

- **No build cache:** Without caching .next/cache, every build is full rebuild. Add actions/cache for .next/cache as shown in Pattern 1.

- **Exposing secrets in logs:** Never echo secrets or DATABASE_URLs containing passwords. GitHub Actions masks registered secrets but not constructed strings.

## Don't Hand-Roll

| Problem                    | Don't Build                     | Use Instead                        | Why                                                    |
| -------------------------- | ------------------------------- | ---------------------------------- | ------------------------------------------------------ |
| Branch protection rules    | Manual GitHub UI clicks         | gh CLI with REST API               | Reproducible, version-controlled configuration         |
| PostgreSQL test database   | External managed database       | Service containers                 | Isolated per-run, no cleanup needed, parallel-safe     |
| Playwright browser caching | Custom cache logic              | npx playwright install --with-deps | Official caching strategy, handles system dependencies |
| pnpm store caching         | actions/cache with manual paths | setup-node with cache: 'pnpm'      | Official integration, handles lock file hashing        |
| Next.js build caching      | Custom .next cache logic        | actions/cache with .next/cache     | Official pattern from Next.js docs                     |
| Deployment webhooks        | Custom HTTP client              | curl with Authorization header     | Simple, no dependencies, works everywhere              |

**Key insight:** GitHub Actions ecosystem has mature, official actions for all common tasks. Using official actions provides better caching, automatic updates, and community-tested reliability. Custom solutions accumulate edge cases (file permissions, cache invalidation, race conditions) that official actions already handle.

## Common Pitfalls

### Pitfall 1: Service Container Port Mapping

**What goes wrong:** Tests connect to localhost:5432 but PostgreSQL service runs in different container. Connection refused.

**Why it happens:** GitHub Actions service containers run in isolated network. Port mapping differs between container/host contexts.

**How to avoid:** Use `ports: - 5432:5432` in service definition AND connect to `localhost:5432` in tests (not postgres:5432). GitHub maps service port to host.

**Warning signs:** Tests fail with "connection refused" or "could not connect to server" despite service container being healthy.

### Pitfall 2: Playwright Browser Installation Time

**What goes wrong:** Job times out or takes 5+ minutes just installing browsers.

**Why it happens:** `playwright install --with-deps` downloads ~300MB of browser binaries + system dependencies on every run.

**How to avoid:** Use `npx playwright install --with-deps chromium` to install only Chromium (tests use Desktop Chrome per playwright.config.ts). Full install is unnecessary.

**Warning signs:** CI job "Install Playwright browsers" step takes >2 minutes. Logs show downloading multiple browsers.

### Pitfall 3: Prisma Generate Timing

**What goes wrong:** Build or test fails with "Cannot find module '@prisma/client'" or type errors on Prisma models.

**Why it happens:** Prisma Client must be generated before TypeScript compilation or runtime use. It's a build-time code generation step.

**How to avoid:** Run `pnpm prisma generate` immediately after `pnpm install --frozen-lockfile` in every job that builds or runs the app.

**Warning signs:** Module not found errors for @prisma/client, type errors on Prisma models that work locally.

### Pitfall 4: SKIP_ENV_VALIDATION Misunderstanding

**What goes wrong:** CI build fails with "Missing environment variable: AWS_ACCESS_KEY_ID" even though validation should be skipped.

**Why it happens:** SKIP_ENV_VALIDATION must be set before Next.js config loads. Setting in GitHub Actions env block happens too late if env.ts imports first.

**How to avoid:** Set SKIP_ENV_VALIDATION=1 in `env:` block of build step AND provide dummy DATABASE_URL (T3 Env validates URL format even when skipping).

**Warning signs:** Build logs show environment validation errors despite SKIP_ENV_VALIDATION being set.

### Pitfall 5: Concurrency Cancellation on Main

**What goes wrong:** Deployment from commit A is canceled when commit B pushes to main, leaving production on stale version.

**Why it happens:** Default `cancel-in-progress: true` cancels ALL in-progress runs, including production deployments.

**How to avoid:** Use conditional cancellation: `cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}` to preserve main branch runs.

**Warning signs:** GitHub Actions shows canceled workflow runs on main branch. Production version doesn't match latest main commit.

### Pitfall 6: Seed Data in CI

**What goes wrong:** E2E tests fail with "invalid username or password" even though credentials are correct.

**Why it happens:** Seed script doesn't create test users, or creates them without Better Auth compatible password hashes.

**How to avoid:** Ensure `prisma/seed.ts` creates test users with bcrypt hashes. Verify seed ran successfully with query: `SELECT "userId", LENGTH(password) FROM "Account" WHERE "providerId" = 'credential'`

**Warning signs:** Auth setup test fails, login tests fail with 401, database has User records but no Account records with credential provider.

### Pitfall 7: Branch Protection Timing

**What goes wrong:** PR is mergeable before CI completes. Developer merges failing code.

**Why it happens:** Branch protection rule added but status checks not selected as required, or check names don't match workflow job names.

**How to avoid:** Run CI workflow at least once to register check names, THEN configure branch protection to require those specific checks. Use exact job names from workflow YAML.

**Warning signs:** GitHub shows "All checks have passed" on PR before CI completes. Merge button enabled while CI runs.

## Code Examples

Verified patterns from official sources:

### PostgreSQL Service Container with Health Checks

```yaml
# Source: GitHub Actions service containers documentation
# https://docs.github.com/en/actions/using-containerized-services/creating-postgresql-service-containers
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_USER: aegis
      POSTGRES_PASSWORD: testpassword
      POSTGRES_DB: aegis_test
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
    ports:
      - 5432:5432
```

### pnpm Setup with Node.js Caching

```yaml
# Source: pnpm CI documentation
# https://pnpm.io/continuous-integration
- name: Install pnpm
  uses: pnpm/action-setup@v4
  with:
    version: 10

- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: 22
    cache: "pnpm"

- name: Install dependencies
  run: pnpm install --frozen-lockfile
```

### Next.js Build Cache Configuration

```yaml
# Source: Next.js CI caching documentation
# https://nextjs.org/docs/app/guides/ci-build-caching
- name: Cache Next.js build output
  uses: actions/cache@v4
  with:
    path: |
      ~/.npm
      ${{ github.workspace }}/.next/cache
    key: ${{ runner.os }}-nextjs-${{ hashFiles('**/pnpm-lock.yaml') }}-${{ hashFiles('**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx') }}
    restore-keys: |
      ${{ runner.os }}-nextjs-${{ hashFiles('**/pnpm-lock.yaml') }}-
```

### Playwright Test with Artifact Upload

```yaml
# Source: Playwright CI documentation
# https://playwright.dev/docs/ci-intro
- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium

- name: Run Playwright tests
  run: pnpm test:e2e

- name: Upload test report
  uses: actions/upload-artifact@v4
  if: failure()
  with:
    name: playwright-report
    path: playwright-report/
    retention-days: 30
```

### Coolify Webhook Deployment Trigger

```yaml
# Source: Coolify deployment webhook documentation
# https://coolify.io/docs/applications/ci-cd/github/auto-deploy
- name: Trigger Coolify deployment
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
  run: |
    curl -X GET "${{ secrets.COOLIFY_WEBHOOK_URL }}" \
      -H "Authorization: Bearer ${{ secrets.COOLIFY_API_TOKEN }}"
```

### Branch Protection Rule via gh CLI

```yaml
# Source: GitHub CLI API documentation + community examples
# https://docs.github.com/en/rest/branches/branch-protection
- name: Configure branch protection
  run: |
    gh api -X PUT "repos/${{ github.repository }}/branches/main/protection" \
      --input - <<EOF
    {
      "required_status_checks": {
        "strict": true,
        "contexts": ["lint", "typecheck", "build", "e2e"]
      },
      "enforce_admins": true,
      "required_pull_request_reviews": null,
      "restrictions": null
    }
    EOF
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## State of the Art

| Old Approach           | Current Approach               | When Changed | Impact                                                                    |
| ---------------------- | ------------------------------ | ------------ | ------------------------------------------------------------------------- |
| npm/yarn               | pnpm                           | 2021+        | 3x faster installs, strict dependency resolution, better monorepo support |
| Manual browser install | playwright install --with-deps | 2020+        | Automated system dependency installation, no manual apt-get               |
| Docker Compose in CI   | Service containers             | 2019+        | Simpler YAML, GitHub manages networking, automatic cleanup                |
| .npmrc caching         | setup-node cache: 'pnpm'       | 2022+        | Built-in cache key management, no manual cache path configuration         |
| Separate cache action  | setup-node built-in cache      | 2021+        | One less action to maintain, automatic lockfile hash detection            |
| Turborepo cache        | Turbopack filesystem cache     | 2024+        | Turbopack is now default in Next.js 16, requires experimental flags       |

**Deprecated/outdated:**

- **actions/setup-node@v2:** Use v4 for better caching and Node.js 22 support
- **Ubuntu-20.04 runners:** GitHub deprecated, use ubuntu-latest (currently 22.04)
- **node_modules caching with pnpm:** pnpm uses store, not node_modules. Use cache: 'pnpm' in setup-node
- **Playwright action (microsoft/playwright-github-action):** Use playwright install --with-deps directly per official docs
- **Manual Next.js cache implementation:** Use official pattern from Next.js docs with actions/cache@v4
- **save-state/set-output commands:** GitHub deprecated. Use $GITHUB_OUTPUT file instead (not relevant for AEGIS workflow)

## Project-Specific Context

### Existing Foundation

The AEGIS project already has key CI/CD prerequisites:

1. **Dockerfile:** Multi-stage production build (deps → builder → runner) with standalone output
2. **docker-compose.yml:** PostgreSQL 16 service with health checks
3. **Playwright E2E tests:** 3 test files with auth setup, role-based storageState
4. **playwright.config.ts:** Single e2e project (tests manage own auth), PostgreSQL dependency
5. **T3 Env:** Centralized env validation with SKIP_ENV_VALIDATION support
6. **pnpm:** Package manager with lock file
7. **Package scripts:** lint, build, test:e2e, db:seed already defined

### Known Constraints

From project context and recent work (Phase 15):

1. **Database passwords:** Must be alphanumeric only (no special chars like /, @, #, %)
2. **Test users:** Need Better Auth accounts with password "TestPassword123!" before E2E tests run
3. **Prisma schema:** Uses PascalCase table names (User, Account, Session, FailedLoginAttempt)
4. **Port 3000:** Next.js dev server for E2E tests (playwright.config.ts webServer)
5. **Docker required:** Local development uses docker-compose for PostgreSQL on port 5433
6. **AWS region:** ap-south-1 (Mumbai) for RBI data localization compliance
7. **Seed script:** Creates demo data + test users (admin@example.com, auditor@example.com, etc.)

### CI Environment Differences

| Local Dev                    | CI Environment                  | Impact on Workflow                                   |
| ---------------------------- | ------------------------------- | ---------------------------------------------------- |
| docker-compose on port 5433  | Service container on port 5432  | DATABASE_URL differs between local and CI            |
| .env file with real AWS keys | GitHub Secrets with test values | E2E tests must work with mock AWS credentials        |
| Persistent PostgreSQL        | Ephemeral per-run database      | Fresh schema on every test run (no migrations)       |
| Pre-seeded test users        | Seed runs in CI                 | Must ensure seed creates Better Auth password hashes |

### Playwright Configuration

Current playwright.config.ts (Phase 15):

```typescript
// Single e2e project runs all tests once
// Tests manage their own auth via test.use({ storageState })
// Previously had 4 role-specific projects, but every test file set its own storageState
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 60_000,

  projects: [
    { name: "setup", testMatch: /.*\.setup\.ts/ },
    {
      name: "e2e",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /tests\/e2e\/.*\.spec\.ts/,
      dependencies: ["setup"],
    },
  ],

  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

Key implications for CI:

- `forbidOnly: !!process.env.CI` prevents .only() tests in CI
- `retries: process.env.CI ? 2 : 0` retries flaky tests twice
- `workers: process.env.CI ? 1 : undefined` runs tests serially in CI (parallel locally)
- `reuseExistingServer: !process.env.CI` ensures fresh server in CI
- Setup project must run first to create storageState files

### Coolify Deployment

Deployment target: Coolify (self-hosted PaaS) on production infrastructure. Coolify provides:

1. **Deploy webhook URL:** GET endpoint with UUID for application
2. **Authentication:** Bearer token in Authorization header
3. **Trigger:** Accepts both GET and POST requests (use GET per docs)
4. **Auto-deploy:** Must be enabled in Coolify application settings
5. **Webhook secret:** Random string for GitHub webhook signature validation

Coolify deployment workflow:

1. GitHub Actions pushes to main → CI runs
2. All checks pass → deploy job runs
3. curl GET to Coolify webhook URL with Bearer token
4. Coolify pulls latest main, builds Docker image, deploys

Alternative: GitHub webhook can trigger Coolify directly (bypasses CI). Don't use this - we want CI validation before deploy.

## Security Considerations

### GitHub Secrets Required

| Secret              | Purpose                    | Where to Get                        |
| ------------------- | -------------------------- | ----------------------------------- |
| COOLIFY_WEBHOOK_URL | Deploy trigger endpoint    | Coolify application → Webhooks menu |
| COOLIFY_API_TOKEN   | Authentication for webhook | Coolify user settings → API tokens  |

**DO NOT STORE IN SECRETS (use dummy values in workflow env):**

- DATABASE_URL (service container creates ephemeral database)
- AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (tests use mocks)
- BETTER_AUTH_SECRET (tests use test-only value)

### Branch Protection Best Practices

From GitHub documentation and security audit:

1. **Require status checks:** Enable "Require status checks to pass before merging"
2. **Strict status checks:** Enable "Require branches to be up to date before merging" (prevents merge of stale PRs)
3. **Required checks:** Select lint, typecheck, build, e2e (check names must match workflow job IDs)
4. **Enforce admins:** Enable "Include administrators" to require checks even for repo admins
5. **No force push:** Enable "Do not allow force pushes" to preserve audit trail

**Implementation:** Use gh CLI with REST API PUT request (see Code Examples section). GitHub UI is manual, not reproducible.

### Secrets Management

From GitHub Actions security best practices:

1. **Principle of least privilege:** Each secret accessible only to workflows that need it
2. **Environment secrets > Repository secrets:** Use environments for production-only secrets
3. **Never log secrets:** Don't echo DATABASE_URLs with passwords. GitHub Actions masks registered secrets but not constructed strings.
4. **Rotate API tokens:** Coolify API token should be rotated quarterly, regenerated in Coolify UI
5. **Audit trail:** GitHub logs secret access in Actions tab (who ran workflow, when, which secrets used)

## Open Questions

1. **Coolify deployment logs visibility**
   - What we know: Coolify webhook returns 200 OK on success, GitHub Actions logs the curl response
   - What's unclear: How to access detailed Coolify deployment logs from GitHub Actions (for debugging failed deployments)
   - Recommendation: Document Coolify dashboard access for deployment status. Consider Coolify API for deployment status polling (out of scope for Phase 16).

2. **E2E test parallelization in CI**
   - What we know: playwright.config.ts sets `workers: process.env.CI ? 1 : undefined` (serial in CI)
   - What's unclear: Whether parallel E2E tests work with single PostgreSQL service container (potential race conditions on shared database)
   - Recommendation: Start with serial (current config). Investigate parallel in future optimization phase if CI runtime becomes bottleneck.

3. **Next.js Turbopack cache in CI**
   - What we know: Next.js 16 supports experimental Turbopack filesystem cache, but it's opt-in and may not be stable
   - What's unclear: Whether Turbopack cache persists across GitHub Actions runs (new runner each time)
   - Recommendation: Use standard .next/cache approach per Next.js docs. Turbopack filesystem cache is experimental and may cause cache corruption.

4. **Branch protection rule creation timing**
   - What we know: GitHub only shows status checks in branch protection UI after they've run on the target branch
   - What's unclear: Can gh CLI create branch protection rule requiring checks before first workflow run?
   - Recommendation: Run CI workflow manually once on main, then create branch protection rule. Check names must match job IDs.

## Sources

### Primary (HIGH confidence)

- [Playwright CI Setup](https://playwright.dev/docs/ci-intro) - Official Playwright documentation for CI configuration
- [pnpm Continuous Integration](https://pnpm.io/continuous-integration) - Official pnpm CI best practices
- [Next.js CI Build Caching](https://nextjs.org/docs/app/guides/ci-build-caching) - Official Next.js caching guide
- [Coolify GitHub Auto Deploy](https://coolify.io/docs/applications/ci-cd/github/auto-deploy) - Official Coolify webhook setup
- [GitHub Actions Service Containers](https://docs.github.com/en/actions/using-containerized-services/creating-postgresql-service-containers) - PostgreSQL service container documentation
- [GitHub Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule) - Official branch protection documentation
- [GitHub Actions Concurrency Control](https://docs.github.com/actions/writing-workflows/choosing-what-your-workflow-does/control-the-concurrency-of-workflows-and-jobs) - Official concurrency documentation

### Secondary (MEDIUM confidence)

- [Automating Playwright Tests with GitHub Actions](https://medium.com/@andrewmart.in/automating-playwright-tests-with-github-actions-5f9ba3dc06a7) - Medium article with practical Playwright + GitHub Actions examples
- [E2E Testing in Next.js with Playwright, Vercel, and GitHub Actions](https://enreina.com/blog/e2e-testing-in-next-js-with-playwright-vercel-and-github-actions-a-guide-with-example/) - Comprehensive guide with real-world examples
- [Best Practices for Managing Secrets in GitHub Actions](https://www.blacksmith.sh/blog/best-practices-for-managing-secrets-in-github-actions) - Security best practices verified with official docs
- [How to Manage Secrets in GitHub Actions (2026)](https://oneuptime.com/blog/post/2026-01-25-github-actions-manage-secrets/view) - Recent 2026 article on secrets management
- [How to Control Concurrency in GitHub Actions (2026)](https://oneuptime.com/blog/post/2026-01-25-github-actions-concurrency-control/view) - Recent 2026 article on concurrency patterns
- [Coolify Application Deploy - GitHub Action](https://github.com/marketplace/actions/coolify-application-deploy) - Alternative GitHub Action for Coolify (not using, but validates webhook approach)

### Tertiary (LOW confidence - needs validation)

- [PNPM GitHub Actions Cache](https://theodorusclarence.com/shorts/github/pnpm-github-actions-cache) - Third-party blog on pnpm caching (verified with official docs)
- Community discussions on GitHub:
  - [Webhook from GitHub action provide version to deploy](https://github.com/coollabsio/coolify/discussions/2924) - Coolify webhook discussion
  - [gh CLI branch protection rules](https://github.com/cli/cli/issues/3528) - Feature request for native gh support (not implemented, use gh api)

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All tools are official, well-documented, and widely adopted for Next.js + Playwright CI/CD
- Architecture patterns: HIGH - Patterns verified with official documentation and real-world examples from 2025-2026
- Pitfalls: HIGH - Pitfalls derived from official documentation warnings, recent GitHub issues, and project-specific learnings from Phase 15
- Coolify integration: MEDIUM - Official docs exist but less detailed than GitHub Actions docs. Webhook approach is straightforward.
- Branch protection via gh CLI: MEDIUM - No native gh command, must use gh api with REST API. Verified with community examples.

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (30 days - stable domain, GitHub Actions and Next.js mature)

**Notes:**

- All patterns tested against AEGIS project structure (playwright.config.ts, package.json, Dockerfile)
- Service container approach verified compatible with existing Prisma schema and seed scripts
- pnpm caching approach matches project's use of pnpm@10 and lock file
- Concurrency pattern prevents deployment race conditions on main branch
- Branch protection configuration ready for implementation via gh CLI REST API
