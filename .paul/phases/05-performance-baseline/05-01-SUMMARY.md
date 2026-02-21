---
phase: 05-performance-baseline
plan: 01
subsystem: infra
tags: [bundle-analysis, performance, baseline, optimization]

requires:
  - phase: 03-test-suite-ci
    provides: Working test suite for regression
provides:
  - Bundle analyzer tooling (pnpm build:analyze)
  - Performance baseline documentation with optimization recommendations
affects: [next.config.ts, package.json]

tech-stack:
  added: ["@next/bundle-analyzer (dev)"]
  patterns: [conditional-build-plugin]

key-files:
  created:
    - .paul/phases/05-performance-baseline/BASELINE.md
  modified:
    - package.json
    - next.config.ts

key-decisions:
  - "Bundle analyzer dev-only, gated by ANALYZE=true env var"
  - "Webpack required for analyzer (Turbopack not supported) — separate build mode"
  - "No code optimizations in this plan — document-only baseline"
  - "PM2 clustering not applicable — Docker standalone deployment"
  - "API caching not needed for pilot scale (< 50 users)"

patterns-established:
  - "Conditional build plugins: wrap config only when env flag set"
  - "Dual build modes: Turbopack (default) vs Webpack (analyzer)"

duration: ~15min
started: 2026-02-21T20:30:00+05:30
completed: 2026-02-21T20:45:00+05:30
---

# Phase 5 Plan 01: Bundle Analysis & Performance Baseline Summary

**Bundle analyzer installed and performance baseline documented with comprehensive dependency analysis and optimization recommendations.**

## Performance

| Metric         | Value                     |
| -------------- | ------------------------- |
| Duration       | ~15 min                   |
| Started        | 2026-02-21 20:30 IST      |
| Completed      | 2026-02-21 20:45 IST      |
| Tasks          | 3 (2 auto + 1 checkpoint) |
| Files modified | 2 + 1 created             |

## Acceptance Criteria Results

| Criterion                           | Status | Notes                                                        |
| ----------------------------------- | ------ | ------------------------------------------------------------ |
| AC-1: Analyzer Installed/Configured | Pass   | ANALYZE=true triggers HTML treemap; normal builds unaffected |
| AC-2: Analyze Script Available      | Pass   | pnpm build:analyze runs with --webpack flag                  |
| AC-3: Baseline Documented           | Pass   | BASELINE.md with full metrics, top packages, recommendations |

## Accomplishments

- Installed @next/bundle-analyzer as dev dependency
- Configured conditional wrapping in next.config.ts (ANALYZE=true only)
- Added `pnpm build:analyze` script using Webpack mode (required for analyzer)
- Generated client (1.3 MB HTML), server (3.3 MB HTML), and edge (356 KB HTML) reports
- Documented comprehensive baseline:
  - Client bundle: 10.6 MB stat size across 15 major packages
  - Server bundle: 40.7 MB stat size dominated by Sentry/OpenTelemetry (10+ MB)
  - Build time: 5.7s Turbopack, 31.9s Webpack
  - 64 routes, all dynamic (server-rendered)
- Identified 3 high-impact optimization opportunities (recharts lazy loading, lucide tree-shaking, Sentry lazy loading)
- Confirmed no critical performance issues blocking pilot deployment

## Key Findings

| Finding                         | Size Impact | Priority |
| ------------------------------- | ----------- | -------- |
| recharts + deps on every page   | ~980 KB     | High     |
| lucide-react icon bundle        | 221 KB      | High     |
| Sentry client SDK               | 639 KB      | Medium   |
| zod v4 on client                | 524 KB      | Medium   |
| RBI master directions in bundle | 54 KB       | Low      |

## Files Created/Modified

| File                                               | Change   | Purpose                                      |
| -------------------------------------------------- | -------- | -------------------------------------------- |
| `next.config.ts`                                   | Modified | Added conditional bundle analyzer wrapper    |
| `package.json`                                     | Modified | Added @next/bundle-analyzer dev dep + script |
| `.paul/phases/05-performance-baseline/BASELINE.md` | Created  | Comprehensive performance baseline document  |

## Decisions Made

| Decision                  | Rationale                                                   | Impact                       |
| ------------------------- | ----------------------------------------------------------- | ---------------------------- |
| Analyzer dev-only         | Production builds don't need analysis overhead              | No Docker/CI impact          |
| Webpack mode for analyzer | @next/bundle-analyzer requires Webpack, not Turbopack       | Separate build mode          |
| No code optimizations     | Baseline first, optimize based on data                      | Clean separation of concerns |
| PM2 clustering dropped    | Docker standalone deployment, not PM2                       | Simplified scope             |
| No API caching            | Multi-tenant isolation + < 50 users makes caching premature | Reduced complexity           |

## Deviations from Plan

### Summary

| Type            | Count | Impact |
| --------------- | ----- | ------ |
| Auto-fixed      | 1     | None   |
| Scope additions | 0     | —      |
| Deferred        | 0     | —      |

### Details

| Deviation                      | Type       | Impact | Notes                                                       |
| ------------------------------ | ---------- | ------ | ----------------------------------------------------------- |
| Added --webpack flag to script | Auto-fixed | None   | Turbopack doesn't support bundle analyzer; Webpack required |

### Skill Audit

| Expected          | Invoked | Notes                                                    |
| ----------------- | ------- | -------------------------------------------------------- |
| /nextjs-developer | ○       | Knowledge applied inline, not loaded as separate command |

## Issues Encountered

| Issue                                    | Resolution                                                         |
| ---------------------------------------- | ------------------------------------------------------------------ |
| Analyzer requires Webpack mode           | Added --webpack flag to build:analyze script                       |
| Webpack build type error (controls page) | Pre-existing async params issue in Webpack mode only; Turbopack OK |

## Next Phase Readiness

**Ready:**

- Phase 5 Plan 01 complete — baseline established
- Bundle analyzer available for future optimization work
- Optimization recommendations documented for prioritization

**Assessment:**

- Bundle is healthy for 600-file enterprise app
- No critical performance issues blocking pilot deployment
- Recharts lazy loading is the single highest-impact optimization (~1 MB savings)
- Plan 05-02 (load testing) can be deferred — not blocking for pilot with < 50 users

**Blockers:**

- None

---

_Phase: 05-performance-baseline, Plan: 01_
_Completed: 2026-02-21_
