---
phase: 04-monitoring-observability
plan: 01
subsystem: infra
tags: [sentry, error-tracking, observability, middleware, request-id]

requires:
  - phase: 02-security-hardening
    provides: CSP headers configuration (extended for Sentry)
provides:
  - Sentry error tracking SDK for client, server, and edge runtimes
  - Request ID propagation via x-request-id header
  - Error boundary integration with Sentry.captureException
affects: [04-02-health-monitoring, deployment, docker]

tech-stack:
  added: ["@sentry/nextjs@10.39.0"]
  patterns: [optional-service-degradation, request-id-propagation]

key-files:
  created:
    - sentry.client.config.ts
    - sentry.server.config.ts
    - sentry.edge.config.ts
  modified:
    - package.json
    - src/env.ts
    - next.config.ts
    - src/instrumentation.ts
    - src/middleware.ts
    - src/app/global-error.tsx
    - src/app/error.tsx

key-decisions:
  - "Sentry DSN optional (same pattern as S3/SES — graceful degradation)"
  - "Low sample rate (0.1) to stay within Sentry free tier (5K errors/month)"
  - "Source map upload disabled by default — enable in CI with SENTRY_AUTH_TOKEN"

patterns-established:
  - "Optional external services: guard init with if (dsn) check"
  - "Request ID: preserve upstream x-request-id or generate via crypto.randomUUID()"

duration: ~15min
started: 2026-02-21T17:00:00+05:30
completed: 2026-02-21T17:15:00+05:30
---

# Phase 4 Plan 01: Error Tracking & Request Instrumentation Summary

**Sentry error tracking SDK integrated for Next.js 16 with request ID propagation and graceful degradation when unconfigured.**

## Performance

| Metric         | Value                |
| -------------- | -------------------- |
| Duration       | ~15 min              |
| Started        | 2026-02-21 17:00 IST |
| Completed      | 2026-02-21 17:15 IST |
| Tasks          | 3 completed          |
| Files modified | 10                   |

## Acceptance Criteria Results

| Criterion                                 | Status | Notes                                                                        |
| ----------------------------------------- | ------ | ---------------------------------------------------------------------------- |
| AC-1: Sentry Captures Client-Side Errors  | Pass   | sentry.client.config.ts initializes SDK; error.tsx calls captureException    |
| AC-2: Sentry Captures Server-Side Errors  | Pass   | sentry.server.config.ts + instrumentation.ts registration; SDK auto-captures |
| AC-3: Graceful Degradation Without Sentry | Pass   | Build succeeds without SENTRY_DSN; guard checks prevent init when DSN absent |
| AC-4: Request ID Propagation              | Pass   | Middleware generates/preserves x-request-id on all routes                    |

## Accomplishments

- Integrated @sentry/nextjs 10.39.0 with three-runtime configuration (client, server, edge)
- Added request ID propagation in edge middleware using crypto.randomUUID() with upstream header preservation
- Wired both error boundaries (global-error.tsx, error.tsx) to Sentry.captureException while preserving console.error fallback
- Updated CSP connect-src to allow Sentry event ingestion (\*.ingest.sentry.io)
- Extended env.ts with optional SENTRY_DSN, SENTRY_AUTH_TOKEN, and NEXT_PUBLIC_SENTRY_DSN

## Files Created/Modified

| File                       | Change   | Purpose                                                     |
| -------------------------- | -------- | ----------------------------------------------------------- |
| `sentry.client.config.ts`  | Created  | Browser-side Sentry init with replay + error sampling       |
| `sentry.server.config.ts`  | Created  | Node.js server runtime Sentry init                          |
| `sentry.edge.config.ts`    | Created  | Edge runtime Sentry init (middleware)                       |
| `package.json`             | Modified | Added @sentry/nextjs@10.39.0 (+158 packages)                |
| `src/env.ts`               | Modified | Added SENTRY_DSN, SENTRY_AUTH_TOKEN, NEXT_PUBLIC_SENTRY_DSN |
| `next.config.ts`           | Modified | Wrapped with withSentryConfig; CSP connect-src updated      |
| `src/instrumentation.ts`   | Modified | Sentry server/edge registration before pg-boss              |
| `src/middleware.ts`        | Modified | Request ID generation and propagation on all routes         |
| `src/app/global-error.tsx` | Modified | Added Sentry.captureException in useEffect                  |
| `src/app/error.tsx`        | Modified | Added Sentry.captureException in useEffect                  |

## Decisions Made

| Decision                        | Rationale                                                                | Impact                                   |
| ------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------- |
| Sentry DSN optional             | Follows established S3/SES pattern — app works without external services | No deployment changes required           |
| Low sample rate (0.1)           | Free tier has 5K errors/month, 10K transactions/month                    | Sufficient for pilot phase               |
| Source maps disabled by default | Requires SENTRY_AUTH_TOKEN + org/project config                          | Enable in CI when Sentry project created |
| Client-side error filtering     | Ignores ResizeObserver, network errors                                   | Reduces noise from browser environment   |

## Deviations from Plan

### Summary

| Type            | Count | Impact |
| --------------- | ----- | ------ |
| Auto-fixed      | 0     | —      |
| Scope additions | 0     | —      |
| Deferred        | 0     | —      |

**Total impact:** Plan executed exactly as written.

### Skill Audit

| Expected           | Invoked | Notes                                                       |
| ------------------ | ------- | ----------------------------------------------------------- |
| /monitoring-expert | ○       | Knowledge applied inline, not loaded as separate command    |
| /devops-engineer   | ○       | No CI/CD changes needed in this plan (source maps deferred) |

Skill gaps documented — non-blocking per SPECIAL-FLOWS protocol.

## Issues Encountered

| Issue                         | Resolution                                                          |
| ----------------------------- | ------------------------------------------------------------------- |
| ESLint react plugin not found | Pre-existing issue — confirmed by running lint on clean main branch |

## Next Phase Readiness

**Ready:**

- Sentry SDK fully wired — just needs DSN from Sentry project to activate
- Request IDs flowing through all requests — available for health endpoint and logging
- Error boundaries report to Sentry when configured

**Concerns:**

- ESLint config needs react plugin fix (pre-existing, not blocking)
- Sentry project creation needed before error tracking is active

**Blockers:**

- None

---

_Phase: 04-monitoring-observability, Plan: 01_
_Completed: 2026-02-21_
