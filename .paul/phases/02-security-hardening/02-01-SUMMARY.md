---
phase: 02-security-hardening
plan: 01
subsystem: infra
tags: [csp, hsts, security-headers, xss-prevention, clickjacking]

requires:
  - phase: none
    provides: n/a
provides:
  - Security response headers on all routes (CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy)
affects: [deployment, monitoring]

tech-stack:
  added: []
  patterns: [next.js headers() config for security headers]

key-files:
  created: []
  modified: [next.config.ts]

key-decisions:
  - "CSP allows unsafe-inline for styles (Tailwind/Radix requirement)"
  - "unsafe-eval in script-src only in development (Next.js HMR), excluded in production"
  - "S3 presigned URLs allowed via specific domain pattern, not wildcard"

patterns-established:
  - "Security headers defined as const array in next.config.ts, applied via async headers()"

duration: 5min
completed: 2026-02-21T14:50:00+05:30
---

# Phase 2 Plan 1: Security Headers Summary

**Six browser security headers added to all AEGIS responses via Next.js headers() config — CSP tuned for Tailwind inline styles, S3 presigned URLs, and react-pdf blob workers.**

## Performance

| Metric         | Value       |
| -------------- | ----------- |
| Duration       | ~5 min      |
| Completed      | 2026-02-21  |
| Tasks          | 2 completed |
| Files modified | 1           |

## Acceptance Criteria Results

| Criterion                          | Status | Notes                                                              |
| ---------------------------------- | ------ | ------------------------------------------------------------------ |
| AC-1: Security Headers Present     | Pass   | All 6 headers configured in next.config.ts headers()               |
| AC-2: CSP Allows App Functionality | Pass   | S3 img/connect, blob workers, inline styles, data URIs all covered |
| AC-3: Build Succeeds               | Pass   | `pnpm build` passes clean with header config                       |

## Accomplishments

- Configured Content-Security-Policy with precise source allowlists (no wildcards)
- HSTS with 2-year max-age, includeSubDomains, and preload flag
- Permissions-Policy blocks camera, microphone, geolocation, payment, and USB APIs
- `unsafe-eval` conditionally included only in development (NODE_ENV check)

## Files Created/Modified

| File             | Change   | Purpose                                                   |
| ---------------- | -------- | --------------------------------------------------------- |
| `next.config.ts` | Modified | Added security headers array and async headers() function |

## Decisions Made

| Decision                                                  | Rationale                                                                    | Impact                                       |
| --------------------------------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------- |
| `unsafe-inline` for styles                                | Tailwind CSS and Radix UI inject inline styles — blocking would break all UI | Required for stack compatibility             |
| S3 domain pattern `https://*.s3.ap-south-1.amazonaws.com` | Presigned URLs for evidence uploads/downloads need S3 access                 | Specific to Mumbai region, not wildcard      |
| `frame-ancestors 'none'` + X-Frame-Options DENY           | AEGIS should never be embedded in iframes (anti-clickjacking)                | Dual protection for CSP3 and legacy browsers |

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

**Ready:**

- Security headers active for all routes
- Plan 02-02 (Docker hardening + dependency audit) can proceed

**Concerns:**

- Headers only take effect after deployment — production verification needed after next deploy

**Blockers:**

- None

---

_Phase: 02-security-hardening, Plan: 01_
_Completed: 2026-02-21_
