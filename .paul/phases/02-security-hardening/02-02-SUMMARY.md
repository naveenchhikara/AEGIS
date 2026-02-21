---
phase: 02-security-hardening
plan: 02
subsystem: infra
tags: [docker, cap_drop, dependabot, pnpm-audit, ci, security]

requires:
  - phase: none
    provides: n/a
provides:
  - Docker container hardening (no-new-privileges, cap_drop ALL, read_only, resource limits)
  - CI dependency vulnerability scanning (pnpm audit)
  - Automated dependency update PRs (Dependabot)
affects: [deployment, ci-cd, monitoring]

tech-stack:
  added: []
  patterns:
    [
      docker security_opt for container hardening,
      continue-on-error for advisory CI jobs,
    ]

key-files:
  created: [.github/dependabot.yml]
  modified: [docker-compose.prod.yml, .github/workflows/ci.yml]

key-decisions:
  - "cap_drop ALL on app only, not postgres (postgres needs capabilities for process management)"
  - "read_only on app with /tmp tmpfs (Next.js standalone needs no persistent writes)"
  - "Security audit as advisory (continue-on-error: true) — not blocking deploys"
  - "Prisma major versions ignored by Dependabot (require manual migration)"

patterns-established:
  - "Docker compose hardening pattern: security_opt + cap_drop + read_only + tmpfs + resource limits"
  - "Advisory CI jobs use continue-on-error: true"

duration: 5min
completed: 2026-02-21T15:00:00+05:30
---

# Phase 2 Plan 2: Docker Hardening + Dependency Audit Summary

**Docker containers hardened with capability drops, read-only filesystem, and resource limits; CI pipeline extended with pnpm audit; Dependabot configured for weekly npm and GitHub Actions updates.**

## Performance

| Metric         | Value       |
| -------------- | ----------- |
| Duration       | ~5 min      |
| Completed      | 2026-02-21  |
| Tasks          | 3 completed |
| Files modified | 3           |

## Acceptance Criteria Results

| Criterion                         | Status | Notes                                                         |
| --------------------------------- | ------ | ------------------------------------------------------------- |
| AC-1: App Container Restricted    | Pass   | security_opt, cap_drop ALL, read_only, tmpfs, resource limits |
| AC-2: PostgreSQL Container Limits | Pass   | security_opt, shm_size 256mb, memory limits                   |
| AC-3: CI Dependency Audit         | Pass   | security-audit job with pnpm audit --prod, continue-on-error  |
| AC-4: Dependabot Configured       | Pass   | npm (weekly) + github-actions (weekly), Prisma majors ignored |

## Accomplishments

- App container runs with all capabilities dropped, read-only filesystem, and 1GB memory limit
- PostgreSQL container has no-new-privileges, dedicated shared memory, and resource limits
- CI pipeline now surfaces dependency vulnerabilities on every push/PR without blocking deploys
- Dependabot will auto-create PRs for outdated dependencies (npm + GitHub Actions)

## Files Created/Modified

| File                       | Change   | Purpose                                      |
| -------------------------- | -------- | -------------------------------------------- |
| `docker-compose.prod.yml`  | Modified | Security hardening for both services         |
| `.github/workflows/ci.yml` | Modified | Added security-audit job                     |
| `.github/dependabot.yml`   | Created  | Automated dependency update PR configuration |

## Decisions Made

| Decision                                   | Rationale                                                 | Impact                                   |
| ------------------------------------------ | --------------------------------------------------------- | ---------------------------------------- |
| cap_drop ALL on app only                   | PostgreSQL needs capabilities for process management      | App maximally restricted, pg partially   |
| read_only with /tmp tmpfs                  | Next.js standalone needs no persistent writes beyond /tmp | Prevents filesystem tampering at runtime |
| Security audit advisory, not blocking      | Don't want false positives blocking production deploys    | Visibility without deployment friction   |
| Ignore Prisma major versions in Dependabot | Prisma majors require schema migration, can't auto-update | Prevents breaking auto-PRs               |

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

**Ready:**

- Phase 2 complete — all security hardening delivered
- Phase 3 (Test Suite & CI) can begin

**Concerns:**

- Docker hardening needs testing on actual VPS deployment (read_only + tmpfs)
- Dependabot will start creating PRs once pushed to GitHub

**Blockers:**

- None

---

_Phase: 02-security-hardening, Plan: 02_
_Completed: 2026-02-21_
