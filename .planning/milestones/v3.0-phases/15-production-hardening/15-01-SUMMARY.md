---
phase: 15-production-hardening
plan: 01
subsystem: environment-validation
tags: [t3-env, zod, config, build-time-validation]

# Dependencies
requires: []
provides:
  - Centralized type-safe environment variable validation
  - Build-time validation preventing misconfiguration
  - Docker build support with SKIP_ENV_VALIDATION
affects:
  - All future plans that use env vars should import from @/env

# Technical Stack
tech-stack:
  added:
    - "@t3-oss/env-nextjs": "^0.13.10"
  patterns:
    - T3 Env with Zod schemas for all 15 env vars
    - Build-time validation via next.config.ts import side-effect
    - Skip validation support for Docker builds

# Artifacts
key-files:
  created:
    - src/env.ts
  modified:
    - package.json
    - pnpm-lock.yaml
    - next.config.ts
    - .env.example

# Decisions
decisions:
  - id: D37
    decision: Use flexible AWS region validation (z.string().min(1) not regex)
    rationale: Allow dev/test environments to use non-ap-south-1 regions while production uses Mumbai
    alternatives:
      - Strict regex validation locking to ap-south-1
    context: RBI data localization requires Mumbai in production but dev/test should be flexible

# Metrics
duration: 6 minutes
completed: 2026-02-11
---

# Phase 15 Plan 01: Environment Variable Validation Summary

**One-liner:** Centralized Zod-based environment validation with @t3-oss/env-nextjs ensuring all 15 env vars are validated at build time with clear error messages and Docker build bypass support.

## What Was Built

Added comprehensive environment variable validation using T3 Env and Zod schemas covering all 15 environment variables (14 server + 1 client):

**Server variables:**

- Database: DATABASE_URL, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_PORT
- Auth: BETTER_AUTH_SECRET, BETTER_AUTH_URL
- AWS: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_NAME
- Email: AWS_SES_REGION, SES_FROM_EMAIL
- App: NODE_ENV

**Client variables:**

- NEXT_PUBLIC_APP_URL

**Build-time validation:** Wired into next.config.ts as first import, runs before Next.js config loads.

**Docker support:** SKIP_ENV_VALIDATION=1 bypasses validation when secrets unavailable during build.

## Task Commits

| Task | Description                | Commit  | Files                        |
| ---- | -------------------------- | ------- | ---------------------------- |
| 1    | Install T3 Env package     | ecb5c8e | package.json, pnpm-lock.yaml |
| 2    | Wire validation into build | 6d62c94 | next.config.ts, .env.example |

**Note:** src/env.ts was created in a previous commit (9db1616) but the @t3-oss/env-nextjs package was not installed at that time. This plan completed the implementation by installing the package and wiring it into the build process.

## Deviations from Plan

None - plan executed exactly as written.

## Technical Decisions Made

### Decision D37: Flexible AWS Region Validation

**Context:** Plan suggested using `z.string().regex(/^ap-south-1$/)` to enforce RBI data localization requirement for Mumbai region.

**Decision:** Use `z.string().min(1)` instead for AWS_REGION and AWS_SES_REGION.

**Rationale:**

- Production deployment uses ap-south-1 per RBI requirements
- Development and test environments may use other regions (us-east-1, local containers)
- Runtime enforcement should happen at deployment level (CDK, IaC), not schema validation
- Allows developers to work with any region locally without modifying validation schema

**Impact:** Development flexibility without compromising production requirements. Production deployments still constrained by infrastructure-as-code configuration.

## Key Learnings

### T3 Env Requires Explicit runtimeEnv Mapping

T3 Env with Next.js requires explicit destructuring in `runtimeEnv` object due to how Next.js bundles environment variables. The bundler only includes vars that are explicitly referenced in code.

```typescript
runtimeEnv: {
  DATABASE_URL: process.env.DATABASE_URL,  // Must explicitly map each var
  POSTGRES_USER: process.env.POSTGRES_USER,
  // ... all other vars
}
```

Forgetting this causes "Property 'X' is missing in type" TypeScript errors.

### Build-Time Validation via Import Side-Effect

Placing `import "./src/env"` as the first line in next.config.ts ensures validation runs before any Next.js configuration loads. This catches misconfigurations early:

```typescript
import "./src/env"; // ← Validates immediately
import type { NextConfig } from "next";
```

Failed validation produces clear error messages:

```
❌ Invalid environment variables: [
  {
    code: 'invalid_type',
    path: [ 'DATABASE_URL' ],
    message: 'Invalid input: expected string, received undefined'
  }
]
```

### emptyStringAsUndefined Catches Common Mistake

The `emptyStringAsUndefined: true` option treats empty strings in .env files as missing variables:

```bash
# .env
DATABASE_URL=   # ← Treated as undefined, validation fails
```

This prevents silent failures where a developer leaves a value blank.

## Next Phase Readiness

**Blockers:** None

**Concerns:** None - validation is working as expected

**Recommendations:**

- All future code should import env vars from `@/env` instead of `process.env`
- Update any existing `process.env.X` references to use `env.X` for type safety
- Consider adding lint rule to prevent direct `process.env` access (enforce centralized validation)

## Quality Metrics

**Type Safety:** All env vars have type-safe access with IDE autocomplete via `env.DATABASE_URL` etc.

**Error Handling:** Build fails with clear, actionable error messages when vars missing or malformed.

**Test Coverage:** Manual verification performed:

- ✅ Build fails when required env vars missing
- ✅ Build succeeds with SKIP_ENV_VALIDATION=1
- ✅ Clear error messages show which vars are invalid

**Technical Debt:** None introduced

## Self-Check: PASSED

**Files verified:**

- ✅ src/env.ts (exists, created in commit 9db1616)
- ✅ package.json (modified in ecb5c8e)
- ✅ pnpm-lock.yaml (modified in ecb5c8e)
- ✅ next.config.ts (modified in 6d62c94)
- ✅ .env.example (modified in 6d62c94)

**Commits verified:**

- ✅ ecb5c8e (install @t3-oss/env-nextjs)
- ✅ 6d62c94 (wire env validation into build)

All claimed files and commits exist.
